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

# Login to GHCR
log_info "Logging in to GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

# Clean up old compose files
log_info "Cleaning up old compose files..."
rm -f docker-compose.yml docker-compose.override.yml

# Rename prod compose file
log_info "Setting up production compose file..."
mv docker-compose.prod.yml docker-compose.yml

log_info "Creating docker-pg-exec alias..."
echo "alias docker-pg-exec='docker exec -it ubuntu-postgres-1 psql -U iwmm_pg_user -d i_want_my_mtg'" >> ~/.bashrc
log_info "Alias docker-pg-exec added."

# Stop existing containers
log_info "Stopping existing containers..."
docker compose down --remove-orphans || true

# Pull latest images
log_info "Pulling latest images..."
docker compose pull web postgres

# Start PostgreSQL
log_info "Starting PostgreSQL..."
docker compose up -d postgres

# Wait for PostgreSQL
log_info "Waiting for PostgreSQL to be ready..."
timeout 60 bash -c 'until docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do echo "Waiting for DB..."; sleep 2; done'

if [ $? -eq 0 ]; then
    log_info "PostgreSQL is ready!"
else
    log_error "PostgreSQL failed to start!"
    docker compose logs postgres
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

log_info "Cleaning up old images..."
docker image prune -f

log_info "Disk space usage:"
df -h

log_info "Remote deployment completed successfully!"