#!/bin/bash

# ============================================
# Check if Files Were Copied to Frontend Container
# ============================================

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
echo -e "${BLUE}Checking Frontend Container Files${NC}"
echo -e "${BLUE}============================================${NC}\n"

eval "$SSH_CMD" << 'CHECK_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo -e "${YELLOW}Step 1: Checking if frontend container is running...${NC}"
    if ! docker ps | grep -q kiplombe_frontend; then
        echo "   ✗ Frontend container is NOT running"
        exit 1
    fi
    echo "   ✓ Frontend container is running"
    echo ""

    echo -e "${YELLOW}Step 2: Checking server directory structure...${NC}"
    echo "   Files in ~/kiplombe-hmis:"
    ls -la ~/kiplombe-hmis | head -20
    echo ""

    echo "   Checking for key directories:"
    for dir in app components lib api public; do
        if [ -d "~/kiplombe-hmis/$dir" ]; then
            echo "   ✓ $dir/ exists"
            FILE_COUNT=$(find ~/kiplombe-hmis/$dir -type f 2>/dev/null | wc -l)
            echo "      Files: $FILE_COUNT"
        else
            echo "   ✗ $dir/ NOT FOUND"
        fi
    done
    echo ""

    echo -e "${YELLOW}Step 3: Checking frontend container filesystem...${NC}"
    echo "   Working directory in container:"
    docker exec kiplombe_frontend pwd
    echo ""

    echo "   Files in container root (/app):"
    docker exec kiplombe_frontend ls -la /app | head -20
    echo ""

    echo -e "${YELLOW}Step 4: Checking for source files in container...${NC}"
    echo "   Checking app/ directory:"
    if docker exec kiplombe_frontend test -d /app/app; then
        echo "   ✓ /app/app/ exists"
        APP_FILES=$(docker exec kiplombe_frontend find /app/app -type f 2>/dev/null | wc -l)
        echo "      Files: $APP_FILES"
        echo "      Sample files:"
        docker exec kiplombe_frontend find /app/app -type f 2>/dev/null | head -5
    else
        echo "   ✗ /app/app/ NOT FOUND"
    fi
    echo ""

    echo "   Checking components/ directory:"
    if docker exec kiplombe_frontend test -d /app/components; then
        echo "   ✓ /app/components/ exists"
        COMP_FILES=$(docker exec kiplombe_frontend find /app/components -type f 2>/dev/null | wc -l)
        echo "      Files: $COMP_FILES"
        echo "      Sample files:"
        docker exec kiplombe_frontend find /app/components -type f 2>/dev/null | head -5
    else
        echo "   ✗ /app/components/ NOT FOUND"
    fi
    echo ""

    echo "   Checking lib/ directory:"
    if docker exec kiplombe_frontend test -d /app/lib; then
        echo "   ✓ /app/lib/ exists"
        LIB_FILES=$(docker exec kiplombe_frontend find /app/lib -type f 2>/dev/null | wc -l)
        echo "      Files: $LIB_FILES"
        echo "      Checking for auth-context.tsx:"
        if docker exec kiplombe_frontend test -f /app/lib/auth/auth-context.tsx; then
            echo "      ✓ /app/lib/auth/auth-context.tsx exists"
            echo "      File size: $(docker exec kiplombe_frontend stat -c%s /app/lib/auth/auth-context.tsx 2>/dev/null || echo 'unknown') bytes"
        else
            echo "      ✗ /app/lib/auth/auth-context.tsx NOT FOUND"
        fi
    else
        echo "   ✗ /app/lib/ NOT FOUND"
    fi
    echo ""

    echo -e "${YELLOW}Step 5: Checking build artifacts...${NC}"
    echo "   Checking .next directory:"
    if docker exec kiplombe_frontend test -d /app/.next; then
        echo "   ✓ /app/.next/ exists"

        if docker exec kiplombe_frontend test -f /app/.next/BUILD_ID; then
            BUILD_ID=$(docker exec kiplombe_frontend cat /app/.next/BUILD_ID 2>/dev/null || echo "unknown")
            echo "      BUILD_ID: $BUILD_ID"
        else
            echo "      ✗ BUILD_ID file NOT FOUND"
        fi

        if docker exec kiplombe_frontend test -d /app/.next/standalone; then
            echo "      ✓ .next/standalone/ exists (standalone build)"
        else
            echo "      ⚠️  .next/standalone/ NOT FOUND (might be normal if not using standalone)"
        fi

        if docker exec kiplombe_frontend test -d /app/.next/server; then
            echo "      ✓ .next/server/ exists"
        else
            echo "      ✗ .next/server/ NOT FOUND"
        fi
    else
        echo "   ✗ /app/.next/ NOT FOUND - Build may have failed"
    fi
    echo ""

    echo -e "${YELLOW}Step 6: Checking package.json and dependencies...${NC}"
    if docker exec kiplombe_frontend test -f /app/package.json; then
        echo "   ✓ package.json exists"
        PACKAGE_VERSION=$(docker exec kiplombe_frontend grep -A 1 '"name"' /app/package.json 2>/dev/null | head -2 || echo "unknown")
        echo "      $PACKAGE_VERSION"
    else
        echo "   ✗ package.json NOT FOUND"
    fi

    if docker exec kiplombe_frontend test -d /app/node_modules; then
        NODE_MOD_COUNT=$(docker exec kiplombe_frontend find /app/node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
        echo "   ✓ node_modules/ exists ($NODE_MOD_COUNT packages)"
    else
        echo "   ✗ node_modules/ NOT FOUND"
    fi
    echo ""

    echo -e "${YELLOW}Step 7: Checking critical files for auth...${NC}"
    CRITICAL_FILES=(
        "/app/lib/auth/auth-context.tsx"
        "/app/components/protected-route.tsx"
        "/app/app/layout.tsx"
        "/app/app/page.tsx"
        "/app/next.config.mjs"
    )

    for file in "${CRITICAL_FILES[@]}"; do
        if docker exec kiplombe_frontend test -f "$file"; then
            SIZE=$(docker exec kiplombe_frontend stat -c%s "$file" 2>/dev/null || echo "0")
            echo "   ✓ $(basename $file) exists ($SIZE bytes)"
        else
            echo "   ✗ $(basename $file) NOT FOUND at $file"
        fi
    done
    echo ""

    echo -e "${YELLOW}Step 8: Checking frontend logs for errors...${NC}"
    echo "   Recent frontend logs (last 30 lines):"
    docker logs --tail=30 kiplombe_frontend 2>&1 | tail -20
    echo ""

    echo -e "${YELLOW}Step 9: Comparing server files vs container files...${NC}"
    echo "   Server app/page.tsx:"
    if [ -f ~/kiplombe-hmis/app/page.tsx ]; then
        SERVER_SIZE=$(stat -c%s ~/kiplombe-hmis/app/page.tsx 2>/dev/null || echo "0")
        echo "      Exists: ✓ ($SERVER_SIZE bytes)"
    else
        echo "      Exists: ✗"
    fi

    echo "   Container /app/app/page.tsx:"
    if docker exec kiplombe_frontend test -f /app/app/page.tsx; then
        CONTAINER_SIZE=$(docker exec kiplombe_frontend stat -c%s /app/app/page.tsx 2>/dev/null || echo "0")
        echo "      Exists: ✓ ($CONTAINER_SIZE bytes)"

        if [ "$SERVER_SIZE" != "0" ] && [ "$CONTAINER_SIZE" != "0" ] && [ "$SERVER_SIZE" != "$CONTAINER_SIZE" ]; then
            echo "      ⚠️  WARNING: File sizes don't match! Server: $SERVER_SIZE, Container: $CONTAINER_SIZE"
        fi
    else
        echo "      Exists: ✗"
    fi
    echo ""

    echo -e "${YELLOW}Step 10: Checking if container needs rebuild...${NC}"
    echo "   Checking when container was last built:"
    CREATED=$(docker inspect --format='{{.Created}}' kiplombe_frontend 2>/dev/null || echo "unknown")
    echo "      Container created: $CREATED"

    echo "   Checking when server files were last modified:"
    if [ -f ~/kiplombe-hmis/app/page.tsx ]; then
        MODIFIED=$(stat -c%y ~/kiplombe-hmis/app/page.tsx 2>/dev/null || echo "unknown")
        echo "      app/page.tsx modified: $MODIFIED"
    fi
    echo ""

    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}File Check Complete${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo -e "${YELLOW}Summary:${NC}"
    echo "If files are missing or sizes don't match, you may need to:"
    echo "1. Redeploy: ./deploy/remote-deploy.sh"
    echo "2. Rebuild frontend: docker compose -f docker-compose.deploy.yml build --no-cache frontend"
    echo "3. Restart frontend: docker compose -f docker-compose.deploy.yml restart frontend"
CHECK_EOF







