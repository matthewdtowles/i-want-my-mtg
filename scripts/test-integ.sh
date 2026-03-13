#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.test.yml"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"
SEED_FILE="$PROJECT_ROOT/test/integration/seed.sql"

DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=testuser
DB_PASS=testpass
DB_NAME=iwantmymtg_test

cleanup() {
    echo "Stopping test database..."
    docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
}
trap cleanup EXIT

# Remove orphaned containers from previous runs
echo "Cleaning up orphaned containers..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true

echo "Starting test database..."
docker compose -f "$COMPOSE_FILE" up -d --wait

echo "Running migrations..."
export PGPASSWORD="$DB_PASS"
for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "  Applying: $(basename "$f")"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$f" > /dev/null
done

echo "Seeding test data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SEED_FILE" > /dev/null

echo "Running integration tests..."
DATABASE_URL="" \
DB_HOST="$DB_HOST" \
DB_PORT="$DB_PORT" \
DB_USERNAME="$DB_USER" \
DB_PASSWORD="$DB_PASS" \
DB_NAME="$DB_NAME" \
JWT_SECRET="integ-test-secret" \
NODE_ENV="test" \
npx jest --config "$PROJECT_ROOT/test/jest-e2e.json" --runInBand "$@"
