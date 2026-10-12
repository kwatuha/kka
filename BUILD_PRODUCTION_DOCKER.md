# Building and Running in Production Mode with Docker

This guide explains how to run the Next.js app in production mode using Docker for faster performance during demos.

## Quick Start Options

### Option 1: Use Production Docker Compose (Recommended for True Production)

This uses a proper multi-stage production build with optimized images.

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f frontend
```

**Note:** This uses separate container names (`kiplombe_frontend_prod`, `kiplombe_api_prod`) and runs on a different setup. It requires nginx as a reverse proxy.

**Access:** http://localhost (via nginx) or configure port mapping

---

### Option 2: Build Production in Development Container (Easier for Testing)

This builds the production version inside your existing development container.

#### Step 1: Build the production version inside the container

```bash
# Build the app in production mode inside the container
docker exec kiplombe_frontend npm run build
```

#### Step 2: Restart with production server

```bash
# Stop the current dev server
docker-compose stop frontend

# Start with production server command
docker exec -d kiplombe_frontend npm start
```

Or restart the container to run production:

```bash
# Restart frontend container with production command
docker-compose restart frontend
docker exec kiplombe_frontend sh -c "npm run build && npm start"
```

---

### Option 3: Modify docker-compose.yml Temporarily

You can temporarily modify `docker-compose.yml` to run in production mode:

```bash
# 1. Stop current containers
docker-compose down

# 2. Edit docker-compose.yml - change the frontend service:
#    - Set NODE_ENV: production
#    - Change command to: npm run build && npm start
#    - Remove volume mount for .next (line: - /app/.next)

# 3. Rebuild and start
docker-compose up -d --build
```

**Then revert when done developing.**

---

## Recommended Approach for Demo/Testing

The easiest way for quick demos without full production setup:

```bash
# 1. Build production version inside running container
docker exec kiplombe_frontend npm run build

# 2. Stop dev server and start production server
docker-compose exec frontend sh -c "pkill -f 'next dev' || true"
docker-compose exec -d frontend npm start

# Access at: http://localhost:3002
```

**To switch back to development:**

```bash
# Restart the frontend container (will use dev mode from Dockerfile)
docker-compose restart frontend
```

---

## Create a Helper Script

Create a script to make switching easier:

```bash
#!/bin/bash
# save as: docker-prod-mode.sh

MODE=${1:-production}

if [ "$MODE" == "production" ]; then
    echo "Building production version..."
    docker exec kiplombe_frontend npm run build
    echo "Starting production server..."
    docker-compose exec frontend sh -c "pkill -f 'next dev' || true; npm start"
    echo "✅ Running in production mode at http://localhost:3002"
elif [ "$MODE" == "development" ]; then
    echo "Switching back to development mode..."
    docker-compose restart frontend
    echo "✅ Running in development mode at http://localhost:3002"
else
    echo "Usage: ./docker-prod-mode.sh [production|development]"
fi
```

Make it executable:
```bash
chmod +x docker-prod-mode.sh
```

Then use:
```bash
./docker-prod-mode.sh production   # Switch to production
./docker-prod-mode.sh development  # Switch back to dev
```

---

## Full Production Setup (docker-compose.prod.yml)

For a complete production environment with nginx reverse proxy:

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Note:** You may need to configure nginx and ports differently for this setup.

---

## Performance Comparison

### Development Mode (Current)
- Routes compile on-demand (first access is slow)
- Hot module replacement enabled
- Slower initial page loads
- Better for active development

### Production Mode
- All routes pre-compiled during build
- No hot reload
- Faster page loads
- Better for demos/testing performance

---

## Troubleshooting

### Container won't start after build
```bash
# Check logs
docker-compose logs frontend

# Rebuild from scratch
docker-compose down
docker-compose up -d --build frontend
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :3002

# Stop conflicting containers
docker-compose down
```

### Build fails with memory errors
```bash
# Increase Docker memory limit in Docker Desktop settings
# Or use production docker-compose which has better memory management
```

### Changes not reflecting
```bash
# In production mode, you need to rebuild:
docker exec kiplombe_frontend npm run build

# Or restart in development mode for hot reload
docker-compose restart frontend
```



