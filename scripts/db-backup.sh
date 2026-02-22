#!/usr/bin/env bash
set -euo pipefail

# Back up the local database to a SQL file
# Usage: ./scripts/db-backup.sh [output_file]

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Source .env for DB credentials
set -a
# shellcheck disable=SC1091
source .env
set +a

output="${1:-backup_$(date +%Y%m%d_%H%M%S).sql}"

echo "Backing up database to ${output}..."
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$output"
echo "Backup saved to ${output}"
