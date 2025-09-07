#!/bin/bash
set -e

# Production deployment script
SERVER_USER="deploy"
SERVER_HOST="your-server.com"
PROJECT_DIR="/opt/mtg-project"

echo "Deploying to production..."

# SSH to server and deploy
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /opt/mtg-project

# Login to registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Pull latest images
export GITHUB_REPOSITORY="yourusername/mtg-project"
export IMAGE_TAG="latest"
docker-compose -f docker-compose.prod.yml pull

# Run database migrations
docker-compose -f docker-compose.prod.yml run --rm web npm run migration:run

# Deploy with zero downtime
docker-compose -f docker-compose.prod.yml up -d

# Run ETL process
docker-compose -f docker-compose.prod.yml run --rm etl

echo "Deployment complete!"
EOF
