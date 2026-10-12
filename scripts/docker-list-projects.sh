#!/bin/bash
# Helper script to list Docker containers grouped by Docker Compose project
# This helps identify which containers belong to which project/folder

echo "=== Docker Containers by Project ==="
echo ""

# Get all containers with compose labels
CONTAINERS=$(docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Label \"com.docker.compose.project\"}}\t{{.Label \"com.docker.compose.project.working_dir\"}}")

if [ -z "$CONTAINERS" ]; then
  echo "No containers found."
  echo ""
else
  echo "$CONTAINERS" | \
    awk -F'\t' '{
      project = $3
      if (project == "") {
        project = "NO_PROJECT"
      }
      projects[project] = 1
      containers[project] = containers[project] "\n  " $1 " - " $2
    }
    END {
      if (length(projects) == 0) {
        print "No containers found."
      } else {
        for (p in projects) {
          print "\n[" p "]"
          if (p != "NO_PROJECT") {
            # Try to get working dir for this project
            cmd = "docker ps -a --filter \"label=com.docker.compose.project=" p "\" --format \"{{.Label \\\"com.docker.compose.project.working_dir\\\"}}\" | head -1"
            cmd | getline working_dir
            close(cmd)
            if (working_dir != "") {
              print "  Working Dir: " working_dir
            }
          }
          print containers[p]
        }
      }
    }'
fi

echo ""
echo "=== Quick Commands ==="
echo "To stop containers from a specific project:"
echo "  docker compose -p PROJECT_NAME down"
echo ""
echo "To see containers for a specific project:"
echo "  docker ps -a --filter \"label=com.docker.compose.project=PROJECT_NAME\""
