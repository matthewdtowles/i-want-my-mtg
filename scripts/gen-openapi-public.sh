#!/usr/bin/env bash
set -euo pipefail

# Regenerate the public OpenAPI snapshot used for the RapidAPI listing.
# Boots the web container (if needed), fetches /api/openapi-public.json from
# the running app, formats it, and writes it to ./openapi-public.json.
#
# The file is gitignored — regenerate it whenever the public allowlist or
# controller-level operationIds/summaries change, then upload to RapidAPI.

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

OUT_FILE="$PROJECT_ROOT/openapi-public.json"
URL="${OPENAPI_PUBLIC_URL:-http://localhost:3000/api/openapi-public.json}"

if ! curl -fsS "$URL" -o /dev/null 2>/dev/null; then
  echo "App not reachable at $URL — starting docker compose web service..."
  docker compose up -d web >/dev/null
  echo -n "Waiting for $URL"
  for _ in $(seq 1 30); do
    if curl -fsS "$URL" -o /dev/null 2>/dev/null; then
      echo " — ready"
      break
    fi
    echo -n "."
    sleep 1
  done
fi

curl -fsS "$URL" | (jq . 2>/dev/null || cat) > "$OUT_FILE"
echo "Wrote $OUT_FILE"
