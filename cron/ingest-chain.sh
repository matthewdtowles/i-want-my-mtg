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
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "ingest-chain: previous run still going; skipping this hour."
    exit 0
fi

/opt/scripts/scry.sh has-new-prices >> "$LOG_DIR/ingestion.log" 2>&1
case $? in
    0) echo "ingest-chain: new data upstream, running the full pipeline." ;;
    3) echo "ingest-chain: already current, nothing to do."; exit 0 ;;
    *)
        echo "ERROR: ingest-chain could not determine whether new price data exists; skipping this hour." >&2
        exit 1
        ;;
esac

# From here the steps are sequential and each depends on the one before it:
# price alerts compare against prices the ingest just wrote, and the portfolio
# summary values holdings at those prices. Running them on their own clocks was
# only ever an approximation of "after the ingest".
status=0

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: ingest"
if ! /opt/scripts/scry.sh ingest >> "$LOG_DIR/ingestion.log"; then
    echo "ERROR: ingest failed; skipping price alerts and portfolio summary." >&2
    exit 1
fi

# Both of the following are best-effort: neither should mask a successful
# ingest, but a failure still needs to reach the mail.
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: price alerts"
api_key=$(grep '^INTERNAL_API_KEY=' /home/ubuntu/.env | cut -d= -f2- | sed 's/^"//;s/"$//')
if ! curl -sSf -X POST -H "x-api-key: $api_key" \
        http://localhost/api/v1/price-alerts/process >> "$LOG_DIR/price-alerts.log"; then
    echo "ERROR: price-alert processing failed after a successful ingest." >&2
    status=1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: portfolio summary"
if ! /opt/scripts/scry.sh portfolio-summary >> "$LOG_DIR/portfolio.log"; then
    echo "ERROR: portfolio-summary failed after a successful ingest." >&2
    status=1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ingest-chain: complete"
exit "$status"
