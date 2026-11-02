#!/usr/bin/env bash
set -euo pipefail

# Supports two modes:
# 1. DATABASE_URL set - connect directly (managed DB / prod)
# 2. POSTGRES_* vars set - connect via libpq env vars (Docker / dev)

if [ -n "${DATABASE_URL:-}" ]; then
  USE_URL=true
  echo "Using DATABASE_URL for connection"
else
  USE_URL=false
  : "${POSTGRES_USER:?}"
  : "${POSTGRES_PASSWORD:?}"
  : "${POSTGRES_DB:?}"
  POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  export PGPASSWORD="$POSTGRES_PASSWORD"
  PSQL_CONN="-h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
  echo "Using POSTGRES_* vars for connection"
fi

# Fail fast if a migration can't acquire its locks (e.g. a stuck ingest holding
# card in an idle-in-transaction session). Without this, a lock-blocked ALTER
# queues an ACCESS EXCLUSIVE request in front of all live reads and takes the
# site down until the deploy is killed. lock_timeout only aborts on lock
# *acquisition*, so slow-but-running migrations (large index builds) still
# complete.
export PGOPTIONS="${PGOPTIONS:+$PGOPTIONS }-c lock_timeout=15000"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
echo "Running migrations from ${MIGRATIONS_DIR}"

shopt -s nullglob
sql_files=("${MIGRATIONS_DIR}"/*.sql)
if [ ${#sql_files[@]} -eq 0 ]; then
  echo "No migrations found in ${MIGRATIONS_DIR}"
  exit 0
fi

run_psql() {
  if [ "$USE_URL" = true ]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
  else
    # shellcheck disable=SC2086
    psql $PSQL_CONN -v ON_ERROR_STOP=1 "$@"
  fi
}

# Each migration runs once. Replaying all of them on every deploy made even no-op
# ones take their locks again: on 2026-11-01, 002's ALTER TABLE card waited on two
# stuck reads, hit lock_timeout, and the deploy stopped with the site already down.
# A database without this table replays everything once (they are all replay-safe)
# and is recorded from then on.
run_psql -q -c "CREATE TABLE IF NOT EXISTS schema_migration (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)"
applied="$(run_psql -At -c "SELECT filename FROM schema_migration")"

# run in lexical order
for f in "${sql_files[@]}"; do
  name="$(basename "$f")"
  if grep -qxF "$name" <<< "$applied"; then
    continue
  fi
  echo "Applying: $f"
  run_psql -f "$f"
  run_psql -q -c "INSERT INTO schema_migration (filename) VALUES ('$name') ON CONFLICT DO NOTHING"
done

echo "Migrations complete."
