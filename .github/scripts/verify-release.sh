#!/usr/bin/env bash
# Post-deploy release verification.
#
# Asserts the live site actually serves the version that was just released:
#   1. The app responds (with retries while the container finishes starting).
#   2. Rendered HTML references assets at ?v=<released version>.
#   3. The versioned stylesheet at that URL is served and non-trivial.
#   4. The service worker is stamped with the released version.
#
# A green deploy job then means "the release is verifiably live", not just
# "the scripts ran". Usable locally too:
#   APP_URL=https://iwantmymtg.net ./.github/scripts/verify-release.sh <version>
#
# The version must be passed explicitly — package.json holds a 0.0.0-dev
# placeholder; the real version is computed in CI (see next-version.sh).
set -euo pipefail

APP_URL="${APP_URL:?APP_URL is required}"
EXPECTED_VERSION="${1:?version argument is required (e.g. 1.33.0)}"

fail() {
    echo "[VERIFY] FAIL: $1" >&2
    exit 1
}

pass() {
    echo "[VERIFY] OK: $1"
}

echo "[VERIFY] Verifying $APP_URL serves version $EXPECTED_VERSION..."

# 1. Wait for the app to respond after the container swap.
for i in $(seq 1 12); do
    if curl -fsS -o /dev/null --max-time 10 "$APP_URL/"; then
        break
    fi
    [ "$i" -eq 12 ] && fail "app did not respond at $APP_URL within 60s"
    sleep 5
done
pass "app is responding"

# 2. Rendered HTML must reference assets at the released version.
html=$(curl -fsS --max-time 10 "$APP_URL/")
echo "$html" | grep -q "?v=$EXPECTED_VERSION" \
    || fail "HTML does not reference assets at ?v=$EXPECTED_VERSION (found: $(echo "$html" | grep -oE '\?v=[0-9a-zA-Z.\-]+' | sort -u | tr '\n' ' '))"
pass "HTML references ?v=$EXPECTED_VERSION"

# 3. The versioned stylesheet must be served and non-trivial.
css_bytes=$(curl -fsS --max-time 10 "$APP_URL/public/css/tailwind.css?v=$EXPECTED_VERSION" | wc -c)
[ "$css_bytes" -gt 1024 ] || fail "tailwind.css?v=$EXPECTED_VERSION is missing or suspiciously small ($css_bytes bytes)"
pass "tailwind.css?v=$EXPECTED_VERSION served ($css_bytes bytes)"

# 4. The service worker must be stamped with the released version. A unique
# query param bypasses any CDN-cached copy so we verify origin truth.
sw=$(curl -fsS --max-time 10 "$APP_URL/sw.js?verify=$(date +%s)")
echo "$sw" | grep -q "APP_VERSION = '$EXPECTED_VERSION'" \
    || fail "sw.js is not stamped with $EXPECTED_VERSION (found: $(echo "$sw" | grep -m1 "APP_VERSION = " || echo 'no APP_VERSION line'))"
pass "sw.js stamped with $EXPECTED_VERSION"

echo "[VERIFY] Release $EXPECTED_VERSION is live and correct."
