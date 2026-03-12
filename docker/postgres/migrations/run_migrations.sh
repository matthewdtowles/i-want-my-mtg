#!/usr/bin/env bash
set -euo pipefail

# Supports two modes:
# 1. DATABASE_URL set — connect directly (managed DB / prod)
# 2. POSTGRES_* vars set — construct connection (Docker / dev)

if [ -n "${DATABASE_URL:-}" ]; then
  PSQL_CONN="$DATABASE_URL"
  echo "Using DATABASE_URL for connection"
else
  : "${POSTGRES_USER:?}"
  : "${POSTGRES_PASSWORD:?}"
  : "${POSTGRES_DB:?}"
  POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  PSQL_CONN="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
  echo "Using POSTGRES_* vars for connection"
fi

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
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
  psql "$PSQL_CONN" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Migrations complete."
