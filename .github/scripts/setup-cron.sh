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

# Install ingest retry script
sudo cp ~/cron/ingest-retry.sh /opt/scripts/ingest-retry.sh
sudo chmod 755 /opt/scripts/ingest-retry.sh

# Install log cleanup script
sudo cp ~/cron/clean_logs.sh /opt/scripts/clean_logs.sh
sudo chmod 755 /opt/scripts/clean_logs.sh

# Extract scry binary from ETL Docker image
log_info "Extracting scry binary from ghcr.io/matthewdtowles/scry:latest..."
# Retry the pull: ghcr.io occasionally returns transient "denied" errors
for attempt in 1 2 3; do
    if docker pull ghcr.io/matthewdtowles/scry:latest; then
        break
    fi
    if [ "$attempt" -eq 3 ]; then
        echo "Failed to pull scry image after 3 attempts" >&2
        exit 1
    fi
    log_info "Pull failed (attempt $attempt/3), retrying in 15s..."
    sleep 15
done
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

# Record which scry actually landed.
#
# This deploy is the ONLY thing that refreshes the binary - a new scry release
# does not reach the server on its own - so "which scry is running" is decided
# here and nowhere else. Without this line nothing said, and the server sat on
# 5.18.3 for a day while 5.18.5 was published, with two fixes built, released
# and simply not live. Now every deploy log states the version, so comparing it
# against scry's latest release is a glance rather than an SSH session.
#
# `scry --version` prints its startup banner first and the version last, and it
# needs no DATABASE_URL, so it is safe to call directly here rather than through
# the scry.sh wrapper.
log_info "Installed scry version: $(/opt/scripts/scry --version 2>&1 | tail -1)"

# Set log directory and file permissions
sudo chown ubuntu:ubuntu /var/log/i-want-my-mtg
sudo touch /var/log/i-want-my-mtg/ingestion.log /var/log/i-want-my-mtg/retention.log /var/log/i-want-my-mtg/cleanup.log /var/log/i-want-my-mtg/portfolio.log /var/log/i-want-my-mtg/price-alerts.log /var/log/i-want-my-mtg/health.log
sudo chown ubuntu:ubuntu /var/log/i-want-my-mtg/*.log

log_info "Cron jobs installed successfully."
