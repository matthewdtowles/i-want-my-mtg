#!/bin/bash
# filepath: /home/matt/projects/i-want-my-mtg/.github/scripts/setup-cron.sh
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

# Set log directory permissions
sudo chown ubuntu:ubuntu /var/log/i-want-my-mtg

log_info "Cron jobs installed successfully."
