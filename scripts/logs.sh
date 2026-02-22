#!/usr/bin/env bash
set -euo pipefail

# View Docker service logs
# Usage:
#   ./scripts/logs.sh          # Follow web logs
#   ./scripts/logs.sh web      # Follow web logs
#   ./scripts/logs.sh postgres  # Follow postgres logs
#   ./scripts/logs.sh all      # Follow all service logs

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

service="${1:-web}"

if [ "$service" = "all" ]; then
  docker compose logs -f
else
  docker compose logs -f "$service"
fi
