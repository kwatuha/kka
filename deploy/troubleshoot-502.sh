#!/bin/bash

# ============================================
# 502 Bad Gateway Troubleshooting Script
# ============================================

set -e

SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}502 Bad Gateway Troubleshooting${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'DIAG_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "\n${YELLOW}1. Checking Docker containers status...${NC}"
    docker ps -a --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo -e "\n${YELLOW}2. Checking if containers are running...${NC}"
    if docker ps --filter "name=kiplombe_nginx" --format "{{.Names}}" | grep -q "kiplombe_nginx"; then
        echo "   ✓ Nginx container is running"
    else
        echo "   ✗ Nginx container is NOT running"
    fi

    if docker ps --filter "name=kiplombe_api" --format "{{.Names}}" | grep -q "kiplombe_api"; then
        echo "   ✓ API container is running"
    else
        echo "   ✗ API container is NOT running"
    fi

    if docker ps --filter "name=kiplombe_frontend" --format "{{.Names}}" | grep -q "kiplombe_frontend"; then
        echo "   ✓ Frontend container is running"
    else
        echo "   ✗ Frontend container is NOT running"
    fi

    echo -e "\n${YELLOW}3. Checking container health...${NC}"
    docker inspect kiplombe_api --format='{{.State.Health.Status}}' 2>/dev/null || echo "   API health check not available"
    docker inspect kiplombe_frontend --format='{{.State.Health.Status}}' 2>/dev/null || echo "   Frontend health check not available"

    echo -e "\n${YELLOW}4. Testing internal connectivity...${NC}"
    echo "   Testing API from nginx container:"
    docker exec kiplombe_nginx wget -q --spider --timeout=5 http://api:3001/ || echo "   ✗ Cannot reach API from nginx"

    echo "   Testing Frontend from nginx container:"
    docker exec kiplombe_nginx wget -q --spider --timeout=5 http://frontend:3000/ || echo "   ✗ Cannot reach Frontend from nginx"

    echo -e "\n${YELLOW}5. Checking API logs (last 20 lines)...${NC}"
    docker logs --tail=20 kiplombe_api 2>&1 | tail -20 || echo "   No API logs available"

    echo -e "\n${YELLOW}6. Checking Frontend logs (last 20 lines)...${NC}"
    docker logs --tail=20 kiplombe_frontend 2>&1 | tail -20 || echo "   No Frontend logs available"

    echo -e "\n${YELLOW}7. Checking Nginx logs (last 20 lines)...${NC}"
    docker logs --tail=20 kiplombe_nginx 2>&1 | tail -20 || echo "   No Nginx logs available"

    echo -e "\n${YELLOW}8. Checking network connectivity...${NC}"
    docker network inspect kiplombe_network 2>/dev/null | grep -A 5 "Containers" || echo "   Network not found or no containers connected"

    echo -e "\n${YELLOW}9. Testing API directly (port 3001)...${NC}"
    curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" http://localhost:3001/ || echo "   ✗ Cannot reach API on port 3001"

    echo -e "\n${YELLOW}10. Testing Frontend directly (port 3000)...${NC}"
    curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" http://localhost:3000/ || echo "   ✗ Cannot reach Frontend on port 3000"

    echo -e "\n${YELLOW}11. Checking Nginx configuration...${NC}"
    docker exec kiplombe_nginx nginx -t 2>&1 || echo "   ✗ Nginx configuration has errors"

    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}Diagnostics Complete${NC}"
    echo -e "${GREEN}============================================${NC}\n"
DIAG_EOF













