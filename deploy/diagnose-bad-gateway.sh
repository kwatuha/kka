#!/bin/bash

# Comprehensive diagnostic script for Bad Gateway issues
# Identifies root causes that might require server restart

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running on server or locally
# Check if docker command is available and we can access containers directly
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SERVER_MODE=true
elif [ -n "$1" ] && [ -n "$2" ]; then
    # Running locally with SSH credentials
    SERVER_IP="${1}"
    SSH_KEY="${2}"
    SSH_USER="${SSH_USER:-fhir}"

    SSH_KEY="${SSH_KEY/#\~/$HOME}"

    if [ ! -f "$SSH_KEY" ]; then
        echo "Error: SSH key not found: $SSH_KEY"
        exit 1
    fi

    ssh_cmd() {
        ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
    }

    SERVER_MODE=false
else
    # Default to SSH mode if no args but show usage
    if [ -z "$1" ]; then
        echo "Usage: $0 [server_ip] [ssh_key]"
        echo "   Or run on server directly: $0"
        exit 1
    fi
    SERVER_MODE=false
fi

if [ "$SERVER_MODE" = true ]; then
    run_cmd() { "$@"; }
    docker_cmd() { docker "$@"; }
else
    run_cmd() { ssh_cmd "$@"; }
    docker_cmd() { ssh_cmd "docker $@"; }
fi

print_header "Bad Gateway Root Cause Analysis"

# 1. Container Status
print_header "1. Container Status"
containers=("kiplombe_nginx" "kiplombe_frontend" "kiplombe_api" "kiplombe_mysql")
all_running=true

for container in "${containers[@]}"; do
    status=$(docker_cmd ps --filter "name=$container" --format "{{.Status}}" 2>/dev/null || echo "not found")
    if echo "$status" | grep -q "Up"; then
        health=$(docker_cmd inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        if [ "$health" = "unhealthy" ]; then
            print_error "$container: Running but UNHEALTHY"
            all_running=false
        elif [ "$health" = "healthy" ]; then
            print_status 0 "$container: Running and healthy"
        else
            print_warning "$container: Running (no health check)"
        fi
    else
        print_error "$container: NOT RUNNING - $status"
        all_running=false
    fi
done

# 2. Resource Usage
print_header "2. System Resources"

# Memory
if [ "$SERVER_MODE" = true ]; then
    mem_total=$(free -m | awk '/^Mem:/{print $2}')
    mem_used=$(free -m | awk '/^Mem:/{print $3}')
    mem_percent=$((mem_used * 100 / mem_total))
else
    mem_info=$(run_cmd "free -m | awk '/^Mem:/{print \$2,\$3}'")
    mem_total=$(echo $mem_info | awk '{print $1}')
    mem_used=$(echo $mem_info | awk '{print $2}')
    mem_percent=$((mem_used * 100 / mem_total))
fi

if [ $mem_percent -gt 90 ]; then
    print_error "Memory: ${mem_percent}% used (CRITICAL - may cause OOM kills)"
elif [ $mem_percent -gt 75 ]; then
    print_warning "Memory: ${mem_percent}% used (HIGH)"
else
    print_status 0 "Memory: ${mem_percent}% used"
fi

# Disk Space
if [ "$SERVER_MODE" = true ]; then
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
else
    disk_usage=$(run_cmd "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
fi

if [ "$disk_usage" -gt 90 ]; then
    print_error "Disk Space: ${disk_usage}% used (CRITICAL)"
elif [ "$disk_usage" -gt 80 ]; then
    print_warning "Disk Space: ${disk_usage}% used (HIGH)"
else
    print_status 0 "Disk Space: ${disk_usage}% used"
fi

# Docker Disk Usage
docker_disk=$(docker_cmd system df --format "{{.Size}}" 2>/dev/null | head -1 || echo "unknown")
print_warning "Docker Usage: $docker_disk"

# 3. Container Resource Usage
print_header "3. Container Resource Usage"
for container in "${containers[@]}"; do
    stats=$(docker_cmd stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "$container" 2>/dev/null || echo "")
    if [ -n "$stats" ]; then
        cpu=$(echo "$stats" | awk '{print $1}')
        mem=$(echo "$stats" | awk '{print $2}')
        mem_pct=$(echo "$stats" | awk '{print $3}' | sed 's/%//')
        if [ -n "$mem_pct" ] && [ "$mem_pct" -gt 80 ]; then
            print_warning "$container: CPU: $cpu, Memory: $mem (${mem_pct}%)"
        else
            print_status 0 "$container: CPU: $cpu, Memory: $mem"
        fi
    fi
done

# 4. Recent Container Restarts
print_header "4. Container Restart History"
for container in "${containers[@]}"; do
    restart_count=$(docker_cmd inspect --format='{{.RestartCount}}' "$container" 2>/dev/null || echo "0")
    if [ "$restart_count" -gt 10 ]; then
        print_error "$container: Restarted $restart_count times (FREQUENT RESTARTS)"
    elif [ "$restart_count" -gt 5 ]; then
        print_warning "$container: Restarted $restart_count times"
    else
        print_status 0 "$container: Restarted $restart_count times"
    fi
done

# 5. Recent Logs - Errors
print_header "5. Recent Errors in Logs"
for container in "${containers[@]}"; do
    errors=$(docker_cmd logs --tail 50 "$container" 2>&1 | grep -i "error\|fatal\|crash\|killed\|oom" | tail -5 || echo "")
    if [ -n "$errors" ]; then
        print_warning "$container recent errors:"
        echo "$errors" | sed 's/^/  /'
    fi
done

# 6. Network Connectivity
print_header "6. Network Connectivity"
if docker_cmd exec kiplombe_nginx wget -q --spider http://kiplombe_frontend:3000/ 2>/dev/null; then
    print_status 0 "Nginx -> Frontend: OK"
else
    print_error "Nginx -> Frontend: FAILED"
fi

if docker_cmd exec kiplombe_nginx wget -q --spider http://kiplombe_api:3001/ 2>/dev/null; then
    print_status 0 "Nginx -> API: OK"
else
    print_error "Nginx -> API: FAILED"
fi

if docker_cmd exec kiplombe_api wget -q --spider http://kiplombe_mysql:3306 2>/dev/null; then
    print_status 0 "API -> MySQL: OK"
else
    print_error "API -> MySQL: FAILED"
fi

# 7. Database Connections
print_header "7. Database Connection Pool"
db_connections=$(docker_cmd exec kiplombe_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass} -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | awk 'NR==2 {print $2}' || echo "unknown")
max_connections=$(docker_cmd exec kiplombe_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass} -e "SHOW VARIABLES LIKE 'max_connections';" 2>/dev/null | awk 'NR==2 {print $2}' || echo "unknown")

