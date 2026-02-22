#!/usr/bin/env bash
set -euo pipefail

# Reset the database: destroy volumes, recreate postgres, run migrations
# Usage: ./scripts/reset-db.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Reset Database ==="
echo ""
echo "This will destroy all local database data and recreate from scratch."
read -rp "Are you sure? (y/N) " confirm
if [[ "$confirm" != [yY] ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "[1/4] Stopping services..."
docker compose down

echo ""
echo "[2/4] Removing postgres volume..."
docker volume rm "$(docker compose config --volumes | grep postgres)" 2>/dev/null || true
# Fallback: remove by full name
docker volume ls -q | grep -i "i-want-my-mtg.*postgres" | xargs -r docker volume rm 2>/dev/null || true

echo ""
echo "[3/4] Starting postgres..."
docker compose up -d postgres
echo "  Waiting for PostgreSQL to be ready..."
retries=0
until docker compose exec -T postgres pg_isready -q 2>/dev/null; do
  retries=$((retries + 1))
  if [ "$retries" -ge 30 ]; then
    echo "  ERROR: PostgreSQL did not become ready in time."
    exit 1
  fi
  sleep 2
done
echo "  -> PostgreSQL is ready."

echo ""
echo "[4/4] Running migrations..."
docker compose run --rm migrate

echo ""
echo "Starting remaining services..."
docker compose up -d

echo ""
echo "=== Database Reset Complete ==="
echo "Run './scripts/etl.sh ingest' to populate with Scryfall data."
