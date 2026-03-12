#!/bin/bash
set -euo pipefail

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Starting scry.sh with args: ${*:-ingest}"

echo "Sourcing .env..."
source /home/ubuntu/.env

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: Required variable DATABASE_URL is not set in .env" >&2
    exit 1
fi
echo "Environment variables validated."

echo "Running: /opt/scripts/scry ${*:-ingest}"
/opt/scripts/scry "${@:-ingest}"
