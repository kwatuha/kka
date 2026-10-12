#!/bin/bash

# Check Frontend Container Startup Status
# This script checks if the frontend is installing dependencies or stuck

set -e

SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Checking Frontend Container Startup${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'CHECK_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "${YELLOW}Step 1: Container status...${NC}"
    docker ps --filter "name=kiplombe_frontend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    echo -e "${YELLOW}Step 2: Checking if container is running entrypoint...${NC}"
    if docker ps | grep -q kiplombe_frontend; then
        # Check what process is running
        echo "   Main process:"
        docker exec kiplombe_frontend ps aux | head -5 || echo "   ⚠️  Could not check processes"
        echo ""

        # Check if node_modules exists
        echo "   Checking node_modules:"
        if docker exec kiplombe_frontend test -d /app/node_modules; then
            MOD_COUNT=$(docker exec kiplombe_frontend find /app/node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
            echo "   ✓ node_modules exists ($MOD_COUNT packages)"
        else
            echo "   ✗ node_modules NOT FOUND - dependencies are being installed"
        fi
        echo ""

        # Check if .next build exists
        echo "   Checking .next build:"
        if docker exec kiplombe_frontend test -d /app/.next; then
            if docker exec kiplombe_frontend test -f /app/.next/BUILD_ID; then
                BUILD_ID=$(docker exec kiplombe_frontend cat /app/.next/BUILD_ID 2>/dev/null || echo "unknown")
                echo "   ✓ .next build exists (BUILD_ID: $BUILD_ID)"
            else
                echo "   ⚠️  .next exists but BUILD_ID missing - build might be in progress"
            fi
        else
            echo "   ✗ .next NOT FOUND - build has not started or is in progress"
        fi
        echo ""
    else
        echo "   ✗ Frontend container is not running"
    fi

    echo -e "${YELLOW}Step 3: Recent frontend logs (last 50 lines)...${NC}"
    docker logs --tail=50 kiplombe_frontend 2>&1 | tail -30
    echo ""

    echo -e "${YELLOW}Step 4: Checking for specific startup messages...${NC}"
    LOGS=$(docker logs kiplombe_frontend 2>&1 | tail -100)

    if echo "$LOGS" | grep -q "Installing dependencies"; then
        echo "   ⏳ Dependencies are being installed (this takes 3-5 minutes)"
    elif echo "$LOGS" | grep -q "Dependencies already installed"; then
        echo "   ✓ Dependencies are installed"
    fi

    if echo "$LOGS" | grep -q "Building Next.js application"; then
        echo "   ⏳ Next.js build is in progress (this takes 2-5 minutes)"
    elif echo "$LOGS" | grep -q "Build completed successfully"; then
        echo "   ✓ Build completed"
    elif echo "$LOGS" | grep -q "Build already exists"; then
        echo "   ✓ Build already exists"
    fi

    if echo "$LOGS" | grep -q "Starting Next.js server"; then
        echo "   ⏳ Server is starting"
    elif echo "$LOGS" | grep -q "Using standalone\|Using npm start"; then
        echo "   ✓ Server has started"
    fi

    if echo "$LOGS" | grep -q "ERROR\|Error\|error"; then
        echo -e "   ${RED}⚠️  Errors found in logs (see above)${NC}"
    fi
    echo ""

    echo -e "${YELLOW}Step 5: Container uptime...${NC}"
    CREATED=$(docker inspect --format='{{.Created}}' kiplombe_frontend 2>/dev/null || echo "unknown")
    STARTED=$(docker inspect --format='{{.State.StartedAt}}' kiplombe_frontend 2>/dev/null || echo "unknown")
    echo "   Created: $CREATED"
    echo "   Started: $STARTED"
    echo ""

    echo -e "${YELLOW}Step 6: Health check status...${NC}"
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "no-healthcheck")
    echo "   Health status: $HEALTH"
    if [ "$HEALTH" = "starting" ]; then
        echo "   ⏳ Container is still in startup phase (this is normal for first 5-10 minutes)"
    elif [ "$HEALTH" = "healthy" ]; then
        echo "   ✓ Container is healthy"
    elif [ "$HEALTH" = "unhealthy" ]; then
        echo -e "   ${RED}✗ Container is unhealthy${NC}"
    fi
    echo ""

    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Summary${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo "Expected startup sequence:"
    echo "1. Container starts → Entrypoint runs"
    echo "2. npm install (3-5 minutes) → Dependencies installed"
    echo "3. npm run build (2-5 minutes) → Next.js build"
    echo "4. Server starts → Container becomes healthy"
    echo ""
    echo "Total expected time: 5-10 minutes for first startup"
    echo ""
    echo "If container is stuck for >15 minutes, check logs for errors"
CHECK_EOF







