#!/bin/bash
set -euo pipefail

# A wedged run must not go unnoticed, and must not let the next one pile up on
# top of it. On 2026-07-21 an ingest deadlocked inside scry - futex_wait, an
# idle DB connection, no CPU - after zeroing set.base_size and before
# post-ingest could restore it; an ingest from 2026-05-09 was still sitting
# there too, 73 days on. Cron kept starting new ones and nothing said a word.
#
# `flock` skips a run whose predecessor is still going, and `timeout` turns a
# wedged run into a failed one. Both report on stderr, which cron mails (see
# MAILTO in cron/i-want-my-mtg) while stdout keeps going to the job's log.
COMMAND="${1:-ingest}"
# Locked per command, so ingest-decks is not blocked by a long ingest.
LOCK_FILE="/var/lock/scry-${COMMAND//[^a-zA-Z0-9]/_}.lock"
# A healthy full ingest finishes in well under 10 minutes.
TIMEOUT_SECONDS="${SCRY_TIMEOUT_SECONDS:-3600}"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Starting scry.sh with args: ${*:-ingest}"

echo "Sourcing .env..."
source /home/ubuntu/.env

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: Required variable DATABASE_URL is not set in .env" >&2
    exit 1
fi
echo "Environment variables validated."

# The lock is held by this fd for as long as the script lives, and the child
# inherits it - so it covers the whole run and releases on exit, however the
# script ends.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "ERROR: scry ${COMMAND} is already running (lock ${LOCK_FILE}); skipping this run" >&2
    exit 1
fi

echo "Running: /opt/scripts/scry ${*:-ingest}"
status=0
timeout --signal=TERM --kill-after=60s "$TIMEOUT_SECONDS" /opt/scripts/scry "${@:-ingest}" || status=$?

if [ "$status" -eq 124 ]; then
    echo "ERROR: scry ${*:-ingest} exceeded ${TIMEOUT_SECONDS}s and was killed" >&2
elif [ "$status" -ne 0 ]; then
    echo "ERROR: scry ${*:-ingest} exited with status ${status}" >&2
fi
exit "$status"
