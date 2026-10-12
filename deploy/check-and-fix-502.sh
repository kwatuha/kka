#!/bin/bash

# Comprehensive script to check and fix 502 errors
# Usage: ./check-and-fix-502.sh [server_ip] [ssh_key]

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
else
    docker_cmd() { ssh_cmd "docker $@"; }
    run_cmd() { ssh_cmd "$@"; }
fi

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_section() {
    echo ""
    echo -e "${YELLOW}$1${NC}"
    echo "--------------------------------------------"
}

print_header "502 Error Diagnosis and Fix"

# 1. Check container status
print_section "1. Container Status"
docker_cmd ps -a --format "table {{.Names}}\t{{.Status}}" | grep -E "kiplombe|NAMES"

# 2. Check frontend
print_section "2. Frontend Status"
frontend_status=$(docker_cmd inspect --format='{{.State.Status}}' kiplombe_frontend 2>/dev/null || echo "not found")
frontend_health=$(docker_cmd inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "no-healthcheck")
echo "Status: $frontend_status"
echo "Health: $frontend_health"

# Check if frontend is listening
if docker_cmd exec kiplombe_frontend wget -q --spider --timeout=2 http://127.0.0.1:3000/ 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend is responding internally${NC}"
    frontend_ok=true
else
    echo -e "${RED}✗ Frontend is NOT responding internally${NC}"
    frontend_ok=false
fi

# 3. Check API
print_section "3. API Status"
api_status=$(docker_cmd inspect --format='{{.State.Status}}' kiplombe_api 2>/dev/null || echo "not found")
api_health=$(docker_cmd inspect --format='{{.State.Health.Status}}' kiplombe_api 2>/dev/null || echo "no-healthcheck")
echo "Status: $api_status"
echo "Health: $api_health"

if docker_cmd exec kiplombe_nginx wget -q --spider --timeout=2 http://kiplombe_api:3001/ 2>/dev/null; then
    echo -e "${GREEN}✓ API is reachable from Nginx${NC}"
    api_ok=true
else
    echo -e "${RED}✗ API is NOT reachable from Nginx${NC}"
    api_ok=false
fi

# 4. Check Nginx
print_section "4. Nginx Status"
nginx_status=$(docker_cmd inspect --format='{{.State.Status}}' kiplombe_nginx 2>/dev/null || echo "not found")
nginx_health=$(docker_cmd inspect --format='{{.State.Health.Status}}' kiplombe_nginx 2>/dev/null || echo "no-healthcheck")
echo "Status: $nginx_status"
echo "Health: $nginx_health"

# 5. Check connectivity
print_section "5. Connectivity Check"
if docker_cmd exec kiplombe_nginx wget -q --spider --timeout=2 http://kiplombe_frontend:3000/ 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx can reach Frontend${NC}"
    connectivity_ok=true
else
    echo -e "${RED}✗ Nginx CANNOT reach Frontend${NC}"
    connectivity_ok=false
fi

# 6. Check recent errors
print_section "6. Recent Errors"
echo "Nginx errors (last 5):"
docker_cmd logs --tail 50 kiplombe_nginx 2>&1 | grep -i "error\|502\|503\|504" | tail -5 || echo "No recent errors"

# 7. Fix issues
print_header "Fixing Issues"

fixed_any=false

# Fix frontend if not responding
if [ "$frontend_ok" = false ]; then
    echo ""
    echo -e "${YELLOW}Frontend is not responding. Checking logs...${NC}"
    echo "Last 20 lines of frontend logs:"
    docker_cmd logs --tail 20 kiplombe_frontend 2>&1 | tail -10

    echo ""
    echo -e "${YELLOW}Restarting frontend...${NC}"
    docker_cmd restart kiplombe_frontend
    fixed_any=true
    echo "Waiting 10 seconds for frontend to start..."
    sleep 10
fi

# Fix connectivity if nginx can't reach frontend
if [ "$connectivity_ok" = false ] && [ "$frontend_ok" = true ]; then
    echo ""
    echo -e "${YELLOW}Nginx cannot reach frontend. Restarting nginx...${NC}"
    docker_cmd restart kiplombe_nginx
    fixed_any=true
    echo "Waiting 5 seconds for nginx to restart..."
    sleep 5
fi

# Fix nginx health check
if [ "$nginx_health" = "unhealthy" ]; then
    echo ""
    echo -e "${YELLOW}Nginx health check is failing. Restarting nginx...${NC}"
    docker_cmd restart kiplombe_nginx
    fixed_any=true
    echo "Waiting 5 seconds for nginx to restart..."
    sleep 5
fi

# Final status
print_header "Final Status"

echo "Waiting 10 seconds for services to stabilize..."
sleep 10

echo ""
echo "Container Status:"
docker_cmd ps --format "table {{.Names}}\t{{.Status}}" | grep -E "kiplombe|NAMES"

echo ""
if docker_cmd exec kiplombe_nginx wget -q --spider --timeout=2 http://kiplombe_frontend:3000/ 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx can now reach Frontend${NC}"
else
    echo -e "${RED}✗ Nginx still cannot reach Frontend${NC}"
    echo ""
    echo "Frontend may still be starting. Check logs:"
    echo "  docker logs -f kiplombe_frontend"
fi

if [ "$fixed_any" = true ]; then
    echo ""
    echo -e "${GREEN}✓ Applied fixes. Wait 30-60 seconds and check if 502 errors are resolved.${NC}"
else
    echo ""
    echo -e "${GREEN}✓ No immediate fixes needed.${NC}"
fi

echo ""





