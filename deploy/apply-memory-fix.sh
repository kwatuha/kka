#!/bin/bash

# Apply memory fix to running container
# This updates docker-compose and recreates the frontend with new limits
# Usage: ./apply-memory-fix.sh [server_ip] [ssh_key]

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

echo -e "${BLUE}Applying Memory Fix to Frontend...${NC}"
echo ""

# Find where docker-compose is being used
echo "🔍 Finding docker-compose file location..."
COMPOSE_DIR=$(ssh_cmd "docker inspect kiplombe_frontend --format='{{index .Config.Labels \"com.docker.compose.project.working_dir\"}}' 2>/dev/null || echo ''")

if [ -z "$COMPOSE_DIR" ] || [ "$COMPOSE_DIR" = "<no value>" ]; then
    # Try to find it
    COMPOSE_DIR=$(ssh_cmd "find ~ -name 'docker-compose.deploy.yml' -type f 2>/dev/null | grep -v backup | head -1 | xargs dirname")
fi

if [ -z "$COMPOSE_DIR" ]; then
    echo -e "${YELLOW}⚠ Could not find docker-compose directory${NC}"
    echo "Will upload to home directory and you can move it manually"
    COMPOSE_DIR="~"
fi

COMPOSE_FILE="$COMPOSE_DIR/docker-compose.deploy.yml"
echo "Using: $COMPOSE_FILE"
echo ""

# Upload updated docker-compose file
echo "📤 Uploading updated docker-compose.deploy.yml..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no docker-compose.deploy.yml "$SSH_USER@$SERVER_IP:$COMPOSE_FILE"

# Verify the memory limit in the uploaded file
echo ""
echo "✅ Verifying memory limit in uploaded file..."
MEMORY_LIMIT=$(ssh_cmd "grep -A 5 'frontend:' $COMPOSE_FILE | grep -A 3 'deploy:' | grep 'memory:' | head -1 | awk '{print \$2}'")
echo "Memory limit in file: $MEMORY_LIMIT"

if [ "$MEMORY_LIMIT" != "2G" ]; then
    echo -e "${RED}✗ Memory limit not updated correctly in file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Memory limit is 2G in docker-compose file${NC}"
echo ""

# Recreate frontend container with new limits
echo "🔄 Recreating frontend container with new memory limit..."
ssh_cmd "cd $COMPOSE_DIR && docker compose -f docker-compose.deploy.yml up -d --force-recreate frontend"

echo ""
echo "⏳ Waiting 5 seconds for container to start..."
sleep 5

# Verify new memory limit
echo ""
echo "🔍 Verifying new memory limit..."
NEW_LIMIT=$(ssh_cmd "docker inspect kiplombe_frontend --format='{{.HostConfig.Memory}}' | awk '{print \$1/1024/1024/1024 \" GB\"}'")
echo "Current memory limit: $NEW_LIMIT"

if echo "$NEW_LIMIT" | grep -q "2 GB"; then
    echo -e "${GREEN}✓ Memory limit successfully updated to 2GB!${NC}"
    echo ""
    echo "The frontend should now build successfully without OOM kills."
    echo "Monitor with: docker logs -f kiplombe_frontend"
else
    echo -e "${YELLOW}⚠ Memory limit may not have updated. Current: $NEW_LIMIT${NC}"
    echo "You may need to run a full redeploy: ./deploy/remote-deploy.sh"
fi

echo ""





