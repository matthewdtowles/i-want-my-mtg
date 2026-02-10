#!/bin/bash

# Grab the container IP
DB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ubuntu-postgres-1)

# Build DATABASE_URL dynamically
export DB_HOST=$DB_IP
export DATABASE_URL="postgres://user:pass@$DB_IP:5432/mydb"

# Run your binary (pass any scry command + flags as script arguments)
# Examples:
#   ./scry-example-script.sh ingest
#   ./scry-example-script.sh ingest -s -p
#   ./scry-example-script.sh health --detailed
#   ./scry-example-script.sh cleanup -c -n 1000
./scry "${@:-ingest}"
