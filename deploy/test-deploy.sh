#!/bin/bash
# Test deployment script - runs deployment with extra monitoring and safety checks

set -e

SERVER_IP="${1:-41.89.173.8}"
SSH_KEY_PATH="${2:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

echo "============================================"
echo "Testing Deployment Script"
echo "============================================"
echo "Server: $SSH_USER@$SERVER_IP"
echo "SSH Key: $SSH_KEY_PATH"
echo ""

# Test 1: SSH connection
echo "[TEST 1] Testing SSH connection..."
if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo "✓ SSH connection works"
else
    echo "✗ SSH connection failed"
    exit 1
fi

# Test 2: Check server prerequisites
echo "[TEST 2] Checking server prerequisites..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$SERVER_IP" << 'EOF'
    echo "Checking Docker..."
    docker --version || exit 1
    
    echo "Checking Docker Compose..."
    docker compose version || docker-compose version || exit 1
    
    echo "Checking disk space..."
    df -h / | tail -1 | awk '{print "Available: " $4}'
EOF

# Test 3: Check current state
echo "[TEST 3] Checking current deployment state..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$SERVER_IP" << 'EOF'
    if [ -d ~/kiplombe-hmis ]; then
        echo "App directory exists"
        cd ~/kiplombe-hmis
        echo "Current files:"
        ls -la | head -10
        echo ""
        echo "Current containers:"
        docker ps --filter "name=kiplombe" --format "{{.Names}}: {{.Status}}" || echo "No containers"
    else
        echo "App directory does not exist (will be created)"
    fi
EOF

echo ""
echo "============================================"
echo "Pre-flight checks complete"
echo "============================================"
echo ""
echo "Ready to deploy. The deployment will:"
echo "  1. Backup existing files"
echo "  2. Upload new code"
echo "  3. Build images quickly (no dependency install)"
echo "  4. Start containers (dependencies install at runtime)"
echo "  5. Monitor installation progress (3-5 minutes)"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Starting deployment..."
echo ""

# Run the actual deployment script
cd "$(dirname "$0")/.."
./deploy/remote-deploy.sh "$SERVER_IP" "$SSH_KEY_PATH"

