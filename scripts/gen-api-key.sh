#!/bin/bash
# Generate an API key and add/update it in the .env file.
# Usage: ./scripts/gen-api-key.sh [KEY_NAME] [ENV_FILE]
#   KEY_NAME  - env var name (default: INTERNAL_API_KEY)
#   ENV_FILE  - path to .env file (default: .env)

set -euo pipefail

KEY_NAME="${1:-INTERNAL_API_KEY}"
ENV_FILE="${2:-.env}"

NEW_KEY=$(openssl rand -base64 32)

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found." >&2
    exit 1
fi

if grep -q "^${KEY_NAME}=" "$ENV_FILE"; then
    sed -i "s|^${KEY_NAME}=.*|${KEY_NAME}=${NEW_KEY}|" "$ENV_FILE"
    echo "Updated ${KEY_NAME} in ${ENV_FILE}"
else
    printf '\n%s=%s\n' "$KEY_NAME" "$NEW_KEY" >> "$ENV_FILE"
    echo "Added ${KEY_NAME} to ${ENV_FILE}"
fi

echo "Key: ${NEW_KEY}"
