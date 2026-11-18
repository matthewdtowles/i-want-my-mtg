#!/bin/bash
set -uo pipefail

# The nightly pipeline, run hourly and gated on whether there is anything to do.
#
# It used to be four jobs on four fixed times - ingest 08:00, price alerts
# 08:15, portfolio 08:30, retry 09:00 - each assuming the one before it had
# finished, and all of them assuming MTGJSON publishes at a predictable hour.
# It does not. A probe polling every 10 minutes from 2026-08-28 saw no new
# build for 22 hours, nine of them past the window those times were chosen for.
# Meanwhile the 08:00 run kept downloading 550MB to rediscover yesterday's data
# and mailing about it.
#
# So: ask first, and chain the rest behind the answer.
#
#   scry has-new-prices   0 = upstream has data we do not   -> run everything
#                         3 = we are already current        -> exit quietly
#                         1 = could not tell                -> report, do nothing
#
# The check is a 200-byte range read of the head of AllPricesToday.json, so
# hourly costs ~5KB a day and the pickup delay is under an hour whenever
# upstream publishes.
#
# Failing closed on 1 is deliberate: if we cannot read the date, ingesting
# anyway would pull 53MB every hour to find out we already had it.

LOG_DIR="/var/log/i-want-my-mtg"
LOCK_FILE="/var/lock/scry-ingest-chain.lock"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: checking for new price data..."

# One chain at a time. A run that outlives the hour must not have the next one
# start on top of it; skipping is correct here and not worth mailing about,
# because the following hour will pick it up.
# Open the lock file explicitly rather than letting a failure fall through.
# A missing /var/lock, a permissions change or a full disk makes this fail, and
# `flock` then reports "Bad file descriptor" - which the check below would have
# read as "previous run still going" and answered with exit 0, skipping every
# hour forever behind a reassuring log line.
if ! exec 9>"$LOCK_FILE"; then
    echo "SUMMARY: Could not start: the lock file $LOCK_FILE cannot be opened" >&2
    echo "IMPACT: Nothing is being updated until this is fixed." >&2
    exit 1
fi
if ! flock -n 9; then
    echo "ingest-chain: previous run still going; skipping this hour."
    exit 0
fi

# Captured rather than streamed so a failure can quote its error lines in the
# mail; the whole output still lands in the log.
check_output=$(/opt/scripts/scry.sh has-new-prices 2>&1)
check=$?
printf '%s\n' "$check_output" >> "$LOG_DIR/ingestion.log"
case $check in
    0) echo "ingest-chain: new data upstream, running the full pipeline." ;;
    3) echo "ingest-chain: already current, nothing to do."; exit 0 ;;
    *)
        echo "SUMMARY: Could not check MTGJSON for new data, so nothing was updated this hour" >&2
        echo "IMPACT: Nothing changed; the site still shows the last successful update." >&2
        printf '%s\n' "$check_output" | grep -E '^(Error|ERROR|SUMMARY)' >&2
        exit 1
        ;;
esac

# From here the steps are sequential and each depends on the one before it:
# price alerts compare against prices the ingest just wrote, and the portfolio
# summary values holdings at those prices. Running them on their own clocks was
# only ever an approximation of "after the ingest".
status=0

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: ingest"
# On failure scry prints its own SUMMARY and step table first, so the generic
# SUMMARY here only becomes the headline when scry died without one.
if ! /opt/scripts/scry.sh ingest >> "$LOG_DIR/ingestion.log"; then
    echo "SUMMARY: The data update did not finish" >&2
    echo "IMPACT: Price alerts were not sent and portfolio values were not refreshed; they run only after a complete update." >&2
    exit 1
fi

# Both of the following are best-effort: neither should mask a successful
# ingest, but a failure still needs to reach the mail. Neither is retried: the
# next hour's has-new-prices sees the complete ingest and stops, so each says
# so in an ACTION line rather than letting the mail promise a retry.
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: price alerts"
api_key=$(grep '^INTERNAL_API_KEY=' /home/ubuntu/.env | cut -d= -f2- | sed 's/^"//;s/"$//')
# Bounded, like every other step. The scry.sh calls inherit its `timeout`; this
# curl has no such wrapper, and it is now inside the chain's single flock. An
# unbounded request that hangs - the app accepting the connection and never
# answering - would hold that lock forever, and every following hour would take
# the `flock -n` branch and exit 0 quietly. Ingestion would stop with nothing
# mailed until the 10:00 health check noticed the catalog going stale. As its
# own cron job a hang only cost that one invocation; inside the chain it costs
# the pipeline, so the ceiling has to be explicit. 10 minutes is far beyond a
# local API call and well under scry.sh's 2400s.
if ! curl -sSf --connect-timeout 10 --max-time 600 -X POST -H "x-api-key: $api_key" \
        http://localhost/api/v1/price-alerts/process >> "$LOG_DIR/price-alerts.log"; then
    echo "SUMMARY: Price alerts were not sent (the data update itself succeeded)" >&2
    echo "IMPACT: Users with price alerts were not notified about this update's price changes." >&2
    echo "ACTION: Not retried on its own; alerts next go out after MTGJSON's next build. To send them now, run the price-alerts curl from /opt/scripts/ingest-chain.sh on the server." >&2
    status=1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: portfolio summary"
if ! /opt/scripts/scry.sh portfolio-summary >> "$LOG_DIR/portfolio.log"; then
    echo "SUMMARY: Portfolio values were not refreshed (the data update itself succeeded)" >&2
    echo "IMPACT: Portfolio values and performance still reflect the previous update." >&2
    echo "ACTION: Not retried on its own; it next runs after MTGJSON's next build. To refresh now, run /opt/scripts/scry.sh portfolio-summary on the server." >&2
    status=1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: complete"
exit "$status"
