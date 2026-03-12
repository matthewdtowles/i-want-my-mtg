#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_info "Setting up cron jobs..."

# Create directories
sudo mkdir -p /opt/scripts /var/log/i-want-my-mtg

# Install cron.d file (must be root-owned, mode 644)
sudo cp ~/cron/i-want-my-mtg /etc/cron.d/i-want-my-mtg
sudo chown root:root /etc/cron.d/i-want-my-mtg
sudo chmod 644 /etc/cron.d/i-want-my-mtg

# Install scry wrapper script
sudo cp ~/cron/scry.sh /opt/scripts/scry.sh
sudo chmod 755 /opt/scripts/scry.sh

# Install log cleanup script
sudo cp ~/cron/clean_logs.sh /opt/scripts/clean_logs.sh
sudo chmod 755 /opt/scripts/clean_logs.sh

# Extract scry binary from ETL Docker image
log_info "Extracting scry binary from ETL image..."
docker pull ghcr.io/matthewdtowles/scry:latest
container_id=$(docker create ghcr.io/matthewdtowles/scry:latest)
cleanup_docker() {
    docker rm "$container_id" 2>/dev/null || true
    docker rmi ghcr.io/matthewdtowles/scry:latest 2>/dev/null || true
}
trap cleanup_docker EXIT
sudo docker cp "${container_id}:/app/scry" /opt/scripts/scry
cleanup_docker
trap - EXIT
sudo chmod 755 /opt/scripts/scry

# Set log directory and file permissions
sudo chown ubuntu:ubuntu /var/log/i-want-my-mtg
sudo touch /var/log/i-want-my-mtg/ingestion.log /var/log/i-want-my-mtg/retention.log /var/log/i-want-my-mtg/cleanup.log /var/log/i-want-my-mtg/portfolio.log
sudo chown ubuntu:ubuntu /var/log/i-want-my-mtg/*.log

log_info "Cron jobs installed successfully."
