#!/bin/bash

# Fix Next.js Static Files 404 Issue
# This script ensures static files are properly set up in the frontend container

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
echo -e "${BLUE}Fixing Next.js Static Files 404 Issue${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'FIX_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "${YELLOW}Step 1: Checking frontend container status...${NC}"
    if ! docker ps | grep -q kiplombe_frontend; then
        echo "   ✗ Frontend container is not running"
        exit 1
    fi
    echo "   ✓ Frontend container is running"
    echo ""

    echo -e "${YELLOW}Step 2: Checking build status...${NC}"
    # Check if .next directory exists
    if docker exec kiplombe_frontend test -d /app/.next; then
        echo "   ✓ .next directory exists"

        # Check for static files
        if docker exec kiplombe_frontend test -d /app/.next/static; then
            STATIC_COUNT=$(docker exec kiplombe_frontend find /app/.next/static -type f 2>/dev/null | wc -l)
            echo "   ✓ .next/static exists ($STATIC_COUNT files)"
        else
            echo "   ✗ .next/static NOT FOUND - build may be incomplete"
        fi

        # Check for standalone build
        if docker exec kiplombe_frontend test -d /app/.next/standalone; then
            echo "   ✓ .next/standalone exists"

            # Check if static files are in standalone
            if docker exec kiplombe_frontend test -d /app/.next/standalone/.next/static; then
                STANDALONE_STATIC=$(docker exec kiplombe_frontend find /app/.next/standalone/.next/static -type f 2>/dev/null | wc -l)
                echo "   ✓ .next/standalone/.next/static exists ($STANDALONE_STATIC files)"
            else
                echo "   ✗ .next/standalone/.next/static NOT FOUND - this is the problem!"
                echo "   Will fix by copying static files..."
            fi
        else
            echo "   ⚠️  .next/standalone NOT FOUND - not using standalone mode"
        fi
    else
        echo "   ✗ .next directory NOT FOUND - build has not completed"
        echo "   Checking build logs..."
        docker logs --tail=50 kiplombe_frontend 2>&1 | grep -E "(Building|Build|error|Error)" | tail -10
        exit 1
    fi
    echo ""

    echo -e "${YELLOW}Step 3: Fixing static files in standalone build...${NC}"
    # Copy static files to standalone if they're missing
    docker exec kiplombe_frontend bash -c "
        if [ -d /app/.next/static ] && [ ! -d /app/.next/standalone/.next/static ]; then
            echo '   Copying static files to standalone build...'
            mkdir -p /app/.next/standalone/.next
            cp -r /app/.next/static /app/.next/standalone/.next/ 2>/dev/null || true
            echo '   ✓ Static files copied'
        elif [ -d /app/.next/static ] && [ -d /app/.next/standalone/.next/static ]; then
            echo '   Static files already exist, ensuring they are complete...'
            # Count files to verify
            ORIGINAL_COUNT=\$(find /app/.next/static -type f 2>/dev/null | wc -l)
            STANDALONE_COUNT=\$(find /app/.next/standalone/.next/static -type f 2>/dev/null | wc -l)
            if [ \"\$STANDALONE_COUNT\" -lt \"\$ORIGINAL_COUNT\" ]; then
                echo '   ⚠️  Standalone has fewer files, recopying...'
                rm -rf /app/.next/standalone/.next/static
                cp -r /app/.next/static /app/.next/standalone/.next/ 2>/dev/null || true
                echo '   ✓ Static files recopied'
            else
                echo '   ✓ Static files are complete'
            fi
        else
            echo '   ✗ Cannot fix - .next/static not found. Build may have failed.'
        fi
    "
    echo ""

    echo -e "${YELLOW}Step 4: Verifying static files are accessible...${NC}"
    # Check if static files exist after fix
    if docker exec kiplombe_frontend test -d /app/.next/standalone/.next/static; then
        FINAL_COUNT=$(docker exec kiplombe_frontend find /app/.next/standalone/.next/static -type f 2>/dev/null | wc -l)
        echo "   ✓ Static files verified ($FINAL_COUNT files)"

        # List a few sample files
        echo "   Sample static files:"
        docker exec kiplombe_frontend find /app/.next/standalone/.next/static -type f 2>/dev/null | head -5
    else
        echo "   ✗ Static files still missing - may need to rebuild"
    fi
    echo ""

    echo -e "${YELLOW}Step 5: Restarting frontend to apply fixes...${NC}"
    docker compose -f docker-compose.deploy.yml restart frontend
    echo "   Waiting for frontend to restart..."
    sleep 10
    echo ""

    echo -e "${YELLOW}Step 6: Testing static file access...${NC}"
    # Wait a bit for server to start
    sleep 5

    # Test if we can access a static file
    if docker exec kiplombe_frontend wget -q -O- http://localhost:3000/_next/static/css/ 2>&1 | head -1 > /dev/null 2>&1; then
        echo "   ✓ Static files are being served"
    else
        echo "   ⚠️  Static files may still not be accessible"
        echo "   Check frontend logs for errors"
    fi
    echo ""

    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Fix Complete${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo -e "${YELLOW}If static files are still 404:${NC}"
    echo "1. Check frontend logs: docker logs -f kiplombe_frontend"
    echo "2. Verify build completed: docker exec kiplombe_frontend ls -la /app/.next/"
    echo "3. Rebuild if needed: docker compose -f docker-compose.deploy.yml build --no-cache frontend"
FIX_EOF







