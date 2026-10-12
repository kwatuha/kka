#!/bin/bash

# Diagnostic script to check why the deployed app is not reachable
# Usage: ./deploy/diagnose.sh [SERVER_IP] [SSH_KEY_PATH]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="${SERVER_IP:-${1:-41.89.173.8}}"
SSH_KEY_PATH="${SSH_KEY_PATH:-${2:-~/.ssh/id_asusme}}"
SSH_USER="${SSH_USER:-fhir}"
APP_DIR="${APP_DIR:-~/kiplombe-hmis}"

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
APP_DIR="${APP_DIR/#\~/$HOME}"

SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Diagnosing Kiplombe HMIS Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo "Server: $SSH_USER@$SERVER_IP"
echo ""

# Test SSH connection
echo -e "${BLUE}[1] Testing SSH Connection...${NC}"
if eval "$SSH_CMD" 'echo "OK"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} SSH connection works"
else
    echo -e "${RED}✗${NC} SSH connection failed"
    exit 1
fi

# Check Docker and containers
echo -e "${BLUE}[2] Checking Docker Containers...${NC}"
eval "$SSH_CMD" << EOF
    echo "=== Running Containers ==="
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers found"

    echo ""
    echo "=== Container Health Status ==="
    for container in kiplombe_api kiplombe_frontend kiplombe_nginx kiplombe_mysql; do
        if docker ps --format "{{.Names}}" | grep -q "^${container}\$"; then
            health=\$(docker inspect --format='{{.State.Health.Status}}' ${container} 2>/dev/null || echo "no-healthcheck")
            status=\$(docker inspect --format='{{.State.Status}}' ${container} 2>/dev/null || echo "unknown")
            echo "${container}: Status=${status}, Health=${health}"
        else
            echo "${container}: Not running"
        fi
    done
EOF

# Check ports
echo ""
echo -e "${BLUE}[3] Checking Network Ports...${NC}"
eval "$SSH_CMD" << EOF
    echo "=== Listening Ports ==="
    ss -tlnp 2>/dev/null | grep -E ':(80|443|3000|3001|3306|3308|8081)' || netstat -tlnp 2>/dev/null | grep -E ':(80|443|3000|3001|3306|3308|8081)'
EOF

# Check container logs for errors
echo ""
echo -e "${BLUE}[4] Checking Frontend Container Logs (last 30 lines)...${NC}"
eval "$SSH_CMD" << EOF
    if docker ps --format "{{.Names}}" | grep -q kiplombe_frontend; then
        echo "=== Frontend Logs ==="
        docker logs --tail=30 kiplombe_frontend 2>&1 | tail -30
    else
        echo "Frontend container is not running"
    fi
EOF

echo ""
echo -e "${BLUE}[5] Checking API Container Logs (last 20 lines)...${NC}"
eval "$SSH_CMD" << EOF
    if docker ps --format "{{.Names}}" | grep -q kiplombe_api; then
        echo "=== API Logs ==="
        docker logs --tail=20 kiplombe_api 2>&1 | tail -20
    else
        echo "API container is not running"
    fi
EOF

echo ""
echo -e "${BLUE}[6] Checking Nginx Container Logs (last 20 lines)...${NC}"
eval "$SSH_CMD" << EOF
    if docker ps --format "{{.Names}}" | grep -q kiplombe_nginx; then
        echo "=== Nginx Logs ==="
        docker logs --tail=20 kiplombe_nginx 2>&1 | tail -20
    else
        echo "Nginx container is not running"
    fi
EOF

# Test internal connectivity
echo ""
echo -e "${BLUE}[7] Testing Internal Service Connectivity...${NC}"
eval "$SSH_CMD" << EOF
    echo "Testing API on port 3001:"
    if curl -f -s http://localhost:3001/ > /dev/null 2>&1; then
        echo "✓ API is responding on port 3001"
    else
        echo "✗ API is NOT responding on port 3001"
        echo "  Response: \$(curl -s http://localhost:3001/ 2>&1 | head -5)"
    fi

    echo ""
    echo "Testing Frontend on port 3000:"
    if curl -f -s http://localhost:3000/ > /dev/null 2>&1; then
        echo "✓ Frontend is responding on port 3000"
    else
        echo "✗ Frontend is NOT responding on port 3000"
        echo "  Response: \$(curl -s http://localhost:3000/ 2>&1 | head -5)"
        echo "  Error details:"
        timeout 3 curl -v http://localhost:3000/ 2>&1 | grep -E "(Connection|Failed|refused)" || true
    fi

    echo ""
    echo "Testing Nginx on port 80:"
    if curl -f -s http://localhost:80/ > /dev/null 2>&1; then
        echo "✓ Nginx is responding on port 80"
    else
        echo "✗ Nginx is NOT responding on port 80"
        echo "  Response: \$(curl -s http://localhost:80/ 2>&1 | head -10)"
    fi
EOF

# Check Docker network
echo ""
echo -e "${BLUE}[8] Checking Docker Network...${NC}"
eval "$SSH_CMD" << EOF
    echo "=== Docker Networks ==="
    docker network ls | grep kiplombe || echo "No kiplombe network found"

    echo ""
    echo "=== Network Containers ==="
    if docker network inspect kiplombe-hmis_kiplombe_network > /dev/null 2>&1 || docker network inspect kiplombe_network > /dev/null 2>&1; then
        NETWORK_NAME=\$(docker network ls --format "{{.Name}}" | grep kiplombe | head -1)
        echo "Network: \$NETWORK_NAME"
        docker network inspect \$NETWORK_NAME --format '{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}' 2>/dev/null || echo "Could not inspect network"
    else
        echo "No kiplombe network found"
    fi
EOF

# Check file permissions and project directory
echo ""
echo -e "${BLUE}[9] Checking Project Directory...${NC}"
eval "$SSH_CMD" << EOF
    cd $APP_DIR 2>/dev/null || {
        echo "✗ App directory $APP_DIR does not exist"
        exit 1
    }

    echo "✓ App directory exists: $APP_DIR"
    echo ""
    echo "=== Important Files ==="
    ls -la docker-compose.deploy.yml .env 2>/dev/null || echo "Missing docker-compose.deploy.yml or .env"

    echo ""
    echo "=== Environment Variables ==="
    if [ -f .env ]; then
        echo "NGINX_PORT: \$(grep NGINX_PORT .env || echo 'not set')"
        echo "DB_HOST: \$(grep DB_HOST .env || echo 'not set')"
        echo "NEXT_PUBLIC_API_URL: \$(grep NEXT_PUBLIC_API_URL .env || echo 'not set')"
    else
        echo ".env file not found"
    fi
EOF

# Summary and recommendations
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Diagnosis Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Common Issues and Fixes:${NC}"
echo ""
echo "1. Frontend not responding (port 3000):"
echo "   - Check: docker logs kiplombe_frontend"
echo "   - Fix: Restart container or rebuild"
echo ""
echo "2. Nginx 504 Gateway Timeout:"
echo "   - Frontend container is likely not ready"
echo "   - Check: docker logs kiplombe_frontend"
echo "   - Wait for Next.js build to complete"
echo ""
echo "3. Container unhealthy:"
echo "   - Check healthcheck logs"
echo "   - Restart: docker restart <container_name>"
echo ""
echo "4. Port conflicts:"
echo "   - Check if ports are already in use"
echo "   - Modify docker-compose.deploy.yml if needed"
echo ""
echo -e "${GREEN}To fix the deployment, run:${NC}"
echo "  ./deploy/remote-deploy.sh $SERVER_IP $SSH_KEY_PATH"
echo ""








