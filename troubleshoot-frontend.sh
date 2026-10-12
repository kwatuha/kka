#!/bin/bash
# Frontend Container Troubleshooting Script
# This script helps diagnose and fix frontend container issues quickly

set -e

CONTAINER_NAME="kiplombe_frontend"
VOLUME_NAME="transelgon_frontend_node_modules"

echo "=== Frontend Container Troubleshooting ==="
echo ""

# Function to check if container exists
check_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        return 0
    else
        return 1
    fi
}

# Function to check if container is running
is_running() {
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        return 0
    else
        return 1
    fi
}

# Function to show container logs
show_logs() {
    echo "--- Container Logs (last 50 lines) ---"
    docker logs ${CONTAINER_NAME} --tail 50 2>&1 || echo "Could not retrieve logs"
    echo ""
}

# Function to check container status
check_status() {
    echo "--- Container Status ---"
    docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Function to check for common errors in logs
check_errors() {
    echo "--- Checking for Common Errors ---"
    
    if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "ENOTEMPTY"; then
        echo "❌ Found: ENOTEMPTY error (volume conflict)"
        echo "   Solution: Need to remove and recreate the node_modules volume"
        return 1
    fi
    
    if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "EACCES"; then
        echo "❌ Found: Permission error"
        echo "   Solution: Check file permissions"
        return 1
    fi
    
    if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "Cannot find module"; then
        echo "❌ Found: Missing module error"
        echo "   Solution: Dependencies need to be reinstalled"
        return 1
    fi
    
    if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "port.*already in use"; then
        echo "❌ Found: Port already in use"
        echo "   Solution: Change port or stop conflicting service"
        return 1
    fi
    
    echo "✓ No common errors detected in logs"
    return 0
}

# Function to fix volume conflict
fix_volume_conflict() {
    echo "--- Fixing Volume Conflict ---"
    
    if check_container; then
        echo "Stopping container..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        echo "Removing container..."
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    fi
    
    if docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
        echo "Removing problematic volume..."
        docker volume rm ${VOLUME_NAME} 2>/dev/null || true
        echo "✓ Volume removed"
    else
        echo "✓ Volume doesn't exist (good)"
    fi
}

# Detect docker compose command
DOCKER_COMPOSE_CMD="docker compose"
if ! $DOCKER_COMPOSE_CMD version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    if ! $DOCKER_COMPOSE_CMD version &>/dev/null; then
        echo "Error: docker compose or docker-compose not found"
        exit 1
    fi
fi

# Function to rebuild container quickly (without cache)
quick_rebuild() {
    echo "--- Quick Rebuild (without cache) ---"
    $DOCKER_COMPOSE_CMD build --no-cache frontend
    echo "✓ Rebuild complete"
}

# Function to start container and watch logs
start_and_watch() {
    echo "--- Starting Container ---"
    $DOCKER_COMPOSE_CMD up -d frontend
    echo "Waiting 5 seconds for container to start..."
    sleep 5
    echo ""
    show_logs
    check_status
}

# Function to run npm install in container (for testing)
test_npm_install() {
    echo "--- Testing npm install in container ---"
    if is_running; then
        echo "Running: npm install --legacy-peer-deps"
        docker exec ${CONTAINER_NAME} npm install --legacy-peer-deps 2>&1 | tail -20
    else
        echo "Container is not running. Start it first."
    fi
}

# Function to check dependencies
check_dependencies() {
    echo "--- Checking Dependencies ---"
    if is_running; then
        echo "Checking if Next.js is installed..."
        if docker exec ${CONTAINER_NAME} test -f node_modules/.bin/next; then
            echo "✓ Next.js is installed"
            docker exec ${CONTAINER_NAME} node_modules/.bin/next --version
        else
            echo "❌ Next.js is NOT installed"
        fi
        
        echo ""
        echo "Checking package.json..."
        docker exec ${CONTAINER_NAME} cat package.json | grep -A 2 '"next"' || echo "Could not read package.json"
    else
        echo "Container is not running"
    fi
}

# Function to check for Turbopack support
check_turbopack() {
    echo "--- Checking Turbopack Support ---"
    if is_running; then
        NEXT_VERSION=$(docker exec ${CONTAINER_NAME} node_modules/.bin/next --version 2>/dev/null | cut -d' ' -f2 || echo "unknown")
        echo "Next.js version: $NEXT_VERSION"
        
        # Turbopack is available in Next.js 13+
        MAJOR_VERSION=$(echo $NEXT_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 13 ]; then
            echo "✓ Turbopack should be supported"
        else
            echo "❌ Turbopack requires Next.js 13+"
        fi
    else
        echo "Container is not running"
    fi
}

# Main menu
case "${1:-menu}" in
    status)
        check_status
        if check_container; then
            show_logs
            check_errors
        fi
        ;;
    logs)
        if check_container; then
            show_logs
        else
            echo "Container does not exist"
        fi
        ;;
    fix)
        fix_volume_conflict
        quick_rebuild
        start_and_watch
        ;;
    rebuild)
        quick_rebuild
        start_and_watch
        ;;
    start)
        start_and_watch
        ;;
    test-install)
        test_npm_install
        ;;
    check-deps)
        check_dependencies
        ;;
    check-turbopack)
        check_turbopack
        ;;
    watch)
        echo "Watching container logs (Ctrl+C to stop)..."
        docker logs -f ${CONTAINER_NAME}
        ;;
    menu|*)
        echo "Frontend Container Troubleshooting Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  status        - Show container status and check for errors"
        echo "  logs          - Show recent container logs"
        echo "  fix           - Fix volume conflict and rebuild"
        echo "  rebuild       - Quick rebuild without cache"
        echo "  start         - Start container and show logs"
        echo "  test-install  - Test npm install inside container"
        echo "  check-deps    - Check if dependencies are installed"
        echo "  check-turbopack - Check Turbopack support"
        echo "  watch         - Watch container logs in real-time"
        echo ""
        echo "Quick fix (recommended):"
        echo "  $0 fix"
        echo ""
        check_status
        if check_container; then
            check_errors
        fi
        ;;
esac

