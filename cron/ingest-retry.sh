#!/bin/bash
set -euo pipefail

# Second chance for the nightly ingest.
#
# Before this existed, one wedged run cost a full day of data: cron fired the
# ingest at 08:00 and nothing tried again until 08:00 the next morning. The
# 2026-08-22 run blocked mid-card-stream and was killed at 09:00, so the
# catalog sat on 2026-08-20 prices for two days.
#
# This runs an hour after the ingest slot and re-runs it only when the catalog
# is actually stale, so a healthy night costs one cheap health query and mails
# nothing. `scry health` exits non-zero when the newest price row is more than
# a day old, which is the same threshold the 10:00 health check pages on - so a
# retry here is exactly the case that would otherwise wake someone up.
#
# Note this tolerates a one-day-old catalog on purpose. MTGJSON occasionally
# skips a build, and re-ingesting the same file we already have is not a fix.

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Checking whether the ingest needs a retry..."

if /opt/scripts/scry.sh health > /dev/null 2>&1; then
    echo "Catalog is fresh; no retry needed."
    exit 0
fi

# stderr, so cron mails it: a retry means the 08:00 run did not do its job, and
# that is worth knowing even when the retry goes on to succeed.
echo "ERROR: catalog is stale after the 08:00 ingest; retrying now" >&2
exec /opt/scripts/scry.sh ingest
