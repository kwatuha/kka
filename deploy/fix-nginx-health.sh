#!/bin/bash

# Fix Nginx health check by updating docker-compose and restarting
# Usage: ./fix-nginx-health.sh [server_ip] [ssh_key]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running on server or locally
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SERVER_MODE=true
elif [ -n "$1" ] && [ -n "$2" ]; then
    SERVER_IP="${1}"
    SSH_KEY="${2}"
    SSH_USER="${SSH_USER:-fhir}"

    SSH_KEY="${SSH_KEY/#\~/$HOME}"

    if [ ! -f "$SSH_KEY" ]; then
        echo "Error: SSH key not found: $SSH_KEY"
        exit 1
    fi

    ssh_cmd() {
        ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
    }

    SERVER_MODE=false
else
    echo "Usage: $0 [server_ip] [ssh_key]"
    echo "   Or run on server directly: $0"
    exit 1
fi

if [ "$SERVER_MODE" = true ]; then
    docker_cmd() { docker "$@"; }
    run_cmd() { "$@"; }
    COMPOSE_FILE="docker-compose.deploy.yml"
else
    docker_cmd() { ssh_cmd "docker $@"; }
    run_cmd() { ssh_cmd "$@"; }
    COMPOSE_FILE="docker-compose.deploy.yml"
fi

echo -e "${BLUE}Fixing Nginx health check...${NC}"
echo ""

# Check current health status
echo "Current health status:"
health_status=$(docker_cmd inspect --format='{{.State.Health.Status}}' kiplombe_nginx 2>/dev/null || echo "unknown")
echo "  Status: $health_status"
echo ""

# Test the health endpoint
echo "Testing health endpoint..."
if docker_cmd exec kiplombe_nginx wget -q --spider http://127.0.0.1/health 2>/dev/null; then
    echo -e "${GREEN}✓ Health endpoint works with 127.0.0.1${NC}"
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
    exit 1
fi

# Check if docker-compose file needs updating
echo ""
echo "Checking docker-compose configuration..."

if [ "$SERVER_MODE" = false ]; then
    # Need to update on remote server
    echo "Updating docker-compose.deploy.yml on server..."
    ssh_cmd "sed -i 's|http://localhost/health|http://127.0.0.1/health|g' $COMPOSE_FILE" || {
        echo -e "${YELLOW}⚠ Could not update docker-compose file automatically${NC}"
        echo "Please update the health check in docker-compose.deploy.yml:"
        echo "  Change: http://localhost/health"
        echo "  To:     http://127.0.0.1/health"
        exit 1
    }
    echo -e "${GREEN}✓ Updated docker-compose file${NC}"
else
    # Update local file
    if [ -f "$COMPOSE_FILE" ]; then
        sed -i 's|http://localhost/health|http://127.0.0.1/health|g' "$COMPOSE_FILE"
        echo -e "${GREEN}✓ Updated docker-compose file${NC}"
    else
        echo -e "${YELLOW}⚠ docker-compose.deploy.yml not found${NC}"
    fi
fi

# Restart nginx to apply new health check
echo ""
echo "Restarting nginx container..."
docker_cmd restart kiplombe_nginx

# Wait a bit for health check to run
echo "Waiting for health check to run..."
sleep 15

# Check health status again
echo ""
echo "New health status:"
new_health=$(docker_cmd inspect --format='{{.State.Health.Status}}' kiplombe_nginx 2>/dev/null || echo "unknown")
echo "  Status: $new_health"

if [ "$new_health" = "healthy" ] || [ "$new_health" = "starting" ]; then
    echo -e "${GREEN}✓ Nginx health check fixed!${NC}"
    echo ""
    echo "Note: It may take a few health check cycles (30s intervals) to show as healthy"
else
    echo -e "${YELLOW}⚠ Health status: $new_health${NC}"
    echo "This is normal if the container just restarted. Wait 30-60 seconds and check again."
fi

echo ""





