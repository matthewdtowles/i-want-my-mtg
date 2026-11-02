#!/bin/bash
# filepath: scripts/remote-deploy.sh
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure psql is available for db-managed alias and ad-hoc queries
log_info "Ensuring postgresql-client is installed..."
sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client > /dev/null

# Login to GHCR
log_info "Logging in to GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

# Clean up old compose files
log_info "Cleaning up old compose files..."
rm -f docker-compose.yml docker-compose.override.yml

# Rename prod compose file
log_info "Setting up production compose file..."
mv docker-compose.prod.yml docker-compose.yml

# Remove legacy docker-pg-exec alias if present
if grep -q 'docker-pg-exec' ~/.bashrc; then
    log_info "Removing legacy docker-pg-exec alias..."
    sed -i '/docker-pg-exec/d' ~/.bashrc
fi

# Set up db-managed alias using DATABASE_URL from .env
if grep -q 'db-managed' ~/.bashrc; then
    log_info "Updating db-managed alias..."
    sed -i '/db-managed/d' ~/.bashrc
fi
echo "alias db-managed='source ~/.env && psql \"\$DATABASE_URL\"'" >> ~/.bashrc
log_info "Alias db-managed configured."

# The running image, so a failed migration can put it back.
PREVIOUS_IMAGE="$(docker inspect --format '{{.Image}}' "$(docker compose ps -q web 2>/dev/null)" 2>/dev/null || true)"

# Pull while the current version is still serving, so the site is only down for the
# migrations and the restart.
log_info "Pulling latest images..."
docker compose pull web

# Stop existing containers
log_info "Stopping existing containers..."
docker compose down --remove-orphans || true

# Run database migrations against managed DB
log_info "Running database migrations..."
source ~/.env
export DATABASE_URL
export MIGRATIONS_DIR="$HOME/migrations"
chmod +x migrations/run_migrations.sh
if ! migrations/run_migrations.sh; then
    # On 2026-11-01 a migration timed out here and the deploy exited with nothing
    # serving. Bring the previous version back before failing.
    log_error "Migrations failed!"
    if [ -n "$PREVIOUS_IMAGE" ]; then
        log_warn "Restarting the previous version..."
        docker tag "$PREVIOUS_IMAGE" ghcr.io/matthewdtowles/i-want-my-mtg/web:latest
        docker compose up -d web
    fi
    exit 1
fi

# Start web service
log_info "Starting web service..."
docker compose up -d web

# Wait and verify
log_info "Verifying deployment..."
sleep 10
docker compose ps
docker compose logs web --tail=10

log_info "Testing web service connectivity..."
timeout 30 bash -c 'until curl -f http://localhost; do echo "Waiting for web service..."; sleep 2; done' || {
    log_error "Web service failed to respond!"
    docker compose logs web
    exit 1
}

log_info "Setting up cron jobs..."
chmod +x setup-cron.sh
./setup-cron.sh

log_info "Cleaning up old images..."
docker image prune -f

log_info "Disk space usage:"
df -h

log_info "Remote deployment completed successfully!"
