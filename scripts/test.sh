#!/usr/bin/env bash
set -euo pipefail

# Run tests
# Usage:
#   ./scripts/test.sh              # All unit tests
#   ./scripts/test.sh e2e          # E2E tests
#   ./scripts/test.sh cov          # Unit tests with coverage
#   ./scripts/test.sh scry         # Scry (Rust) tests
#   ./scripts/test.sh <pattern>    # Unit tests matching pattern

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

case "${1:-}" in
  e2e)
    echo "Running E2E tests..."
    docker compose exec web npm run test:e2e
    ;;
  cov)
    echo "Running unit tests with coverage..."
    docker compose exec web npm run test:cov
    ;;
  scry)
    echo "Running Scry (Rust) tests..."
    docker compose run --rm etl cargo test
    ;;
  "")
    echo "Running unit tests..."
    docker compose exec web npm test
    ;;
  *)
    echo "Running unit tests matching: $1"
    docker compose exec web npm test -- --testPathPattern="$1"
    ;;
esac
