#!/bin/bash

# Safe Docker cleanup script
# Removes unused Docker resources to free up disk space
# Usage: ./cleanup-docker.sh [server_ip] [ssh_key] [--aggressive]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

AGGRESSIVE=false
if [ "$3" = "--aggressive" ] || [ "$1" = "--aggressive" ]; then
    AGGRESSIVE=true
fi

# Check if running on server or locally
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SERVER_MODE=true
elif [ -n "$1" ] && [ "$1" != "--aggressive" ]; then
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
    echo "Usage: $0 [server_ip] [ssh_key] [--aggressive]"
    echo "   Or run on server directly: $0 [--aggressive]"
    exit 1
fi

if [ "$SERVER_MODE" = true ]; then
    docker_cmd() { docker "$@"; }
else
    docker_cmd() { ssh_cmd "docker $@"; }
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

# Show current disk usage
print_header "Current Docker Disk Usage"
docker_cmd system df

echo ""
read -p "Continue with cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Step 1: Remove stopped containers
print_header "Step 1: Removing Stopped Containers"
stopped_count=$(docker_cmd ps -a -f "status=exited" -q | wc -l)
if [ "$stopped_count" -gt 0 ]; then
    echo "Removing $stopped_count stopped containers..."
    docker_cmd container prune -f
    echo -e "${GREEN}✓ Stopped containers removed${NC}"
else
    echo -e "${GREEN}✓ No stopped containers to remove${NC}"
fi

# Step 2: Remove dangling images
print_header "Step 2: Removing Dangling Images"
dangling_count=$(docker_cmd images -f "dangling=true" -q | wc -l)
if [ "$dangling_count" -gt 0 ]; then
    echo "Removing $dangling_count dangling images..."
    docker_cmd image prune -f
    echo -e "${GREEN}✓ Dangling images removed${NC}"
else
    echo -e "${GREEN}✓ No dangling images to remove${NC}"
fi

# Step 3: Remove build cache
print_header "Step 3: Removing Build Cache"
docker_cmd builder prune -f
echo -e "${GREEN}✓ Build cache removed${NC}"

# Step 4: Remove unused volumes (with warning)
print_header "Step 4: Removing Unused Volumes"
unused_volumes=$(docker_cmd volume ls -f "dangling=true" -q | wc -l)
if [ "$unused_volumes" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $unused_volumes unused volumes${NC}"
    echo "This will delete unused volumes and their data."
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker_cmd volume prune -f
        echo -e "${GREEN}✓ Unused volumes removed${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped volume cleanup${NC}"
    fi
else
    echo -e "${GREEN}✓ No unused volumes to remove${NC}"
fi

# Step 5: Remove unused images (aggressive mode only)
if [ "$AGGRESSIVE" = true ]; then
    print_header "Step 5: Removing All Unused Images (Aggressive)"
    echo -e "${YELLOW}⚠ This will remove ALL images not used by running containers${NC}"
    echo "This may remove images you might need later."
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker_cmd image prune -a -f
        echo -e "${GREEN}✓ Unused images removed${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped aggressive image cleanup${NC}"
    fi
else
    print_section "Step 5: Aggressive Cleanup (Skipped)"
    echo "To remove all unused images, run with --aggressive flag:"
    echo "  $0 $@ --aggressive"
fi

# Final disk usage
print_header "Final Docker Disk Usage"
docker_cmd system df

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo ""





