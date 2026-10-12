#!/bin/bash

# Script to check Docker disk usage and identify cleanup opportunities
# Usage: ./check-docker-disk-usage.sh [server_ip] [ssh_key]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running on server or locally
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SERVER_MODE=true
elif [ -n "$1" ] && [ -n "$2" ]; then
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
    echo "Usage: $0 [server_ip] [ssh_key]"
    echo "   Or run on server directly: $0"
    exit 1
fi

if [ "$SERVER_MODE" = true ]; then
    docker_cmd() { docker "$@"; }
    run_cmd() { "$@"; }
else
    docker_cmd() { ssh_cmd "docker $@"; }
    run_cmd() { ssh_cmd "$@"; }
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

echo -e "${BLUE}Docker Disk Usage Analysis${NC}"
echo ""

# Overall Docker disk usage
print_header "1. Overall Docker Disk Usage"
docker_cmd system df

# Detailed breakdown
print_header "2. Detailed Breakdown"

# Images
print_section "Docker Images"
echo "Total images and their sizes:"
docker_cmd images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -20
echo ""
image_count=$(docker_cmd images -q | wc -l)
echo "Total images: $image_count"

# Containers
print_section "Docker Containers"
echo "All containers (running and stopped):"
docker_cmd ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""
container_count=$(docker_cmd ps -a -q | wc -l)
stopped_count=$(docker_cmd ps -a -f "status=exited" -q | wc -l)
echo "Total containers: $container_count"
echo "Stopped containers: $stopped_count"

# Volumes
print_section "Docker Volumes"
echo "All volumes:"
docker_cmd volume ls
echo ""
volume_count=$(docker_cmd volume ls -q | wc -l)
echo "Total volumes: $volume_count"

# Networks (usually small, but check)
print_section "Docker Networks"
docker_cmd network ls
network_count=$(docker_cmd network ls -q | wc -l)
echo "Total networks: $network_count"

# Build cache
print_section "Build Cache"
build_cache_size=$(docker_cmd system df --format "{{.Size}}" | grep -i "build cache" || echo "0B")
echo "Build cache size: $build_cache_size"

# Identify cleanup opportunities
print_header "3. Cleanup Opportunities"

# Stopped containers
if [ "$stopped_count" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $stopped_count stopped containers that can be removed:${NC}"
    docker_cmd ps -a -f "status=exited" --format "  - {{.Names}} ({{.ID}})"
    echo ""
    echo "  To remove: docker container prune -f"
else
    echo -e "${GREEN}✓ No stopped containers${NC}"
fi

# Dangling images
dangling_images=$(docker_cmd images -f "dangling=true" -q | wc -l)
if [ "$dangling_images" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $dangling_images dangling images (untagged):${NC}"
    docker_cmd images -f "dangling=true" --format "  - {{.ID}} ({{.Size}})"
    echo ""
    echo "  To remove: docker image prune -f"
else
    echo -e "${GREEN}✓ No dangling images${NC}"
fi

# Unused images (not used by any container)
print_section "Unused Images Analysis"
echo "Checking for images not used by any container..."
all_images=$(docker_cmd images --format "{{.ID}}")
used_images=""
for container in $(docker_cmd ps -a --format "{{.ID}}"); do
    container_image=$(docker_cmd inspect --format='{{.Image}}' "$container" 2>/dev/null || echo "")
    used_images="$used_images $container_image"
done

unused_count=0
for img_id in $all_images; do
    if ! echo "$used_images" | grep -q "$img_id"; then
        unused_count=$((unused_count + 1))
    fi
done

if [ "$unused_count" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Potentially $unused_count unused images${NC}"
    echo "  To remove unused images: docker image prune -a -f"
    echo "  (This will remove all images not used by containers)"
else
    echo -e "${GREEN}✓ All images appear to be in use${NC}"
fi

# Unused volumes
print_section "Unused Volumes Analysis"
unused_volumes=$(docker_cmd volume ls -f "dangling=true" -q | wc -l)
if [ "$unused_volumes" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $unused_volumes unused volumes:${NC}"
    docker_cmd volume ls -f "dangling=true"
    echo ""
    echo "  To remove: docker volume prune -f"
    echo "  ⚠️  WARNING: This will delete unused volumes and their data!"
else
    echo -e "${GREEN}✓ No unused volumes${NC}"
fi

# Build cache
print_section "Build Cache"
if [ -n "$build_cache_size" ] && [ "$build_cache_size" != "0B" ]; then
    echo -e "${YELLOW}⚠ Build cache can be cleaned:${NC}"
    echo "  To remove: docker builder prune -f"
    echo "  Or for all build cache: docker builder prune -a -f"
else
    echo -e "${GREEN}✓ No build cache to clean${NC}"
fi

# Summary and recommendations
print_header "4. Cleanup Recommendations"

echo "Safe cleanup commands (in order of safety):"
echo ""
echo "1. Remove stopped containers:"
echo -e "   ${GREEN}docker container prune -f${NC}"
echo ""
echo "2. Remove dangling images:"
echo -e "   ${GREEN}docker image prune -f${NC}"
echo ""
echo "3. Remove build cache:"
echo -e "   ${GREEN}docker builder prune -f${NC}"
echo ""
echo "4. Remove unused volumes (⚠️  may delete data):"
echo -e "   ${YELLOW}docker volume prune -f${NC}"
echo ""
echo "5. Remove all unused images (⚠️  may remove needed images):"
echo -e "   ${YELLOW}docker image prune -a -f${NC}"
echo ""
echo "6. Full cleanup (everything unused):"
echo -e "   ${RED}docker system prune -a -f --volumes${NC}"
echo -e "   ${RED}⚠️  WARNING: This removes ALL unused resources including volumes!${NC}"
echo ""

# Calculate potential savings
print_header "5. Potential Disk Space Savings"

echo "Running safe cleanup to estimate savings..."
echo "(This is a dry-run, nothing will be deleted)"

# Estimate stopped containers
if [ "$stopped_count" -gt 0 ]; then
    echo "Stopped containers: ~$(docker_cmd ps -a -f "status=exited" --format "{{.Size}}" | head -1)"
fi

# Estimate dangling images
if [ "$dangling_images" -gt 0 ]; then
    dangling_size=$(docker_cmd images -f "dangling=true" --format "{{.Size}}" | head -1)
    echo "Dangling images: ~$dangling_size"
fi

echo ""
echo -e "${BLUE}To see exact space that can be freed, run:${NC}"
echo "  docker system df -v"

echo ""





