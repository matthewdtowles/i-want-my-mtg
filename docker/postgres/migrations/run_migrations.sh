#!/usr/bin/env bash
set -euo pipefail

# environment expected via .env / docker-compose env_file
: "${POSTGRES_USER:?}"
: "${POSTGRES_PASSWORD:?}"
: "${POSTGRES_DB:?}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

MIGRATIONS_DIR="/migrations"
echo "Running migrations from ${MIGRATIONS_DIR}"

shopt -s nullglob
sql_files=("${MIGRATIONS_DIR}"/*.sql)
if [ ${#sql_files[@]} -eq 0 ]; then
  echo "No migrations found in ${MIGRATIONS_DIR}"
  exit 0
fi

# run in lexical order
for f in "${sql_files[@]}"; do
  echo "Applying: $f"
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Migrations complete."