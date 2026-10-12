#!/bin/bash

# Comprehensive Nginx 502 Diagnostic Script
# Run this on the server to diagnose nginx proxy issues

set -e

echo "🔍 Nginx 502 Diagnostic Script"
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

echo "2. Checking if containers are on the same network..."
docker network inspect kiplombe_network 2>/dev/null | grep -A 5 "Containers" || echo "   ⚠️  Network not found or no containers"
echo ""

echo "3. Testing frontend container directly..."
if docker exec kiplombe_frontend wget -q -O- http://localhost:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
    echo "   ✅ Frontend is responding on port 3000 inside container"
else
    echo "   ❌ Frontend is NOT responding on port 3000 inside container"
    echo "   Checking frontend logs..."
    docker logs --tail=20 kiplombe_frontend 2>&1 | tail -10
fi
echo ""

echo "4. Testing API container directly..."
if docker exec kiplombe_api wget -q -O- http://localhost:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
    echo "   ✅ API is responding on port 3001 inside container"
else
    echo "   ❌ API is NOT responding on port 3001 inside container"
    echo "   Checking API logs..."
    docker logs --tail=20 kiplombe_api 2>&1 | tail -10
fi
echo ""

echo "5. Testing nginx can reach frontend..."
if docker exec kiplombe_nginx wget -q -O- http://frontend:3000/ 2>&1 | head -1 > /dev/null 2>&1; then
    echo "   ✅ Nginx can reach frontend container"
else
    echo "   ❌ Nginx CANNOT reach frontend container"
    echo "   This is likely a network issue"
fi
echo ""

echo "6. Testing nginx can reach API..."
if docker exec kiplombe_nginx wget -q -O- http://api:3001/ 2>&1 | head -1 > /dev/null 2>&1; then
    echo "   ✅ Nginx can reach API container"
else
    echo "   ❌ Nginx CANNOT reach API container"
    echo "   This is likely a network issue"
fi
echo ""

echo "7. Checking nginx configuration..."
if docker exec kiplombe_nginx nginx -t 2>&1; then
    echo "   ✅ Nginx configuration is valid"
else
    echo "   ❌ Nginx configuration has errors"
fi
echo ""

echo "8. Checking nginx error logs..."
echo "   Recent nginx errors:"
docker exec kiplombe_nginx tail -20 /var/log/nginx/error.log 2>&1 || echo "   ⚠️  Could not read error log"
echo ""

echo "9. Checking nginx access logs..."
echo "   Recent nginx access:"
docker exec kiplombe_nginx tail -10 /var/log/nginx/access.log 2>&1 || echo "   ⚠️  Could not read access log"
echo ""

echo "10. Testing nginx from host..."
NGINX_PORT=$(grep NGINX_PORT .env 2>/dev/null | cut -d '=' -f2 || echo "80")
if curl -s -o /dev/null -w "   Status: %{http_code}\n" --max-time 5 http://localhost:${NGINX_PORT}/ 2>&1; then
    echo "   ✅ Nginx is responding on port ${NGINX_PORT}"
else
    echo "   ❌ Nginx is NOT responding on port ${NGINX_PORT}"
    echo "   Try accessing: http://$(hostname -I | awk '{print $1}'):${NGINX_PORT}/"
fi
echo ""

echo "11. Checking port mappings..."
echo "   Nginx port mapping:"
docker port kiplombe_nginx 2>&1 || echo "   ⚠️  Could not get port mapping"
echo ""

echo "12. Checking if port 80 is in use..."
if sudo netstat -tlnp | grep :80 > /dev/null 2>&1; then
    echo "   ⚠️  Port 80 is in use:"
    sudo netstat -tlnp | grep :80
    echo "   This might be why you can't access on port 80"
else
    echo "   ✅ Port 80 is available"
fi
echo ""

echo "================================"
echo "Diagnostic Summary"
echo "================================"
echo ""
echo "If nginx is on port ${NGINX_PORT}, access the site at:"
echo "   http://$(hostname -I | awk '{print $1}'):${NGINX_PORT}/"
echo ""
echo "Common fixes:"
echo "1. If containers can't reach each other:"
echo "   docker compose -f docker-compose.deploy.yml down"
echo "   docker compose -f docker-compose.deploy.yml up -d"
echo ""
echo "2. If frontend is not responding:"
echo "   docker logs -f kiplombe_frontend"
echo "   docker compose -f docker-compose.deploy.yml restart frontend"
echo ""
echo "3. If you need to change the port:"
echo "   Update .env: NGINX_PORT=<desired_port>"
echo "   docker compose -f docker-compose.deploy.yml up -d nginx"

