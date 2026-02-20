#!/bin/bash
set -euo pipefail

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Starting scry.sh with args: ${*:-ingest}"

echo "Sourcing .env..."
source /home/ubuntu/.env

for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB; do
    if [ -z "${!var:-}" ]; then
        echo "ERROR: Required variable $var is not set in .env" >&2
        exit 1
    fi
done
echo "Environment variables validated."

COMPOSE_DIR="/home/ubuntu"

echo "Looking up postgres container..."
POSTGRES_CONTAINER=$(docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps -q postgres)
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "ERROR: Postgres container not found. Is it running?" >&2
    docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps
    exit 1
fi
echo "Postgres container: $POSTGRES_CONTAINER"

echo "Resolving postgres container IP..."
DB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$POSTGRES_CONTAINER")
if [ -z "$DB_IP" ]; then
    echo "ERROR: Could not resolve postgres container IP." >&2
    exit 1
fi
echo "Postgres IP: $DB_IP"

export DB_HOST="$DB_IP"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_IP}:5432/${POSTGRES_DB}"

echo "Running: /opt/scripts/scry ${*:-ingest}"
/opt/scripts/scry "${@:-ingest}"
