# Fast Deployment Options for Minor Code Changes

## Current Problem

The frontend container rebuilds everything on each deployment:
- Installs dependencies (3-5 min)
- Builds Next.js (5-15 min)
- Total: 8-20 minutes per deployment

## Solution Options

### Option 1: Volume Mounts (Fastest - Recommended for Minor Changes)

Mount source code as volumes so changes are reflected immediately without rebuilds.

**Pros:**
- Instant updates (no rebuild needed)
- Fast iteration
- Can use Next.js dev mode or keep production build

**Cons:**
- Less isolated (code changes affect running container)
- Requires node_modules to persist
- Not as "production-like"

**Implementation:**
Create `docker-compose.fast-deploy.yml`:

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile.prod
  container_name: kiplombe_frontend
  restart: unless-stopped
  volumes:
    # Mount source code
    - ./app:/app/app:ro
    - ./components:/app/components:ro
    - ./lib:/app/lib:ro
    - ./public:/app/public:ro
    - ./styles:/app/styles:ro
    # Persist node_modules (don't overwrite)
    - frontend_node_modules:/app/node_modules
    # Persist .next build (for faster rebuilds)
    - frontend_next_build:/app/.next
  environment:
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-}
    HOSTNAME: "0.0.0.0"
  # Use a script that checks for changes and rebuilds only if needed
  command: /app/docker-entrypoint-fast.sh
```

### Option 2: Incremental Builds with Better Caching

Optimize Docker build cache to reuse layers.

**Pros:**
- Faster builds (only changed layers rebuild)
- Still fully containerized
- Production-ready

**Cons:**
- Still requires build time (but faster)
- Need to manage cache properly

**Implementation:**
- Use `.dockerignore` effectively
- Layer dependencies separately from code
- Use build cache mounts

### Option 3: Hybrid Approach (Best of Both)

Use volume mounts for development/staging, full builds for production.

**Pros:**
- Fast iteration during development
- Full builds for production releases
- Flexible workflow

**Cons:**
- Need to manage two deployment modes
- More complex setup

### Option 4: Next.js Standalone with Incremental Updates

Keep the standalone build and only update changed files.

**Pros:**
- Fast updates
- Production-ready
- Minimal downtime

**Cons:**
- More complex implementation
- Need to handle static files carefully

## Recommended Solution: Fast Deploy Script

Create a script that:
1. Uses volume mounts for code
2. Only rebuilds if dependencies change
3. Restarts container to pick up changes

This gives you:
- **Minor code changes**: < 30 seconds (just restart)
- **Dependency changes**: 3-5 minutes (npm install)
- **Major changes**: Full rebuild (8-15 minutes)

## Implementation

I'll create:
1. `docker-compose.fast-deploy.yml` - Volume mount configuration
2. `docker-entrypoint-fast.sh` - Smart entrypoint that checks for changes
3. `deploy/fast-update.sh` - Script for quick code updates





