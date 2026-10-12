#!/bin/bash

# Fast Deployment Script - Updates code without full container rebuild
# This script is much faster than full rebuilds for code changes

set -e

echo "🚀 Starting Fast Deployment (Code Update Only)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
fi

# Check if containers are already running
if docker ps | grep -q "kiplombe_frontend"; then
    echo "🔄 Restarting frontend container to pick up code changes..."
    docker restart kiplombe_frontend
    
    echo "⏳ Waiting for frontend to rebuild Next.js (this takes ~30-60 seconds)..."
    sleep 5
    
    # Wait for frontend to be ready
    echo "⏳ Waiting for services to be ready..."
    for i in {1..30}; do
        if docker exec kiplombe_frontend wget --quiet --tries=1 --spider http://127.0.0.1:3000/ 2>/dev/null; then
            echo -e "${GREEN}✓ Frontend is ready!${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    echo -e "${GREEN}✅ Fast deployment complete!${NC}"
    echo ""
    echo "📝 Note: If you changed dependencies (package.json), you may need to:"
    echo "   1. docker-compose -f docker-compose.deploy-fast.yml down"
    echo "   2. docker-compose -f docker-compose.deploy-fast.yml up -d"
    echo ""
else
    echo "📦 First time setup - building containers..."
    docker compose -f docker-compose.deploy-fast.yml up -d --build
    
    echo "⏳ Waiting for services to be healthy..."
    sleep 15
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
fi

echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}'):${NGINX_PORT:-8081}"
echo "   API: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker logs -f kiplombe_frontend"
echo "   Restart: docker restart kiplombe_frontend"
echo "   Status: docker ps | grep kiplombe"

