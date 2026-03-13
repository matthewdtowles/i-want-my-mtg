#!/usr/bin/env bash
set -euo pipefail

# Run Scry ETL commands via Docker
# Usage: ./scripts/etl.sh <command> [flags]
#
# Examples:
#   ./scripts/etl.sh ingest           # Full ingest (sets, cards, prices)
#   ./scripts/etl.sh ingest -s        # Sets only
#   ./scripts/etl.sh ingest -c        # Cards only
#   ./scripts/etl.sh ingest -p        # Prices only
#   ./scripts/etl.sh ingest -k mh3    # Cards for specific set
#   ./scripts/etl.sh health           # Data integrity check
#   ./scripts/etl.sh health --detailed
#   ./scripts/etl.sh cleanup -c       # Clean up filtered sets/cards
#   ./scripts/etl.sh retention        # Apply price_history retention

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ $# -eq 0 ]; then
  echo "Usage: ./scripts/etl.sh <command> [flags]"
  echo ""
  echo "Commands:"
  echo "  ingest              Ingest MTG data from Scryfall"
  echo "  post-ingest-prune   Prune unwanted ingested data"
  echo "  post-ingest-updates Update set sizes and prices"
  echo "  cleanup             Remove filtered sets/cards"
  echo "  health              Check data integrity"
  echo "  retention           Apply price_history retention policy"
  echo "  truncate-history    Clear price history"
  exit 1
fi

echo "Running: scry $*"
docker compose run --rm etl /app/scry "$@"
