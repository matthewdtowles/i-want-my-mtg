#!/bin/bash
set -euo pipefail

source /home/ubuntu/.env

COMPOSE_DIR="/home/ubuntu"
POSTGRES_CONTAINER=$(docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps -q postgres)
DB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$POSTGRES_CONTAINER")
export DB_HOST="$DB_IP"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_IP}:5432/${POSTGRES_DB}"

/opt/scripts/scry "${@:-ingest}"
