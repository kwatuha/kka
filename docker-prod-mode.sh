#!/bin/bash
# Helper script to switch between development and production mode in Docker

MODE=${1:-production}
CONTAINER_NAME="kiplombe_frontend"

if [ "$MODE" == "production" ]; then
    echo "🔨 Building production version..."
    docker exec $CONTAINER_NAME npm run build
    echo "🛑 Stopping dev server..."
    docker exec $CONTAINER_NAME sh -c "pkill -f 'next dev' || true"
    sleep 2
    echo "🚀 Starting production server..."
    docker exec -d $CONTAINER_NAME npm start
    echo "✅ Running in PRODUCTION mode at http://localhost:3002"
    echo "   All routes are pre-compiled for faster performance"
elif [ "$MODE" == "development" ]; then
    echo "🔄 Switching back to development mode..."
    docker-compose restart frontend
    echo "✅ Running in DEVELOPMENT mode at http://localhost:3002"
    echo "   Hot reload enabled - changes will reflect automatically"
else
    echo "Usage: ./docker-prod-mode.sh [production|development]"
    echo ""
    echo "Examples:"
    echo "  ./docker-prod-mode.sh production    # Switch to production mode"
    echo "  ./docker-prod-mode.sh development   # Switch back to development"
fi
