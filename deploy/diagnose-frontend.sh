#!/bin/bash

# Diagnostic script for frontend "Loading..." issue
# Run this on the server: ./deploy/diagnose-frontend.sh

set -e

echo "🔍 Frontend Diagnostic Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.deploy.yml" ]; then
    echo "❌ Error: docker-compose.deploy.yml not found. Please run this from the project root."
    exit 1
fi

echo "1. Checking container status..."
docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. Checking frontend container health..."
FRONTEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "no-healthcheck")
echo "   Frontend health status: $FRONTEND_STATUS"
echo ""

echo "3. Recent frontend logs (last 30 lines)..."
docker logs --tail=30 kiplombe_frontend 2>&1
echo ""

echo "4. Checking frontend environment variables..."
docker exec kiplombe_frontend printenv | grep -E "(NEXT_PUBLIC|NODE_ENV|API)" || echo "   No matching env vars found"
echo ""

echo "5. Testing API connectivity from frontend container..."
if docker exec kiplombe_frontend wget -q --spider --timeout=5 http://api:3001/ 2>&1; then
    echo "   ✅ API is reachable from frontend container"
else
    echo "   ❌ API is NOT reachable from frontend container"
fi
echo ""

echo "6. Testing API endpoint directly..."
if curl -s -o /dev/null -w "   API Status: %{http_code}\n" --max-time 5 http://localhost:3001/; then
    echo "   ✅ API is accessible on port 3001"
else
    echo "   ❌ API is NOT accessible on port 3001"
fi
echo ""

echo "7. Testing nginx proxy..."
NGINX_PORT=${NGINX_PORT:-80}
if curl -s -o /dev/null -w "   Nginx API Status: %{http_code}\n" --max-time 5 http://localhost:${NGINX_PORT}/api/ 2>/dev/null; then
    echo "   ✅ Nginx proxy is working"
else
    echo "   ⚠️  Nginx proxy test failed (might be normal if API requires auth)"
fi
echo ""

echo "8. Checking if .next build exists..."
if docker exec kiplombe_frontend test -d /app/.next; then
    echo "   ✅ .next directory exists"
    if docker exec kiplombe_frontend test -f /app/.next/BUILD_ID; then
        BUILD_ID=$(docker exec kiplombe_frontend cat /app/.next/BUILD_ID 2>/dev/null || echo "unknown")
        echo "   ✅ Build ID: $BUILD_ID"
    else
        echo "   ⚠️  BUILD_ID file not found"
    fi
else
    echo "   ❌ .next directory NOT found - build may have failed"
fi
echo ""

echo "9. Checking frontend process..."
docker exec kiplombe_frontend ps aux | grep -E "(node|next)" | head -5 || echo "   ⚠️  No node processes found"
echo ""

echo "10. Testing frontend endpoint..."
NGINX_PORT=${NGINX_PORT:-80}
if curl -s -o /dev/null -w "   Frontend Status: %{http_code}\n" --max-time 5 http://localhost:${NGINX_PORT}/ 2>&1; then
    echo "   ✅ Frontend is responding"
else
    echo "   ❌ Frontend is NOT responding"
fi
echo ""

echo "================================"
echo "Diagnostic complete!"
echo ""
echo "Common fixes:"
echo "1. If API is not reachable: docker compose -f docker-compose.deploy.yml restart api"
echo "2. If frontend is unhealthy: docker compose -f docker-compose.deploy.yml restart frontend"
echo "3. If build is missing: docker compose -f docker-compose.deploy.yml build --no-cache frontend"
echo "4. Check .env file for NEXT_PUBLIC_API_URL (should be empty or set to http://SERVER_IP:80/api)"

