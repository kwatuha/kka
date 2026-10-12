#!/bin/bash

# Fix frontend memory issues by increasing memory limit
# Usage: ./fix-frontend-memory.sh [server_ip] [ssh_key]

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

echo -e "${BLUE}Fixing Frontend Memory Issues...${NC}"
echo ""

# Find docker-compose file
COMPOSE_FILE=$(ssh_cmd "find ~ -name 'docker-compose.deploy.yml' -type f 2>/dev/null | grep -v backup | head -1")

if [ -z "$COMPOSE_FILE" ]; then
    echo -e "${RED}✗ docker-compose.deploy.yml not found${NC}"
    exit 1
fi

echo "Found docker-compose file: $COMPOSE_FILE"
echo ""

# Check current memory limit
echo "Current memory limit:"
ssh_cmd "grep -A 3 'memory:' $COMPOSE_FILE | grep -A 3 frontend | grep -E 'memory:|limits:' | head -2" || echo "Could not read current limit"

echo ""
echo -e "${YELLOW}Updating memory limit to 2GB...${NC}"

# Update memory limit in docker-compose file
ssh_cmd "sed -i 's/memory: 1G  # Frontend/memory: 2G  # Frontend - Increased to prevent OOM kills/g' $COMPOSE_FILE" 2>/dev/null || \
ssh_cmd "sed -i '/kiplombe_frontend/,/memory: 1G/s/memory: 1G/memory: 2G  # Increased to prevent OOM kills/' $COMPOSE_FILE" 2>/dev/null || \
ssh_cmd "sed -i 's/limits:/&\n          memory: 2G/' $COMPOSE_FILE" 2>/dev/null || {
    echo -e "${YELLOW}⚠ Could not automatically update docker-compose file${NC}"
    echo "Please manually update $COMPOSE_FILE:"
    echo "  Change: memory: 1G (under frontend deploy.resources.limits)"
    echo "  To:     memory: 2G"
    exit 1
}

echo -e "${GREEN}✓ Updated docker-compose file${NC}"
echo ""

# Restart frontend with new memory limit
echo "Restarting frontend with new memory limit..."
ssh_cmd "cd $(dirname $COMPOSE_FILE) && docker compose -f docker-compose.deploy.yml up -d --force-recreate frontend"

echo ""
echo -e "${GREEN}✓ Frontend restarted with 2GB memory limit${NC}"
echo ""
echo "The build should now complete without being killed."
echo "Monitor with: docker logs -f kiplombe_frontend"
echo ""





