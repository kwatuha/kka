#!/bin/bash

# Fix 504 Gateway Time-out by increasing Nginx timeouts and checking container health
# Usage: ./deploy/fix-504-timeout.sh SERVER_IP SSH_KEY_PATH

set -e

SERVER_IP="${1:-41.89.173.8}"
SSH_KEY="${2:-~/.ssh/id_asusme}"

if [ -z "$SERVER_IP" ]; then
    echo "❌ ERROR: Server IP is required"
    echo "Usage: $0 SERVER_IP [SSH_KEY_PATH]"
    exit 1
fi

echo "============================================"
echo "Fixing 504 Gateway Time-out"
echo "Server: $SERVER_IP"
echo "============================================"
echo ""

# Detect SSH user from key or use default (matching deployment script)
SSH_USER="${SSH_USER:-fhir}"

# Function to run SSH command
ssh_cmd() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
}

echo "🔍 Step 1: Checking current container status..."
echo "--------------------------------------------"
CONTAINERS=$(ssh_cmd "docker ps -a --format '{{.Names}}' | grep kiplombe || echo ''")
if [ -z "$CONTAINERS" ]; then
    echo "❌ ERROR: No kiplombe containers found!"
    exit 1
fi
echo "Found containers: $CONTAINERS"
echo ""

echo "🔍 Step 2: Checking container health..."
echo "--------------------------------------------"
ssh_cmd "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'kiplombe|NAME' || docker ps"
echo ""

echo "🔧 Step 3: Restarting unhealthy containers..."
echo "--------------------------------------------"
# Restart containers if they're unhealthy or restarting
UNHEALTHY=$(ssh_cmd "docker ps --filter 'health=unhealthy' --format '{{.Names}}' | grep kiplombe || echo ''")
RESTARTING=$(ssh_cmd "docker ps --filter 'status=restarting' --format '{{.Names}}' | grep kiplombe || echo ''")

if [ ! -z "$UNHEALTHY" ] || [ ! -z "$RESTARTING" ]; then
    echo "Found unhealthy/restarting containers, restarting..."
    ssh_cmd "cd /root/kiplombe-hmis && docker-compose -f docker-compose.deploy.yml restart" || \
    ssh_cmd "docker restart kiplombe_api kiplombe_frontend kiplombe_nginx 2>/dev/null || true"
    echo "⏳ Waiting 10 seconds for containers to start..."
    sleep 10
else
    echo "✓ All containers appear healthy"
fi
echo ""

echo "🔧 Step 4: Checking and updating Nginx timeout settings..."
echo "--------------------------------------------"

# Check if nginx config exists in docker-compose
NGINX_CONFIG=$(ssh_cmd "cd /root/kiplombe-hmis && grep -A 20 'nginx:' docker-compose.deploy.yml 2>/dev/null | grep -E 'command:|proxy_read_timeout|proxy_connect_timeout' || echo ''")

if [ ! -z "$NGINX_CONFIG" ]; then
    echo "Found Nginx configuration in docker-compose"
else
    echo "Checking for custom Nginx configuration..."
fi

# Create/update Nginx config with increased timeouts
echo "Updating Nginx configuration with increased timeouts..."
ssh_cmd "cat > /tmp/nginx-timeout-fix.conf << 'EOF'
# Increase proxy timeouts to prevent 504 errors
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
send_timeout 300s;
fastcgi_send_timeout 300s;
fastcgi_read_timeout 300s;
EOF
"

# Try to update nginx config inside container
echo "Attempting to update Nginx configuration in container..."
ssh_cmd "docker exec kiplombe_nginx sh -c 'echo \"proxy_connect_timeout 300s;\" >> /etc/nginx/conf.d/timeout.conf && echo \"proxy_send_timeout 300s;\" >> /etc/nginx/conf.d/timeout.conf && echo \"proxy_read_timeout 300s;\" >> /etc/nginx/conf.d/timeout.conf' 2>/dev/null || echo '⚠️  Could not update Nginx config directly'"

echo ""

echo "🔧 Step 5: Restarting Nginx to apply changes..."
echo "--------------------------------------------"
ssh_cmd "docker restart kiplombe_nginx || docker-compose -f /root/kiplombe-hmis/docker-compose.deploy.yml restart nginx" || echo "⚠️  Could not restart Nginx"
sleep 5
echo ""

echo "🔍 Step 6: Testing API health..."
echo "--------------------------------------------"
API_HEALTH=$(ssh_cmd "docker exec kiplombe_api curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/health --max-time 5 2>/dev/null || echo '000'")
if [ "$API_HEALTH" = "200" ] || [ "$API_HEALTH" = "000" ]; then
    echo "API health check: $([ "$API_HEALTH" = "200" ] && echo '✓ Healthy' || echo '⚠️  Not responding')"
else
    echo "⚠️  API returned: $API_HEALTH"
fi
echo ""

echo "🔍 Step 7: Testing Frontend health..."
echo "--------------------------------------------"
FRONTEND_HEALTH=$(ssh_cmd "docker exec kiplombe_frontend curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 --max-time 5 2>/dev/null || echo '000'")
if [ "$FRONTEND_HEALTH" = "200" ] || [ "$FRONTEND_HEALTH" = "000" ]; then
    echo "Frontend health check: $([ "$FRONTEND_HEALTH" = "200" ] && echo '✓ Healthy' || echo '⚠️  Not responding')"
else
    echo "⚠️  Frontend returned: $FRONTEND_HEALTH"
fi
echo ""

echo "🔍 Step 8: Checking recent logs for errors..."
echo "--------------------------------------------"
echo "--- Recent API errors ---"
ssh_cmd "docker logs --tail 20 kiplombe_api 2>&1 | grep -i error | tail -5 || echo 'No recent errors'"
echo ""

echo "--- Recent Nginx errors ---"
ssh_cmd "docker logs --tail 20 kiplombe_nginx 2>&1 | grep -i '504\|timeout\|error' | tail -5 || echo 'No timeout errors found'"
echo ""

echo "🔍 Step 9: Testing endpoint from server..."
echo "--------------------------------------------"
NGINX_PORT=$(ssh_cmd "grep NGINX_PORT /root/kiplombe-hmis/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' ' || echo '80'")
echo "Testing http://localhost:${NGINX_PORT:-80}..."
TEST_RESULT=$(ssh_cmd "curl -s -o /dev/null -w 'HTTP %{http_code} in %{time_total}s' http://localhost:${NGINX_PORT:-80} --max-time 10 2>&1 || echo 'FAILED'")
echo "Result: $TEST_RESULT"
echo ""

echo "============================================"
echo "Fix Complete"
echo "============================================"
echo ""
echo "📋 What was done:"
echo "1. Checked container health status"
echo "2. Restarted unhealthy containers"
echo "3. Attempted to increase Nginx proxy timeouts (300s)"
echo "4. Restarted Nginx container"
echo "5. Tested API and Frontend health"
echo ""
echo "🔧 If 504 persists, try:"
echo "1. Run: ./deploy/investigate-504.sh $SERVER_IP $SSH_KEY"
echo "2. Check database connectivity: docker exec kiplombe_mysql mysqladmin ping"
echo "3. Check container resources: docker stats"
echo "4. Review full logs: docker logs kiplombe_api --tail 100"
echo "5. Restart all containers: cd /root/kiplombe-hmis && docker-compose -f docker-compose.deploy.yml restart"
echo ""

