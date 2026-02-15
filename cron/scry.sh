#!/bin/bash
set -euo pipefail
source "$HOME/.env"

DB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ubuntu-postgres-1)
export DB_HOST="$DB_IP"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_IP}:5432/${POSTGRES_DB}"

/opt/scripts/scry "${@:-ingest}"
