#!/bin/bash

# Test script to validate deployment before running full deployment
# This script tests each step of the deployment process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"
APP_DIR="${APP_DIR:-~/kiplombe-hmis}"

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
APP_DIR="${APP_DIR/#\~/$HOME}"

SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \"$SSH_USER@$SERVER_IP\""

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Testing Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo "Server: $SSH_USER@$SERVER_IP"
echo "SSH Key: $SSH_KEY_PATH"
echo ""

# Test 1: Check local files
echo -e "${BLUE}[Test 1] Checking Local Files...${NC}"
if [ ! -f "Dockerfile.prod" ]; then
    echo -e "${RED}✗${NC} Dockerfile.prod not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} Dockerfile.prod exists"

if [ ! -f "docker-entrypoint-prod.sh" ]; then
    echo -e "${RED}✗${NC} docker-entrypoint-prod.sh not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} docker-entrypoint-prod.sh exists"

if [ ! -f "docker-compose.deploy.yml" ]; then
    echo -e "${RED}✗${NC} docker-compose.deploy.yml not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} docker-compose.deploy.yml exists"

if [ ! -f "package.json" ]; then
    echo -e "${RED}✗${NC} package.json not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} package.json exists"

if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}⚠${NC} package-lock.json not found (will use npm install)"
else
    echo -e "${GREEN}✓${NC} package-lock.json exists"
fi

# Test 2: SSH Connection
echo ""
echo -e "${BLUE}[Test 2] Testing SSH Connection...${NC}"
if eval "$SSH_CMD" 'echo "Connection test successful"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} SSH connection works"
else
    echo -e "${RED}✗${NC} SSH connection failed"
    exit 1
fi

# Test 3: Server Prerequisites
echo ""
echo -e "${BLUE}[Test 3] Checking Server Prerequisites...${NC}"
eval "$SSH_CMD" << EOF
    if command -v docker > /dev/null 2>&1; then
        echo "✓ Docker is installed: \$(docker --version)"
    else
        echo "✗ Docker is not installed"
        exit 1
    fi

    if docker compose version > /dev/null 2>&1 || docker-compose version > /dev/null 2>&1; then
        echo "✓ Docker Compose is available"
    else
        echo "✗ Docker Compose is not available"
        exit 1
    fi

    if docker info > /dev/null 2>&1; then
        echo "✓ Docker service is running"
    else
        echo "✗ Docker service is not running"
        exit 1
    fi
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Server prerequisites check failed"
    exit 1
fi

# Test 4: Check Current Deployment State
echo ""
echo -e "${BLUE}[Test 4] Checking Current Deployment State...${NC}"
eval "$SSH_CMD" << EOF
    if [ -d "$APP_DIR" ]; then
        echo "✓ App directory exists: $APP_DIR"
        cd $APP_DIR

        if [ -f "docker-compose.deploy.yml" ]; then
            echo "✓ docker-compose.deploy.yml exists on server"
        else
            echo "⚠ docker-compose.deploy.yml not found on server"
        fi

        if [ -f ".env" ]; then
            echo "✓ .env file exists on server"
        else
            echo "⚠ .env file not found on server"
        fi

        echo ""
        echo "Current containers:"
        docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}" || echo "No containers running"
    else
        echo "⚠ App directory does not exist (will be created during deployment)"
    fi
EOF

# Test 5: Test Archive Creation
echo ""
echo -e "${BLUE}[Test 5] Testing Archive Creation...${NC}"
LOCAL_DIR=$(cd "$(dirname "$0")/.." && pwd)
TEMP_DIR=$(mktemp -d)
TEST_ARCHIVE="$TEMP_DIR/test-deploy.tar.gz"

cd "$LOCAL_DIR"
echo "Creating test archive..."
tar -czf "$TEST_ARCHIVE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='.DS_Store' \
    --exclude='coverage' \
    --exclude='.cache' \
    Dockerfile.prod docker-entrypoint-prod.sh docker-compose.deploy.yml package.json \
    2>/dev/null || true

if [ -f "$TEST_ARCHIVE" ]; then
    ARCHIVE_SIZE=$(du -h "$TEST_ARCHIVE" | cut -f1)
    echo -e "${GREEN}✓${NC} Test archive created successfully ($ARCHIVE_SIZE)"
    rm -rf "$TEMP_DIR"
else
    echo -e "${RED}✗${NC} Failed to create test archive"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Test 6: Check Disk Space on Server
echo ""
echo -e "${BLUE}[Test 6] Checking Server Disk Space...${NC}"
eval "$SSH_CMD" << EOF
    AVAILABLE_SPACE=\$(df -h ~ | tail -1 | awk '{print \$4}')
    echo "Available disk space: \$AVAILABLE_SPACE"

    # Check if we have at least 5GB available (approximate)
    AVAILABLE_BYTES=\$(df ~ | tail -1 | awk '{print \$4}')
    REQUIRED_BYTES=5242880  # 5GB in KB

    if [ \$AVAILABLE_BYTES -gt \$REQUIRED_BYTES ]; then
        echo "✓ Sufficient disk space available"
    else
        echo "⚠ Low disk space warning (less than 5GB)"
    fi
EOF

# Test 7: Test File Upload (Small Test)
echo ""
echo -e "${BLUE}[Test 7] Testing File Upload Capability...${NC}"
TEST_FILE="/tmp/deploy-test-$$.txt"
echo "test content $(date)" > "$TEST_FILE"

if scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$TEST_FILE" "$SSH_USER@$SERVER_IP:/tmp/" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} File upload works"
    # Clean up
    eval "$SSH_CMD" "rm -f /tmp/deploy-test-$$.txt" > /dev/null 2>&1
    rm -f "$TEST_FILE"
else
    echo -e "${RED}✗${NC} File upload failed"
    rm -f "$TEST_FILE"
    exit 1
fi

# Summary
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✓${NC} All tests passed!"
echo ""
echo -e "${YELLOW}Ready to deploy!${NC}"
echo ""
echo "To deploy, run:"
echo "  ./deploy/remote-deploy.sh $SERVER_IP $SSH_KEY_PATH"
echo ""
echo "Or with configuration:"
echo "  export SERVER_IP=$SERVER_IP"
echo "  export SSH_KEY_PATH=$SSH_KEY_PATH"
echo "  ./deploy/remote-deploy.sh"
echo ""








