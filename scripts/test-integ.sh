#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.test.yml"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"
SEED_FILE="$PROJECT_ROOT/test/integration/seed.sql"

DB_USER=testuser
DB_PASS=testpass
DB_NAME=iwantmymtg_test
DB_SERVICE=postgres-test

COMPOSE="docker compose -f $COMPOSE_FILE -p iwantmymtg-test"

cleanup() {
    echo "Stopping test database..."
    $COMPOSE down -v 2>/dev/null || true
}
trap cleanup EXIT

# Remove orphaned containers from previous runs
echo "Cleaning up orphaned containers..."
$COMPOSE down -v --remove-orphans 2>/dev/null || true

echo "Starting test database..."
$COMPOSE up -d --wait

echo "Running migrations..."
for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "  Applying: $(basename "$f")"
    $COMPOSE exec -T "$DB_SERVICE" \
        psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f" > /dev/null
done

echo "Seeding test data..."
$COMPOSE exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$SEED_FILE" > /dev/null

echo "Running integration tests..."
DATABASE_URL="" \
DB_HOST="127.0.0.1" \
DB_PORT="5433" \
DB_USERNAME="$DB_USER" \
DB_PASSWORD="$DB_PASS" \
DB_NAME="$DB_NAME" \
JWT_SECRET="integ-test-secret" \
NODE_ENV="test" \
npx jest --config "$PROJECT_ROOT/test/jest-e2e.json" --runInBand "$@"
