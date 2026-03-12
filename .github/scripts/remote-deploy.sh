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
if ! command -v psql &> /dev/null; then
    log_info "Installing postgresql-client..."
    sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client > /dev/null
fi

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

# Stop existing containers
log_info "Stopping existing containers..."
docker compose down --remove-orphans || true

# Pull latest images
log_info "Pulling latest images..."
docker compose pull web

# Run database migrations against managed DB
log_info "Running database migrations..."
source ~/.env
export DATABASE_URL
export MIGRATIONS_DIR="$HOME/docker/postgres/migrations"
chmod +x docker/postgres/migrations/run_migrations.sh
docker/postgres/migrations/run_migrations.sh

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
