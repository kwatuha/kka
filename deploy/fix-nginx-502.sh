#!/bin/bash

# ============================================
# Comprehensive Fix for Nginx 502 Bad Gateway
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
echo -e "${BLUE}Nginx 502 Bad Gateway Comprehensive Fix${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'FIX_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "${YELLOW}Step 1: Checking current status...${NC}"
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    echo -e "${YELLOW}Step 2: Checking NGINX_PORT configuration...${NC}"
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    NGINX_PORT=${NGINX_PORT:-80}
    echo "   NGINX_PORT is set to: $NGINX_PORT"
    echo ""

    echo -e "${YELLOW}Step 3: Testing container connectivity...${NC}"

    # Test if frontend is running
    if docker ps | grep -q kiplombe_frontend; then
        echo "   ✓ Frontend container is running"
        if docker exec kiplombe_frontend wget -q -O- http://localhost:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Frontend is responding on port 3000"
        else
            echo "   ✗ Frontend is NOT responding on port 3000"
            echo "   Checking frontend logs..."
            docker logs --tail=30 kiplombe_frontend 2>&1 | tail -15
        fi
    else
        echo "   ✗ Frontend container is NOT running"
    fi
    echo ""

    # Test if API is running
    if docker ps | grep -q kiplombe_api; then
        echo "   ✓ API container is running"
        if docker exec kiplombe_api wget -q -O- http://localhost:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ API is responding on port 3001"
        else
            echo "   ✗ API is NOT responding on port 3001"
        fi
    else
        echo "   ✗ API container is NOT running"
    fi
    echo ""

    # Test nginx connectivity
    if docker ps | grep -q kiplombe_nginx; then
        echo "   ✓ Nginx container is running"
        echo "   Testing nginx -> frontend connectivity..."
        if docker exec kiplombe_nginx wget -q -O- http://frontend:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Nginx can reach frontend"
        else
            echo "   ✗ Nginx CANNOT reach frontend"
            echo "   This indicates a network issue - will restart containers"
        fi

        echo "   Testing nginx -> API connectivity..."
        if docker exec kiplombe_nginx wget -q -O- http://api:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Nginx can reach API"
        else
            echo "   ✗ Nginx CANNOT reach API"
        fi
    else
        echo "   ✗ Nginx container is NOT running"
    fi
    echo ""

    echo -e "${YELLOW}Step 4: Checking nginx configuration...${NC}"
    if docker exec kiplombe_nginx nginx -t 2>&1; then
        echo "   ✓ Nginx configuration is valid"
    else
        echo "   ✗ Nginx configuration has errors"
        echo "   Will reload nginx configuration"
    fi
    echo ""

    echo -e "${YELLOW}Step 5: Restarting containers to fix network issues...${NC}"
    docker compose -f docker-compose.deploy.yml restart nginx
    sleep 5

    # If frontend or API are not healthy, restart them
    if ! docker exec kiplombe_frontend wget -q -O- http://localhost:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
        echo "   Restarting frontend..."
        docker compose -f docker-compose.deploy.yml restart frontend
        sleep 10
    fi

    if ! docker exec kiplombe_api wget -q -O- http://localhost:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
        echo "   Restarting API..."
        docker compose -f docker-compose.deploy.yml restart api
        sleep 5
    fi
    echo ""

    echo -e "${YELLOW}Step 6: Waiting for services to be ready (30 seconds)...${NC}"
    sleep 30
    echo ""

    echo -e "${YELLOW}Step 7: Final connectivity test...${NC}"

    # Test frontend
    FRONTEND_OK=false
    for i in {1..10}; do
        if docker exec kiplombe_frontend wget -q -O- http://localhost:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Frontend is ready"
            FRONTEND_OK=true
            break
        fi
        sleep 2
    done

    if [ "$FRONTEND_OK" = "false" ]; then
        echo "   ✗ Frontend is still not ready after restart"
        echo "   Recent frontend logs:"
        docker logs --tail=20 kiplombe_frontend 2>&1 | tail -10
    fi

    # Test API
    if docker exec kiplombe_api wget -q -O- http://localhost:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
        echo "   ✓ API is ready"
    else
        echo "   ✗ API is still not ready after restart"
    fi

    # Test nginx proxy
    echo ""
    echo "   Testing nginx proxy on port $NGINX_PORT..."
    if curl -s -f http://localhost:$NGINX_PORT/ > /dev/null 2>&1; then
        echo "   ✓ Nginx proxy is working!"
        SERVER_IP=$(hostname -I | awk '{print $1}')
        echo ""
        echo -e "${GREEN}✅ SUCCESS! Application is accessible at:${NC}"
        echo -e "${GREEN}   http://$SERVER_IP:$NGINX_PORT/${NC}"
    else
        echo "   ✗ Nginx proxy is still not working"
        echo ""
        echo "   Checking nginx error logs:"
        docker exec kiplombe_nginx tail -20 /var/log/nginx/error.log 2>&1 | tail -10
        echo ""
        echo "   Checking nginx access logs:"
        docker exec kiplombe_nginx tail -10 /var/log/nginx/access.log 2>&1 | tail -5
    fi
    echo ""

    echo -e "${YELLOW}Step 8: Container status summary...${NC}"
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Fix Complete${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo -e "${YELLOW}If still having issues:${NC}"
    echo "1. Check logs:"
    echo "   docker logs -f kiplombe_frontend"
    echo "   docker logs -f kiplombe_api"
    echo "   docker logs -f kiplombe_nginx"
    echo ""
    echo "2. Run diagnostic script:"
    echo "   ./deploy/diagnose-nginx.sh"
    echo ""
    echo "3. If you need nginx on port 80:"
    echo "   Update .env: NGINX_PORT=80"
    echo "   docker compose -f docker-compose.deploy.yml up -d nginx"
FIX_EOF

