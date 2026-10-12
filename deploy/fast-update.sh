#!/bin/bash

# Fast update script for minor code changes
# Uses volume mounts to update code without full rebuild
# Usage: ./fast-update.sh [server_ip] [ssh_key]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="${1:-41.89.173.8}"
SSH_KEY="${2:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"

SSH_KEY="${SSH_KEY/#\~/$HOME}"

if [ ! -f "$SSH_KEY" ]; then
    echo "Error: SSH key not found: $SSH_KEY"
    exit 1
fi

ssh_cmd() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
}

echo -e "${BLUE}Fast Code Update (Volume Mount Mode)${NC}"
echo ""

# Check if using fast-deploy compose file
COMPOSE_FILE=$(ssh_cmd "find ~ -name 'docker-compose.fast-deploy.yml' -type f 2>/dev/null | grep -v backup | head -1")

if [ -z "$COMPOSE_FILE" ]; then
    echo -e "${YELLOW}⚠ Fast deploy not set up. Setting up now...${NC}"
    echo ""

    # Upload fast-deploy compose file
    echo "📤 Uploading docker-compose.fast-deploy.yml..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no docker-compose.fast-deploy.yml "$SSH_USER@$SERVER_IP:~/docker-compose.fast-deploy.yml"

    # Upload fast entrypoint
    echo "📤 Uploading docker-entrypoint-fast.sh..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no docker-entrypoint-fast.sh "$SSH_USER@$SERVER_IP:~/docker-entrypoint-fast.sh"
    ssh_cmd "chmod +x ~/docker-entrypoint-fast.sh"

    # Copy entrypoint into container build context (if needed)
    echo "📤 Uploading files to server..."
    COMPOSE_DIR=$(ssh_cmd "find ~ -name 'docker-compose.deploy.yml' -type f 2>/dev/null | grep -v backup | head -1 | xargs dirname")
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no docker-entrypoint-fast.sh "$SSH_USER@$SERVER_IP:$COMPOSE_DIR/docker-entrypoint-fast.sh"

    COMPOSE_FILE="~/docker-compose.fast-deploy.yml"
    echo -e "${GREEN}✓ Fast deploy files uploaded${NC}"
    echo ""
fi

# Package and upload changed files
echo "📦 Packaging code changes..."
TAR_FILE="kiplombe-fast-update-$(date +%Y%m%d-%H%M%S).tar.gz"

# Create tar with only source files (not node_modules, .next, etc)
tar -czf "/tmp/$TAR_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    app/ components/ lib/ public/ styles/ hooks/ scripts/ \
    package.json package-lock.json tsconfig.json next.config.mjs \
    tailwind.config.ts postcss.config.mjs 2>/dev/null || {
    echo -e "${RED}✗ Failed to create package${NC}"
    exit 1
}

echo "📤 Uploading code changes..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "/tmp/$TAR_FILE" "$SSH_USER@$SERVER_IP:~/"

# Extract on server
COMPOSE_DIR=$(ssh_cmd "find ~ -name 'docker-compose.deploy.yml' -type f 2>/dev/null | grep -v backup | head -1 | xargs dirname")
echo "📦 Extracting files on server..."
ssh_cmd "cd $COMPOSE_DIR && tar -xzf ~/$TAR_FILE && rm ~/$TAR_FILE"

# Restart frontend to pick up changes
echo ""
echo "🔄 Restarting frontend to apply changes..."
ssh_cmd "cd $COMPOSE_DIR && docker compose -f docker-compose.fast-deploy.yml restart frontend || docker compose -f docker-compose.deploy.yml restart frontend"

echo ""
echo -e "${GREEN}✓ Code update complete!${NC}"
echo ""
echo "Changes should be live in 10-30 seconds."
echo "Monitor with: docker logs -f kiplombe_frontend"
echo ""

# Cleanup
rm -f "/tmp/$TAR_FILE"





