#!/bin/bash

# Shared database configuration for maintenance scripts
# Dynamically resolves values from .env and Docker Compose

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

# Load values from .env file if it exists
if [ -f "$ENV_FILE" ]; then
    # Source only the variables we need (avoids side effects)
    DB_NAME="${DB_NAME:-$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d'=' -f2)}"
    DB_USER="${DB_USER:-$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d'=' -f2)}"
else
    echo "Warning: .env file not found at $ENV_FILE"
fi

# Resolve container name from Docker Compose if not overridden
if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --format '{{.Name}}' 2>/dev/null | grep postgres | head -1)
fi

# Final fallbacks if nothing resolved
DB_CONTAINER="${DB_CONTAINER:-ubuntu-postgres-1}"
DB_NAME="${DB_NAME:-i_want_my_mtg}"
DB_USER="${DB_USER:-iwmm_pg_user}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse common CLI args (overrides everything above)
parse_db_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --container) DB_CONTAINER="$2"; shift 2 ;;
            --db)        DB_NAME="$2"; shift 2 ;;
            --user)      DB_USER="$2"; shift 2 ;;
            --help)
                echo "Database options:"
                echo "  --container <name>  Docker container name (auto-detected from docker compose)"
                echo "  --db <name>         Database name (reads POSTGRES_DB from .env)"
                echo "  --user <name>       Database user (reads POSTGRES_USER from .env)"
                echo ""
                echo "Current resolved values:"
                echo "  Container: $DB_CONTAINER"
                echo "  Database:  $DB_NAME"
                echo "  User:      $DB_USER"
                return 1
                ;;
            *) shift ;;
        esac
    done
}

# Helper to execute PostgreSQL commands
psql_exec() {
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$1"
}