if [ "$db_connections" != "unknown" ] && [ "$max_connections" != "unknown" ]; then
    conn_percent=$((db_connections * 100 / max_connections))
    if [ $conn_percent -gt 80 ]; then
        print_error "DB Connections: $db_connections/$max_connections (${conn_percent}% - CRITICAL)"
    elif [ $conn_percent -gt 60 ]; then
        print_warning "DB Connections: $db_connections/$max_connections (${conn_percent}%)"
    else
        print_status 0 "DB Connections: $db_connections/$max_connections"
    fi
fi

# 8. Nginx Configuration
print_header "8. Nginx Configuration"
nginx_test=$(docker_cmd exec kiplombe_nginx nginx -t 2>&1 || echo "failed")
if echo "$nginx_test" | grep -q "successful"; then
    print_status 0 "Nginx config: Valid"
else
    print_error "Nginx config: Invalid"
    echo "$nginx_test" | sed 's/^/  /'
fi

# 9. Docker Daemon Status
print_header "9. Docker Daemon"
if [ "$SERVER_MODE" = true ]; then
    if systemctl is-active --quiet docker; then
        print_status 0 "Docker daemon: Running"
    else
        print_error "Docker daemon: NOT RUNNING"
    fi
else
    docker_version=$(docker_cmd version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    if [ "$docker_version" != "unknown" ]; then
        print_status 0 "Docker daemon: Running (v$docker_version)"
    else
        print_error "Docker daemon: NOT RESPONDING"
    fi
fi

# 10. File Descriptors
print_header "10. System Limits"
if [ "$SERVER_MODE" = true ]; then
    ulimit_nofile=$(ulimit -n)
    print_warning "File descriptors limit: $ulimit_nofile"
else
    ulimit_nofile=$(run_cmd "ulimit -n" 2>/dev/null || echo "unknown")
    print_warning "File descriptors limit: $ulimit_nofile"
fi

# 11. OOM Kills
print_header "11. Out-of-Memory Kills"
if [ "$SERVER_MODE" = true ]; then
    oom_kills=$(dmesg | grep -i "out of memory\|oom killer" | tail -5 || echo "")
else
    oom_kills=$(run_cmd "dmesg | grep -i 'out of memory\|oom killer' | tail -5" 2>/dev/null || echo "")
fi

if [ -n "$oom_kills" ]; then
    print_error "Recent OOM kills detected:"
    echo "$oom_kills" | sed 's/^/  /'
else
    print_status 0 "No recent OOM kills"
fi

# Summary
print_header "Summary & Recommendations"

issues_found=0

if [ "$all_running" = false ]; then
    echo -e "${RED}✗ Containers not running properly${NC}"
    issues_found=$((issues_found + 1))
fi

if [ $mem_percent -gt 90 ]; then
    echo -e "${RED}✗ Critical memory usage${NC}"
    issues_found=$((issues_found + 1))
fi

if [ "$disk_usage" -gt 90 ]; then
    echo -e "${RED}✗ Critical disk usage${NC}"
    issues_found=$((issues_found + 1))
fi

if [ -n "$oom_kills" ]; then
    echo -e "${RED}✗ OOM kills detected${NC}"
    issues_found=$((issues_found + 1))
fi

if [ $issues_found -eq 0 ]; then
    echo -e "${GREEN}✓ No critical issues detected${NC}"
    echo ""
    echo "If you're still experiencing Bad Gateway:"
    echo "  1. Check application logs: docker logs kiplombe_api"
    echo "  2. Check Nginx logs: docker logs kiplombe_nginx"
    echo "  3. Restart containers: docker restart kiplombe_nginx kiplombe_frontend kiplombe_api"
else
    echo ""
    echo -e "${YELLOW}Recommendations:${NC}"
    echo "  1. Restart unhealthy containers: docker restart <container_name>"
    echo "  2. Free up disk space if > 90%"
    echo "  3. Increase server memory if OOM kills detected"
    echo "  4. Check and optimize database connections"
    echo "  5. Consider adding resource limits to docker-compose"
fi

echo ""

