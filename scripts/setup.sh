#!/usr/bin/env bash
set -euo pipefail

# Developer environment setup script
# Usage: ./scripts/setup.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== I Want My MTG - Dev Environment Setup ==="
echo ""

# 1. Create .env from example if missing
if [ ! -f .env ]; then
  echo "[1/4] Creating .env from .env.example..."
  cp .env.example .env
  echo "  -> .env created. Edit it with your local values before continuing."
  echo "  -> Required: DB_*, POSTGRES_*, JWT_SECRET, DATABASE_URL"
  echo ""
  read -rp "Press Enter after editing .env (or Ctrl+C to abort)..."
else
  echo "[1/4] .env already exists, skipping."
fi

# 2. Build and start Docker services
echo ""
echo "[2/4] Building and starting Docker services..."
docker compose build
docker compose up -d
echo "  -> Services started: web (3000), postgres (5432), adminer (8080), mailhog (8025)"

# 3. Wait for postgres to be healthy
echo ""
echo "[3/4] Waiting for PostgreSQL to be ready..."
retries=0
max_retries=30
until docker compose exec -T postgres pg_isready -q 2>/dev/null; do
  retries=$((retries + 1))
  if [ "$retries" -ge "$max_retries" ]; then
    echo "  -> ERROR: PostgreSQL did not become ready in time."
    exit 1
  fi
  sleep 2
done
echo "  -> PostgreSQL is ready."

# 4. Run database migrations
echo ""
echo "[4/4] Running database migrations..."
docker compose run --rm migrate
echo "  -> Migrations complete."

echo ""
echo "=== Setup Complete ==="
echo ""
echo "  Web app:   http://localhost:3000"
echo "  Adminer:   http://localhost:8080"
echo "  MailHog:   http://localhost:8025"
echo ""
echo "  View logs: ./scripts/logs.sh"
echo "  Run tests: ./scripts/test.sh"
echo "  Run ETL:   ./scripts/etl.sh ingest"
