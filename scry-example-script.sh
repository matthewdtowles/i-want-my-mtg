#!/bin/bash

# Grab the container IP
DB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ubuntu-postgres-1)

# Build DATABASE_URL dynamically
export DB_HOST=$DB_IP
export DATABASE_URL="postgres://user:pass@$DB_IP:5432/mydb"

# Run your binary
./scry ingest
