#!/bin/bash

# Setup script to install auto-healing as a cron job on the server
# Usage: ./setup-auto-healing.sh [server_ip] [ssh_key]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="${1:-41.89.173.8}"
SSH_KEY="${2:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"

SSH_KEY="${SSH_KEY/#\~/$HOME}"

if [ ! -f "$SSH_KEY" ]; then
    echo "Error: SSH key not found: $SSH_KEY"
    exit 1
fi

ssh_cmd() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
}

echo -e "${BLUE}Setting up auto-healing on server...${NC}"
echo ""

# Upload the auto-heal script
echo "📤 Uploading auto-heal script..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no deploy/auto-heal-containers.sh "$SSH_USER@$SERVER_IP:/home/$SSH_USER/auto-heal-containers.sh"

# Make it executable
ssh_cmd "chmod +x /home/$SSH_USER/auto-heal-containers.sh"

# Check if cron job already exists
cron_output=$(ssh_cmd "crontab -l 2>/dev/null || echo ''")
cron_exists=$(echo "$cron_output" | grep -c 'auto-heal-containers.sh' || echo '0')

if [ "$cron_exists" = "0" ] || [ -z "$cron_output" ]; then
    echo "📅 Adding cron job (runs every 5 minutes)..."

    # Add cron job
    (ssh_cmd "crontab -l 2>/dev/null || echo ''"; echo "*/5 * * * * /home/$SSH_USER/auto-heal-containers.sh >> /home/$SSH_USER/auto-heal.log 2>&1") | ssh_cmd "crontab -"

    echo -e "${GREEN}✓ Cron job added${NC}"
    echo "   Runs every 5 minutes"
    echo "   Logs to: /home/$SSH_USER/auto-heal.log"
else
    echo -e "${YELLOW}⚠ Cron job already exists${NC}"
fi

# Also add a daily diagnostic
echo ""
echo "📅 Adding daily diagnostic (runs at 2 AM)..."
diagnostic_output=$(ssh_cmd "crontab -l 2>/dev/null || echo ''")
diagnostic_exists=$(echo "$diagnostic_output" | grep -c 'diagnose-bad-gateway.sh' || echo '0')

if [ "$diagnostic_exists" = "0" ] || [ -z "$diagnostic_output" ]; then
    # Upload diagnostic script
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no deploy/diagnose-bad-gateway.sh "$SSH_USER@$SERVER_IP:/home/$SSH_USER/diagnose-bad-gateway.sh"
    ssh_cmd "chmod +x /home/$SSH_USER/diagnose-bad-gateway.sh"

    # Add cron job
    (ssh_cmd "crontab -l 2>/dev/null || echo ''"; echo "0 2 * * * /home/$SSH_USER/diagnose-bad-gateway.sh >> /home/$SSH_USER/diagnostic.log 2>&1") | ssh_cmd "crontab -"

    echo -e "${GREEN}✓ Daily diagnostic added${NC}"
    echo "   Runs daily at 2 AM"
    echo "   Logs to: /home/$SSH_USER/diagnostic.log"
else
    echo -e "${YELLOW}⚠ Daily diagnostic already exists${NC}"
fi

echo ""
echo -e "${GREEN}✓ Auto-healing setup complete!${NC}"
echo ""
echo "To view logs:"
echo "  ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'tail -f /home/$SSH_USER/auto-heal.log'"
echo ""
echo "To view current cron jobs:"
echo "  ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'crontab -l'"
echo ""

