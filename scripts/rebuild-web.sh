#!/usr/bin/env bash
set -euo pipefail

# Rebuild the web container after package.json dependencies change.
#
# Recreates the container with -V (--renew-anon-volumes) so the anonymous
# node_modules volume is repopulated from the freshly built image instead of
# shadowing it with stale deps (TS2307: Cannot find module ...).
#
# You only need this when dependencies changed. For a plain code change a
# normal `docker compose build web && docker compose up -d web` is enough.
#
# This script interpolates ${VAR} from docker-compose.yml, so run it with your
# secrets injected (locally: `noenvy run -- npm run rebuild:web`).
#
# Usage: npm run rebuild:web   (or ./scripts/rebuild-web.sh)

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

docker compose up -d --build -V web

echo "Web rebuilt with fresh node_modules. App: http://localhost:3000"
