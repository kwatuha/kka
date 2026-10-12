#!/bin/bash

# ============================================
# Quick Fix for 502 Bad Gateway
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
echo -e "${BLUE}502 Bad Gateway Quick Fix${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'FIX_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "${YELLOW}Step 1: Stopping all containers...${NC}"
    docker compose -f docker-compose.deploy.yml down || true

    echo -e "\n${YELLOW}Step 2: Waiting 5 seconds...${NC}"
    sleep 5

    echo -e "\n${YELLOW}Step 3: Starting containers...${NC}"
    docker compose -f docker-compose.deploy.yml up -d

    echo -e "\n${YELLOW}Step 4: Waiting for services to start (30 seconds)...${NC}"
    sleep 30

    echo -e "\n${YELLOW}Step 5: Checking container status...${NC}"
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo -e "\n${YELLOW}Step 6: Testing API health...${NC}"
    for i in {1..10}; do
        if curl -s -f http://localhost:3001/ > /dev/null 2>&1; then
            echo "   ✓ API is responding"
            break
        fi
        echo "   Waiting for API... ($i/10)"
        sleep 3
    done

    echo -e "\n${YELLOW}Step 7: Testing Frontend health...${NC}"
    FRONTEND_READY=false
    for i in {1..30}; do
        # Check if frontend container is running
        if ! docker ps | grep -q kiplombe_frontend; then
            echo "   ✗ Frontend container is not running"
            docker logs --tail=10 kiplombe_frontend 2>&1
            break
        fi

        # Check if frontend is responding inside container
        if docker exec kiplombe_frontend wget -q -O- http://localhost:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Frontend is responding on port 3000"
            FRONTEND_READY=true
            break
        fi

        # Check frontend logs for errors
        if [ $i -eq 10 ]; then
            echo "   Checking frontend logs..."
            docker logs --tail=20 kiplombe_frontend 2>&1 | grep -i error | tail -5 || echo "   No obvious errors in logs"
        fi

        echo "   Waiting for Frontend... ($i/30)"
        sleep 3
    done

    if [ "\$FRONTEND_READY" = "false" ]; then
        echo "   ⚠️  Frontend did not become ready - checking logs..."
        docker logs --tail=30 kiplombe_frontend 2>&1 | tail -15
    fi

    echo -e "\n${YELLOW}Step 8: Testing Nginx proxy...${NC}"
    # Get NGINX_PORT from .env or use default
    NGINX_PORT=\${NGINX_PORT:-80}
    if [ -f .env ]; then
        export \$(cat .env | grep -v '^#' | xargs)
        NGINX_PORT=\${NGINX_PORT:-80}
    fi

    echo "   Testing nginx on port \$NGINX_PORT..."
    if curl -s -f http://localhost:\$NGINX_PORT/ > /dev/null 2>&1; then
        echo "   ✓ Nginx proxy is working on port \$NGINX_PORT"
        echo "   Access at: http://\$(hostname -I | awk '{print \$1}'):\$NGINX_PORT/"
    else
        echo "   ✗ Nginx proxy is not working on port \$NGINX_PORT"
        echo ""
        echo "   Checking nginx logs..."
        docker logs --tail=20 kiplombe_nginx 2>&1 | tail -10
        echo ""
        echo "   Checking if nginx can reach frontend..."
        if docker exec kiplombe_nginx wget -q -O- http://frontend:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Nginx can reach frontend"
        else
            echo "   ✗ Nginx CANNOT reach frontend - network issue"
        fi
        echo ""
        echo "   Checking if nginx can reach API..."
        if docker exec kiplombe_nginx wget -q -O- http://api:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Nginx can reach API"
        else
            echo "   ✗ Nginx CANNOT reach API - network issue"
        fi
    fi

    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}Fix Complete${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo -e "${YELLOW}If still getting 502, check logs:${NC}"
    echo "   docker logs kiplombe_api"
    echo "   docker logs kiplombe_frontend"
    echo "   docker logs kiplombe_nginx"
FIX_EOF







