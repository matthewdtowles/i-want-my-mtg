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
docker pull ghcr.io/matthewdtowles/i-want-my-mtg/etl:latest
container_id=$(docker create ghcr.io/matthewdtowles/i-want-my-mtg/etl:latest)
sudo docker cp "$container_id:/app/scry" /opt/scripts/scry
docker rm "$container_id"
docker rmi ghcr.io/matthewdtowles/i-want-my-mtg/etl:latest
sudo chmod 755 /opt/scripts/scry

# Set log directory permissions
sudo chown ubuntu:ubuntu /var/log/i-want-my-mtg

log_info "Cron jobs installed successfully."
