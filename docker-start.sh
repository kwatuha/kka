#!/bin/bash

# Docker Start Script for Kiplombe Medical Centre HMIS

echo "🚀 Starting Kiplombe Medical Centre HMIS with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Build and start services
echo "📦 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo "   MySQL:    localhost:3307"
echo ""
echo "📝 View logs: docker-compose logs -f"
echo "🛑 Stop:     docker-compose down"
echo ""
