#!/bin/bash

# Investigate 504 Gateway Time-out error
# Usage: ./deploy/investigate-504.sh SERVER_IP SSH_KEY_PATH

set -e

SERVER_IP="${1:-41.89.173.8}"
SSH_KEY="${2:-~/.ssh/id_asusme}"

if [ -z "$SERVER_IP" ]; then
    echo "❌ ERROR: Server IP is required"
    echo "Usage: $0 SERVER_IP [SSH_KEY_PATH]"
    exit 1
fi

echo "============================================"
echo "Investigating 504 Gateway Time-out"
echo "Server: $SERVER_IP"
echo "============================================"
echo ""

# Detect SSH user from key or use default
SSH_USER="${SSH_USER:-fhir}"

# Function to run SSH command
ssh_cmd() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
}

echo "🔍 Step 1: Checking Docker container status..."
echo "--------------------------------------------"
ssh_cmd "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'kiplombe|NAME' || docker ps -a"
echo ""

echo "🔍 Step 2: Checking container logs (last 50 lines)..."
echo "--------------------------------------------"
echo ""
echo "--- Nginx Logs ---"
ssh_cmd "docker logs --tail 50 kiplombe_nginx 2>&1 | tail -30" || echo "⚠️  Nginx container not found or no logs"
echo ""

echo "--- API Logs ---"
ssh_cmd "docker logs --tail 50 kiplombe_api 2>&1 | tail -30" || echo "⚠️  API container not found or no logs"
echo ""

echo "--- Frontend Logs ---"
ssh_cmd "docker logs --tail 50 kiplombe_frontend 2>&1 | tail -30" || echo "⚠️  Frontend container not found or no logs"
echo ""

echo "🔍 Step 3: Checking container resource usage..."
echo "--------------------------------------------"
ssh_cmd "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' | grep -E 'kiplombe|CONTAINER' || docker stats --no-stream"
echo ""

echo "🔍 Step 4: Checking Nginx configuration..."
echo "--------------------------------------------"
ssh_cmd "docker exec kiplombe_nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -E 'proxy_read_timeout|proxy_connect_timeout|proxy_send_timeout|upstream|server_name' || echo '⚠️  Could not read Nginx config'"
echo ""

echo "🔍 Step 5: Testing internal connectivity..."
echo "--------------------------------------------"
echo "Testing API container from host..."
ssh_cmd "docker exec kiplombe_api curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/health || echo 'API not responding on port 3001'"
echo ""

echo "Testing Frontend container from host..."
ssh_cmd "docker exec kiplombe_frontend curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'Frontend not responding on port 3000'"
echo ""

echo "Testing Nginx -> API proxy..."
ssh_cmd "docker exec kiplombe_nginx curl -s -o /dev/null -w '%{http_code}' http://kiplombe_api:3001/api/health || echo 'Nginx cannot reach API'"
echo ""

echo "Testing Nginx -> Frontend proxy..."
ssh_cmd "docker exec kiplombe_nginx curl -s -o /dev/null -w '%{http_code}' http://kiplombe_frontend:3000 || echo 'Nginx cannot reach Frontend'"
echo ""

echo "🔍 Step 6: Checking network connectivity..."
echo "--------------------------------------------"
ssh_cmd "docker network inspect kiplombe_network 2>/dev/null | grep -A 10 'Containers' || docker network ls | grep kiplombe || echo '⚠️  Network check failed'"
echo ""

echo "🔍 Step 7: Checking port bindings..."
echo "--------------------------------------------"
NGINX_PORT=$(ssh_cmd "grep NGINX_PORT /root/kiplombe-hmis/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' ' || echo '80'")
echo "Nginx port from .env: ${NGINX_PORT:-80}"
ssh_cmd "netstat -tlnp | grep ':${NGINX_PORT:-80}' || ss -tlnp | grep ':${NGINX_PORT:-80}' || echo '⚠️  Port ${NGINX_PORT:-80} not found'"
echo ""

echo "🔍 Step 8: Checking MySQL status..."
echo "--------------------------------------------"
ssh_cmd "docker exec kiplombe_mysql mysqladmin ping -h localhost 2>/dev/null || echo '⚠️  MySQL not responding'"
echo ""

echo "ℹ️  Note: Using SSH user: $SSH_USER"
echo "   If you need a different user, set: SSH_USER=username $0 $SERVER_IP $SSH_KEY"
echo ""

echo "🔍 Step 9: Checking disk space..."
echo "--------------------------------------------"
ssh_cmd "df -h | grep -E 'Filesystem|/dev/'"
echo ""

echo "🔍 Step 10: Checking system memory..."
echo "--------------------------------------------"
ssh_cmd "free -h"
echo ""

echo "🔍 Step 11: Checking recent errors in system logs..."
echo "--------------------------------------------"
ssh_cmd "journalctl -u docker --since '1 hour ago' --no-pager | tail -20 || dmesg | tail -20 || echo '⚠️  Could not read system logs'"
echo ""

echo "🔍 Step 12: Testing external endpoint..."
echo "--------------------------------------------"
echo "Testing from server itself..."
ssh_cmd "curl -s -o /dev/null -w 'HTTP Status: %{http_code}, Time: %{time_total}s\n' http://localhost:${NGINX_PORT:-80} || echo '⚠️  Cannot connect to localhost:${NGINX_PORT:-80}'"
echo ""

echo "============================================"
echo "Investigation Complete"
echo "============================================"
echo ""
echo "📋 Summary of common 504 causes:"
echo "1. Backend API container is down or not responding"
echo "2. Nginx timeout settings too low (default: 60s)"
echo "3. Database connection issues causing API hangs"
echo "4. Container out of memory or CPU"
echo "5. Network connectivity issues between containers"
echo "6. Frontend build failed or container crashed"
echo ""
echo "🔧 Next steps:"
echo "- Check container logs above for errors"
echo "- Verify containers are running: docker ps"
echo "- Check Nginx timeout settings in docker-compose"
echo "- Restart containers if needed: docker-compose restart"
echo "- Check database connectivity if API is slow"
echo ""

