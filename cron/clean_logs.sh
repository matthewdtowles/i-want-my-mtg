#!/bin/bash
set -euo pipefail

# Truncate Docker container logs for all running containers
for CONTAINER_ID in $(docker ps -q); do
  LOG_PATH=$(docker inspect --format '{{.LogPath}}' "$CONTAINER_ID")
  if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
    sudo truncate -s 0 "$LOG_PATH"
  fi
done

# Rotate app cron logs — keep last 1000 lines of each
LOG_DIR="/var/log/i-want-my-mtg"
if [ -d "$LOG_DIR" ]; then
  for LOG_FILE in "$LOG_DIR"/*.log; do
    [ -f "$LOG_FILE" ] || continue
    tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
    mv "${LOG_FILE}.tmp" "$LOG_FILE"
  done
fi
