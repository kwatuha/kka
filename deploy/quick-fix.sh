#!/bin/bash
# Quick Fix Script for Current Deployment Issue
# This script fixes the frontend container issue on the server

set -e

# Configuration
SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"
APP_DIR="${APP_DIR:-~/kiplombe-hmis}"

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
APP_DIR="${APP_DIR/#\~/$HOME}"

SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

echo "============================================"
echo "Quick Fix for Kiplombe HMIS Deployment"
echo "============================================"
echo "Server: $SSH_USER@$SERVER_IP"
echo ""

# Test SSH connection
if ! eval "$SSH_CMD" 'echo "OK"' > /dev/null 2>&1; then
    echo "✗ SSH connection failed"
    exit 1
fi

echo "✓ SSH connection works"
echo ""

# Fix deployment
eval "$SSH_CMD" << EOF
    set -e
    cd $APP_DIR
    
    echo "Stopping frontend container..."
    docker stop kiplombe_frontend 2>/dev/null || true
    
    echo "Removing frontend container..."
    docker rm kiplombe_frontend 2>/dev/null || true
    
    echo "Rebuilding frontend image (quick build - dependencies install at runtime)..."
    docker compose -f docker-compose.deploy.yml build --no-cache frontend 2>&1 | tail -30
    
    echo "Starting frontend container (dependencies will install automatically)..."
    docker compose -f docker-compose.deploy.yml up -d frontend
    
    echo "Waiting for frontend to install dependencies and start (this takes 3-5 minutes)..."
    echo "Monitoring installation progress..."
    
    # Wait for dependencies to install
    for i in {1..30}; do
        sleep 10
        if docker logs kiplombe_frontend 2>&1 | grep -q "Dependencies installed successfully\|dependencies already installed\|✅ Dependencies already installed\|Starting Next.js\|Build completed"; then
            echo "✓ Dependencies installed and frontend starting..."
            break
        fi
        echo -n "."
    done
    echo ""
    
    echo "Waiting additional time for Next.js to build and start..."
    sleep 30
    
    echo "Checking frontend status..."
    docker ps | grep kiplombe_frontend || echo "Frontend not running"
    
    echo "Frontend logs (last 30 lines):"
    docker logs --tail=30 kiplombe_frontend 2>&1 | tail -20
    
    echo ""
    echo "Testing frontend on port 3000..."
    if curl -f -s http://localhost:3000/ > /dev/null 2>&1; then
        echo "✓ Frontend is responding!"
    else
        echo "✗ Frontend is still not responding"
        echo "  Try: docker logs -f kiplombe_frontend"
    fi
    
    echo ""
    echo "Testing nginx on port 80..."
    if curl -f -s http://localhost:80/ > /dev/null 2>&1; then
        echo "✓ Nginx is serving frontend!"
    else
        echo "⚠ Nginx timeout - frontend may still be building"
        echo "  Wait a bit longer and check: docker logs kiplombe_frontend"
    fi
EOF

echo ""
echo "============================================"
echo "Quick Fix Complete"
echo "============================================"
echo ""
echo "To check logs:"
echo "  ssh -i $SSH_KEY_PATH $SSH_USER@$SERVER_IP 'cd $APP_DIR && docker logs -f kiplombe_frontend'"
echo ""

