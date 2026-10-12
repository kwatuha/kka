#!/bin/bash

# Kiplombe HMIS Deployment Script
# This script deploys the application to the server

set -e  # Exit on error

echo "🚀 Starting Kiplombe HMIS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp deploy/.env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration before continuing!${NC}"
    echo -e "${RED}❌ Deployment cancelled. Please configure .env file and run again.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Stop existing containers if running
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.deploy.yml down || true

# Build images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.deploy.yml build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.deploy.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.deploy.yml ps

# Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.deploy.yml logs --tail=20

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}'):${NGINX_PORT:-8081}"
echo "   API: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.deploy.yml logs -f"
echo "   Stop: docker-compose -f docker-compose.deploy.yml down"
echo "   Restart: docker-compose -f docker-compose.deploy.yml restart"
echo "   Status: docker-compose -f docker-compose.deploy.yml ps"


