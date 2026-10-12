#!/bin/sh
set -e

# Check if node_modules exists and has next installed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/next" ]; then
  echo "Installing dependencies..."
  npm install --legacy-peer-deps
fi

# Execute the command passed to the entrypoint
exec "$@"

