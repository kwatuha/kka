#!/bin/bash

# Test connection script - Verify all services are accessible

set -e

echo "🔍 Testing Kiplombe HMIS Services..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

NGINX_PORT=${NGINX_PORT:-8081}
API_PORT=${API_PORT:-3001}

# Test functions
test_service() {
    local name=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name: Accessible at $url"
        return 0
    else
        echo -e "${RED}✗${NC} $name: Not accessible at $url"
        return 1
    fi
}

# Check containers
echo "📦 Checking Docker containers..."
if docker ps | grep -q kiplombe_api; then
    echo -e "${GREEN}✓${NC} API container: Running"
else
    echo -e "${RED}✗${NC} API container: Not running"
fi

if docker ps | grep -q kiplombe_frontend; then
    echo -e "${GREEN}✓${NC} Frontend container: Running"
else
    echo -e "${RED}✗${NC} Frontend container: Not running"
fi

if docker ps | grep -q kiplombe_nginx; then
    echo -e "${GREEN}✓${NC} Nginx container: Running"
else
    echo -e "${RED}✗${NC} Nginx container: Not running"
fi

echo ""

# Test API
echo "🌐 Testing API..."
test_service "API Health" "http://localhost:${API_PORT}/"

# Test Frontend via Nginx
echo "🌐 Testing Frontend..."
test_service "Frontend (via Nginx)" "http://localhost:${NGINX_PORT}/"

# Test API via Nginx
test_service "API (via Nginx)" "http://localhost:${NGINX_PORT}/api/"

echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.deploy.yml ps

echo ""
echo "📋 Recent Logs (last 10 lines):"
docker-compose -f docker-compose.deploy.yml logs --tail=10


