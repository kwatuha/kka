#!/bin/bash

# Safe deployment test - runs deployment and monitors progress
# This script will deploy but allows for monitoring and interruption

set -e

SERVER_IP="${1:-41.89.173.8}"
SSH_KEY_PATH="${2:-~/.ssh/id_asusme}"

echo "Starting deployment test..."
echo "This will deploy to: $SERVER_IP"
echo "Press Ctrl+C within 5 seconds to cancel..."
sleep 5

echo ""
echo "Running deployment script..."
echo "Note: This may take 10-15 minutes (dependency installation + build)"
echo ""

# Run deployment and save output to log
LOG_FILE="/tmp/deployment-$(date +%Y%m%d_%H%M%S).log"
./deploy/remote-deploy.sh "$SERVER_IP" "$SSH_KEY_PATH" 2>&1 | tee "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "============================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo "Log saved to: $LOG_FILE"
else
    echo "❌ Deployment failed with exit code: $EXIT_CODE"
    echo "Check log: $LOG_FILE"
    echo ""
    echo "Last 50 lines of log:"
    tail -50 "$LOG_FILE"
fi








