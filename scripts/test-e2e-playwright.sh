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
APP_PORT=3000

COMPOSE=(docker compose -f "$COMPOSE_FILE" -p iwantmymtg-test)
APP_PID=""

cleanup() {
    echo "Cleaning up..."
    if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" 2>/dev/null; then
        kill "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    "${COMPOSE[@]}" down -v 2>/dev/null || true
}
trap cleanup EXIT

# Remove orphaned containers from previous runs
echo "Cleaning up orphaned containers..."
"${COMPOSE[@]}" down -v --remove-orphans 2>/dev/null || true

echo "Starting test database..."
"${COMPOSE[@]}" up -d --wait

echo "Running migrations..."
for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "  Applying: $(basename "$f")"
    "${COMPOSE[@]}" exec -T "$DB_SERVICE" \
        psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f" > /dev/null
done

echo "Seeding test data..."
"${COMPOSE[@]}" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$SEED_FILE" > /dev/null

echo "Building application..."
npm run build:prod

echo "Starting application..."
DATABASE_URL="" \
DB_HOST="127.0.0.1" \
DB_PORT="5433" \
DB_USERNAME="$DB_USER" \
DB_PASSWORD="$DB_PASS" \
DB_NAME="$DB_NAME" \
JWT_SECRET="integ-test-secret" \
NODE_ENV="test" \
node "$PROJECT_ROOT/dist/main" &
APP_PID=$!

# Wait for app to be ready
echo "Waiting for app on port $APP_PORT..."
for i in $(seq 1 30); do
    if curl -sf "http://localhost:$APP_PORT/" > /dev/null 2>&1; then
        echo "App is ready."
        break
    fi
    if ! kill -0 "$APP_PID" 2>/dev/null; then
        echo "App process died unexpectedly."
        exit 1
    fi
    sleep 1
done

if ! curl -sf "http://localhost:$APP_PORT/" > /dev/null 2>&1; then
    echo "App failed to start within 30 seconds."
    exit 1
fi

echo "Running Playwright tests..."
BASE_URL="http://localhost:$APP_PORT" \
npx playwright test "$@"
