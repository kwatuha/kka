#!/bin/bash

# Investigate why frontend keeps restarting/rebuilding
# Usage: ./investigate-frontend-restarts.sh [server_ip] [ssh_key]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running on server or locally
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SERVER_MODE=true
elif [ -n "$1" ] && [ -n "$2" ]; then
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
    echo "Usage: $0 [server_ip] [ssh_key]"
    echo "   Or run on server directly: $0"
    exit 1
fi

if [ "$SERVER_MODE" = true ]; then
    docker_cmd() { docker "$@"; }
    run_cmd() { "$@"; }
else
    docker_cmd() { ssh_cmd "docker $@"; }
    run_cmd() { ssh_cmd "$@"; }
fi

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_section() {
    echo ""
    echo -e "${YELLOW}$1${NC}"
    echo "--------------------------------------------"
}

print_header "Frontend Restart Investigation"

# 1. Container Status
print_section "1. Container Status"
docker_cmd ps -a --format "table {{.Names}}\t{{.Status}}\t{{.RestartCount}}" | grep -E "kiplombe_frontend|NAMES"

restart_count=$(docker_cmd inspect --format='{{.RestartCount}}' kiplombe_frontend 2>/dev/null || echo "0")
echo "Restart count: $restart_count"

# 2. Container State
print_section "2. Container State"
docker_cmd inspect kiplombe_frontend --format='Status: {{.State.Status}}
Running: {{.State.Running}}
OOMKilled: {{.State.OOMKilled}}
ExitCode: {{.State.ExitCode}}
Error: {{.State.Error}}
StartedAt: {{.State.StartedAt}}
FinishedAt: {{.State.FinishedAt}}'

# 3. Memory Usage
print_section "3. Memory Usage"
docker_cmd stats --no-stream kiplombe_frontend --format "Memory: {{.MemUsage}} ({{.MemPerc}})
CPU: {{.CPUPerc}}
Network: {{.NetIO}}"

# Check if hitting memory limit
mem_percent=$(docker_cmd stats --no-stream --format "{{.MemPerc}}" kiplombe_frontend | sed 's/%//')
if [ -n "$mem_percent" ] && [ "$mem_percent" -gt 95 ]; then
    echo -e "${RED}⚠️  CRITICAL: Memory usage is ${mem_percent}% - may cause OOM kills!${NC}"
fi

# 4. System Memory
print_section "4. System Memory"
run_cmd "free -h"

# 5. OOM Kills
print_section "5. OOM Kills Check"
oom_kills=$(run_cmd "dmesg | grep -i 'oom\|killed.*kiplombe' | tail -5" 2>/dev/null || echo "")
if [ -n "$oom_kills" ]; then
    echo -e "${RED}⚠️  OOM kills detected:${NC}"
    echo "$oom_kills"
else
    echo -e "${GREEN}✓ No recent OOM kills${NC}"
fi

# 6. Health Check Status
print_section "6. Health Check Status"
health_status=$(docker_cmd inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "no-healthcheck")
echo "Health status: $health_status"

if [ "$health_status" != "no-healthcheck" ]; then
    echo "Health check log (last 3 attempts):"
    docker_cmd inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' kiplombe_frontend 2>/dev/null | tail -3 || echo "No health check log"
fi

# 7. Recent Logs
print_section "7. Recent Logs (last 30 lines)"
docker_cmd logs --tail 30 kiplombe_frontend 2>&1

# 8. Build Status
print_section "8. Build Status"
if docker_cmd exec kiplombe_frontend test -d /app/.next/standalone 2>/dev/null; then
    echo -e "${GREEN}✓ Standalone build exists${NC}"
    if docker_cmd exec kiplombe_frontend test -f /app/.next/standalone/server.js 2>/dev/null; then
        echo -e "${GREEN}✓ server.js exists${NC}"
    else
        echo -e "${RED}✗ server.js missing${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Standalone build not found - container may still be building${NC}"
fi

# 9. Process Status
print_section "9. Process Status"
if docker_cmd exec kiplombe_frontend ps aux 2>/dev/null | grep -q node; then
    echo -e "${GREEN}✓ Node.js process is running${NC}"
    docker_cmd exec kiplombe_frontend ps aux 2>/dev/null | grep node | head -3
else
    echo -e "${RED}✗ No Node.js process found${NC}"
fi

# 10. Port Listening
print_section "10. Port Listening"
if docker_cmd exec kiplombe_frontend wget -q --spider --timeout=2 http://127.0.0.1:3000/ 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend is responding on port 3000${NC}"
else
    echo -e "${RED}✗ Frontend is NOT responding on port 3000${NC}"
fi

# Summary
print_header "Summary & Recommendations"

issues=0

if [ "$mem_percent" -gt 95 ] 2>/dev/null; then
    echo -e "${RED}✗ Memory usage too high (${mem_percent}%)${NC}"
    issues=$((issues + 1))
fi

if [ -n "$oom_kills" ]; then
    echo -e "${RED}✗ OOM kills detected${NC}"
    issues=$((issues + 1))
fi

if [ "$health_status" = "unhealthy" ]; then
    echo -e "${RED}✗ Container is unhealthy${NC}"
    issues=$((issues + 1))
fi

if [ "$restart_count" -gt 5 ]; then
    echo -e "${RED}✗ High restart count (${restart_count})${NC}"
    issues=$((issues + 1))
fi

if [ $issues -eq 0 ]; then
    echo -e "${GREEN}✓ No critical issues detected${NC}"
else
    echo ""
    echo -e "${YELLOW}Recommendations:${NC}"
    if [ "$mem_percent" -gt 95 ] 2>/dev/null; then
        echo "  1. Increase memory limit in docker-compose.deploy.yml"
        echo "     Change: memory: 1G"
        echo "     To:     memory: 2G"
    fi
    if [ -n "$oom_kills" ]; then
        echo "  2. Container is being killed due to memory exhaustion"
        echo "     Increase memory limit or optimize the build process"
    fi
    if [ "$health_status" = "unhealthy" ]; then
        echo "  3. Health check is failing - container may still be building"
        echo "     Wait for build to complete or check build logs"
    fi
fi

echo ""





