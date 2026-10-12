#!/bin/bash

# Auto-healing script for containers
# Can be run manually or via cron to automatically fix common issues
# Usage: ./auto-heal-containers.sh [server_ip] [ssh_key]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running on server or locally
# Check if docker command is available and we can access containers directly
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SERVER_MODE=true
elif [ -n "$1" ] && [ -n "$2" ]; then
    # Running locally with SSH credentials
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
    # Assume running on server
    SERVER_MODE=true
fi

if [ "$SERVER_MODE" = true ]; then
    docker_cmd() { docker "$@"; }
else
    docker_cmd() { ssh_cmd "docker $@"; }
fi

containers=("kiplombe_nginx" "kiplombe_frontend" "kiplombe_api" "kiplombe_mysql")
fixed_any=false

echo -e "${BLUE}Auto-healing containers...${NC}"
echo ""

# Function to check if container is healthy
is_healthy() {
    local container=$1
    local status=$(docker_cmd inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    local health=$(docker_cmd inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")

    if [ "$status" != "running" ]; then
        return 1
    fi

    if [ "$health" = "unhealthy" ]; then
        return 1
    fi

    return 0
}

# Function to restart container
restart_container() {
    local container=$1
    echo -e "${YELLOW}Restarting $container...${NC}"
    docker_cmd restart "$container" >/dev/null 2>&1
    sleep 5
    if is_healthy "$container"; then
        echo -e "${GREEN}✓ $container is now healthy${NC}"
        fixed_any=true
    else
        echo -e "${RED}✗ $container still unhealthy after restart${NC}"
    fi
}

# Check each container
for container in "${containers[@]}"; do
    if ! is_healthy "$container"; then
        echo -e "${RED}✗ $container is unhealthy or not running${NC}"
        restart_container "$container"
    else
        echo -e "${GREEN}✓ $container is healthy${NC}"
    fi
done

# Check Nginx -> Frontend connectivity
echo ""
echo -e "${BLUE}Checking connectivity...${NC}"
if ! docker_cmd exec kiplombe_nginx wget -q --spider --timeout=5 http://kiplombe_frontend:3000/ 2>/dev/null; then
    echo -e "${YELLOW}⚠ Nginx cannot reach frontend, restarting nginx...${NC}"
    docker_cmd restart kiplombe_nginx >/dev/null 2>&1
    fixed_any=true
    sleep 3
fi

# Check Nginx -> API connectivity
if ! docker_cmd exec kiplombe_nginx wget -q --spider --timeout=5 http://kiplombe_api:3001/ 2>/dev/null; then
    echo -e "${YELLOW}⚠ Nginx cannot reach API, restarting nginx...${NC}"
    docker_cmd restart kiplombe_nginx >/dev/null 2>&1
    fixed_any=true
    sleep 3
fi

# Check disk space
echo ""
echo -e "${BLUE}Checking disk space...${NC}"
if [ "$SERVER_MODE" = true ]; then
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
else
    disk_usage=$(ssh_cmd "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
fi

if [ "$disk_usage" -gt 90 ]; then
    echo -e "${RED}⚠ Disk usage is ${disk_usage}% - cleaning up Docker...${NC}"
    docker_cmd system prune -f >/dev/null 2>&1
    fixed_any=true
fi

# Summary
echo ""
if [ "$fixed_any" = true ]; then
    echo -e "${GREEN}✓ Auto-healing completed - some issues were fixed${NC}"
    echo "   Wait 30 seconds and check if the application is working"
else
    echo -e "${GREEN}✓ All containers are healthy${NC}"
fi

echo ""

