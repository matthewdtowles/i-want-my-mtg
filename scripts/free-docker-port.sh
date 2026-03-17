#!/usr/bin/env bash
set -euo pipefail

# Frees a port stuck inside Docker Desktop's Linux VM.
# This happens when a container is removed but Docker's internal
# proxy keeps the port allocated (common Docker Desktop bug).
#
# Usage: ./scripts/free-docker-port.sh [PORT]
#   PORT defaults to 5433 (integration test DB)

PORT="${1:-5433}"

echo "Checking if port $PORT is stuck in Docker VM..."
if docker run --rm --privileged --pid=host alpine \
    nsenter -t 1 -m -u -n -i -- sh -c "netstat -tlnp 2>/dev/null | grep -q ':${PORT} '" 2>/dev/null; then
    echo "Port $PORT is held by a leaked Docker proxy. Killing it..."
    docker run --rm --privileged --pid=host alpine \
        nsenter -t 1 -m -u -n -i -- sh -c "fuser -k ${PORT}/tcp 2>/dev/null"
    echo "Port $PORT freed."
else
    echo "Port $PORT is not stuck in Docker VM."
fi
