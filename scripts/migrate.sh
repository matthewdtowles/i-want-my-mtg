#!/usr/bin/env bash
set -euo pipefail

# Run database migrations
# Usage: ./scripts/migrate.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Running database migrations..."
docker compose run --rm migrate
echo "Migrations complete."
