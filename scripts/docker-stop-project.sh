#!/bin/bash
# Stop and remove containers for a specific Docker Compose project
# Usage: ./docker-stop-project.sh [project_name]

PROJECT_NAME=${1:-transelgon}

echo "Stopping and removing containers for project: $PROJECT_NAME"
docker compose -p "$PROJECT_NAME" down

echo ""
echo "Remaining containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Label \"com.docker.compose.project\"}}"
