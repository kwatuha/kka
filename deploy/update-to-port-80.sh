#!/bin/bash

# ============================================
# Update Server to Use Port 80
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
echo -e "${BLUE}Updating Server to Use Port 80${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'UPDATE_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "${YELLOW}Step 1: Checking current NGINX_PORT setting...${NC}"
    if [ -f .env ]; then
        CURRENT_PORT=$(grep NGINX_PORT .env | cut -d '=' -f2 || echo "not set")
        echo "   Current NGINX_PORT: $CURRENT_PORT"
    else
        echo "   .env file not found - will create one"
        CURRENT_PORT="not set"
    fi
    echo ""

    echo -e "${YELLOW}Step 2: Updating .env file...${NC}"
    if [ -f .env ]; then
        # Update or add NGINX_PORT=80
        if grep -q "^NGINX_PORT=" .env; then
            sed -i 's/^NGINX_PORT=.*/NGINX_PORT=80/' .env
            echo "   ✓ Updated NGINX_PORT to 80 in .env"
        else
            echo "NGINX_PORT=80" >> .env
            echo "   ✓ Added NGINX_PORT=80 to .env"
        fi
    else
        echo "NGINX_PORT=80" > .env
        echo "   ✓ Created .env file with NGINX_PORT=80"
    fi
    echo ""

    echo -e "${YELLOW}Step 3: Checking if port 80 is available...${NC}"
    if sudo netstat -tlnp 2>/dev/null | grep -q ":80 " || ss -tlnp 2>/dev/null | grep -q ":80 "; then
        PORT_80_USER=$(sudo netstat -tlnp 2>/dev/null | grep ":80 " | awk '{print $7}' | head -1 || \
                       sudo ss -tlnp 2>/dev/null | grep ":80 " | awk '{print $6}' | head -1 || \
                       echo "unknown")
        if echo "$PORT_80_USER" | grep -q "kiplombe\|nginx\|docker"; then
            echo "   ✓ Port 80 is already in use by our nginx container"
        else
            echo "   ⚠️  Port 80 is in use by: $PORT_80_USER"
            echo "   You may need to stop that service first"
        fi
    else
        echo "   ✓ Port 80 is available"
    fi
    echo ""

    echo -e "${YELLOW}Step 4: Restarting nginx with new port configuration...${NC}"
    docker compose -f docker-compose.deploy.yml down nginx 2>/dev/null || true
    sleep 2

    # Export the new port
    export NGINX_PORT=80
    docker compose -f docker-compose.deploy.yml up -d nginx

    echo "   Waiting for nginx to start..."
    sleep 5
    echo ""

    echo -e "${YELLOW}Step 5: Verifying nginx is running on port 80...${NC}"
    if docker ps | grep -q kiplombe_nginx; then
        echo "   ✓ Nginx container is running"

        # Check port mapping
        PORT_MAPPING=$(docker port kiplombe_nginx 80 2>/dev/null | cut -d ':' -f2 || echo "not mapped")
        echo "   Port mapping: $PORT_MAPPING"

        if [ "$PORT_MAPPING" = "80" ]; then
            echo "   ✓ Nginx is correctly mapped to port 80"
        else
            echo "   ⚠️  Nginx is mapped to port $PORT_MAPPING, not 80"
        fi
    else
        echo "   ✗ Nginx container is not running"
        echo "   Checking logs..."
        docker logs --tail=20 kiplombe_nginx 2>&1 | tail -10
    fi
    echo ""

    echo -e "${YELLOW}Step 6: Testing nginx on port 80...${NC}"
    if curl -s -f http://localhost:80/ > /dev/null 2>&1; then
        echo "   ✓ Nginx is responding on port 80!"
        SERVER_IP=$(hostname -I | awk '{print $1}')
        echo ""
        echo -e "${GREEN}✅ SUCCESS! Application is now accessible at:${NC}"
        echo -e "${GREEN}   http://$SERVER_IP/${NC}"
        echo -e "${GREEN}   http://$SERVER_IP:80/${NC}"
    else
        echo "   ✗ Nginx is not responding on port 80"
        echo ""
        echo "   Checking nginx logs..."
        docker logs --tail=20 kiplombe_nginx 2>&1 | tail -10
        echo ""
        echo "   Checking if nginx can reach frontend..."
        if docker exec kiplombe_nginx wget -q -O- http://frontend:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
            echo "   ✓ Nginx can reach frontend"
        else
            echo "   ✗ Nginx cannot reach frontend - restarting frontend..."
            docker compose -f docker-compose.deploy.yml restart frontend
            sleep 10
        fi
    fi
    echo ""

    echo -e "${YELLOW}Step 7: Final container status...${NC}"
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Update Complete${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Test the application: http://$SERVER_IP/"
    echo "2. If you still see issues, run: ./deploy/fix-nginx-502.sh"
    echo "3. Check logs if needed:"
    echo "   docker logs -f kiplombe_nginx"
    echo "   docker logs -f kiplombe_frontend"
UPDATE_EOF







