#!/usr/bin/env bash
set -euo pipefail

# Run linting and formatting checks
# Usage:
#   ./scripts/lint.sh          # Lint + format check
#   ./scripts/lint.sh fix      # Lint fix + format fix

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ "${1:-}" = "fix" ]; then
  echo "Running ESLint with --fix..."
  docker compose exec web npm run lint
  echo ""
  echo "Running Prettier format..."
  docker compose exec web npm run format
else
  echo "Running ESLint..."
  docker compose exec web npm run lint
  echo ""
  echo "Checking formatting..."
  docker compose exec web npm run format:check
fi
