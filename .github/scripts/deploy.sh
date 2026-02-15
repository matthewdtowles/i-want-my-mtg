#!/bin/bash
# filepath: /home/matt/projects/i-want-my-mtg/.github/scripts/deploy.sh
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate required environment variables
required_vars=(
    "SSH_PRIVATE_KEY"
    "LIGHTSAIL_IP"
    "GITHUB_TOKEN"
    "GITHUB_ACTOR"
    "DATABASE_URL"
    "JWT_SECRET"
    "NODE_ENV"
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "SCRY_LOG"
    "LIGHTSAIL_GITHUB_TOKEN"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_FROM"
    "APP_URL"
)

log_info "Validating environment variables..."
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Setup SSH key
log_info "Setting up SSH key..."
echo "$SSH_PRIVATE_KEY" > private_key
chmod 600 private_key

# Create .env file with proper quoting
log_info "Creating production .env file..."
cat > .env <<'EOF'
APP_NAME=i-want-my-mtg
DB_HOST=postgres
DB_PORT=5432
LOG_FORMAT=json
EOF

# Add variables with proper escaping
echo "DB_USERNAME=\"$POSTGRES_USER\"" >> .env
echo "DB_PASSWORD=\"$POSTGRES_PASSWORD\"" >> .env
echo "DB_NAME=\"$POSTGRES_DB\"" >> .env
echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
echo "NODE_ENV=\"$NODE_ENV\"" >> .env
echo "POSTGRES_DB=\"$POSTGRES_DB\"" >> .env
echo "POSTGRES_USER=\"$POSTGRES_USER\"" >> .env
echo "POSTGRES_PASSWORD=\"$POSTGRES_PASSWORD\"" >> .env
echo "SCRY_LOG=\"$SCRY_LOG\"" >> .env
echo "LIGHTSAIL_GITHUB_TOKEN=\"$LIGHTSAIL_GITHUB_TOKEN\"" >> .env

# Email configuration
echo "SMTP_HOST=\"$SMTP_HOST\"" >> .env
echo "SMTP_PORT=\"$SMTP_PORT\"" >> .env
echo "SMTP_SECURE=\"${SMTP_SECURE:-false}\"" >> .env
echo "SMTP_USER=\"${SMTP_USER:-}\"" >> .env
echo "SMTP_PASS=\"${SMTP_PASS:-}\"" >> .env
echo "SMTP_FROM=\"$SMTP_FROM\"" >> .env
echo "APP_URL=\"$APP_URL\"" >> .env

# Copy files to server
log_info "Copying files to server..."
scp -o StrictHostKeyChecking=no -i private_key docker-compose.prod.yml ubuntu@$LIGHTSAIL_IP:~/
scp -o StrictHostKeyChecking=no -i private_key .env ubuntu@$LIGHTSAIL_IP:~/
scp -o StrictHostKeyChecking=no -i private_key -r docker/ ubuntu@$LIGHTSAIL_IP:~/
scp -o StrictHostKeyChecking=no -i private_key -r cron/ ubuntu@$LIGHTSAIL_IP:~/
scp -o StrictHostKeyChecking=no -i private_key .github/scripts/setup-cron.sh ubuntu@$LIGHTSAIL_IP:~/
scp -o StrictHostKeyChecking=no -i private_key .github/scripts/remote-deploy.sh ubuntu@$LIGHTSAIL_IP:~/

# Make remote script executable and run deployment
log_info "Running deployment on remote server..."
ssh -o StrictHostKeyChecking=no -i private_key ubuntu@$LIGHTSAIL_IP \
    "chmod +x remote-deploy.sh && GITHUB_TOKEN=\"$GITHUB_TOKEN\" GITHUB_ACTOR=\"$GITHUB_ACTOR\" POSTGRES_USER=\"$POSTGRES_USER\" POSTGRES_DB=\"$POSTGRES_DB\" ./remote-deploy.sh"

# Cleanup
log_info "Cleaning up..."
rm -f private_key

log_info "Deployment completed successfully!"