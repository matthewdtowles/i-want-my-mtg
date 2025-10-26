#!/bin/bash

CONTAINER_NAME="$1"

if [ -z "$CONTAINER_NAME" ]; then
  echo "Usage: $0 <container_name>"
  exit 1
fi

SHORT_ID=$(docker ps -qf "name=$CONTAINER_NAME")
if [ -z "$SHORT_ID" ]; then
  echo "Container not found."
  exit 1
fi

FULL_ID=$(docker inspect --format '{{.Id}}' "$SHORT_ID")
LOG_PATH="/var/lib/docker/containers/$FULL_ID/${FULL_ID}-json.log"

if [ -f "$LOG_PATH" ]; then
  sudo truncate -s 0 "$LOG_PATH"
  echo "Truncated log file: $LOG_PATH"
else
  echo "Log file not found: $LOG_PATH"
fi