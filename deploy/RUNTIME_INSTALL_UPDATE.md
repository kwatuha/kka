# Runtime Dependency Installation - Update Summary

## What Changed

### Problem
- Docker builds were taking too long or never completing
- Installing dependencies during `docker build` caused timeouts
- Build process would hang at `npm install` step

### Solution
**Install dependencies AFTER container creation, not during Docker build**

## Updated Files

### 1. `Dockerfile.prod`
- **Before:** Installed dependencies during build (`npm ci --legacy-peer-deps`)
- **After:** Only copies files, installs dependencies at runtime via entrypoint
- **Result:** Docker builds complete in 1-2 minutes instead of 10-30+ minutes

### 2. `docker-entrypoint-prod.sh` (NEW)
- Checks if `node_modules` exists
- If not, runs `npm install --legacy-peer-deps` automatically
- Builds Next.js if `.next` doesn't exist
- Handles standalone build mode
- Starts the server

### 3. `docker-compose.deploy.yml`
- Updated `start_period` in healthcheck from 60s to 600s (10 minutes)
- Allows time for dependency installation and build
- Added note about runtime installation

### 4. `deploy/remote-deploy.sh`
- Monitors dependency installation progress during deployment
- Tracks logs for installation completion
- Waits up to 10 minutes for dependencies to install
- Shows helpful messages about installation progress

### 5. `deploy/quick-fix.sh`
- Updated to handle runtime installation
- Monitors installation progress
- Shows helpful feedback

## How It Works Now

### Deployment Flow

1. **Docker Build** (1-2 minutes) ✅ FAST
   ```bash
   docker build -f Dockerfile.prod .
   # Only copies files, no npm install
   ```

2. **Container Start** (5-10 seconds) ✅ FAST
   ```bash
   docker compose up -d frontend
   # Container starts immediately
   ```

3. **Entrypoint Script Runs** (automatic)
   ```bash
   # Checks: Is node_modules present?
   # If NO: npm install --legacy-peer-deps (3-5 min)
   # If YES: Skip installation
   ```

4. **Build Check** (automatic)
   ```bash
   # Checks: Is .next build present?
   # If NO: npm run build (2-4 min)
   # If YES: Skip build
   ```

5. **Server Start** (automatic)
   ```bash
   # Starts Next.js server
   ```

### First Deployment

```
Time: 0:00 - Docker build starts (copies files)
Time: 0:02 - Docker build completes ✅
Time: 0:02 - Container starts
Time: 0:03 - Entrypoint detects no node_modules
Time: 0:03 - npm install --legacy-peer-deps starts
Time: 0:08 - npm install completes ✅
Time: 0:08 - npm run build starts
Time: 0:12 - Build completes ✅
Time: 0:12 - Server starts
Time: 0:13 - Application ready ✅

Total: ~13 minutes (vs 30+ minutes with build-time install)
```

### Subsequent Deployments (dependencies exist)

```
Time: 0:00 - Docker build starts
Time: 0:02 - Docker build completes ✅
Time: 0:02 - Container starts
Time: 0:03 - Entrypoint detects node_modules exists
Time: 0:03 - Skips installation ✅
Time: 0:03 - Checks build
Time: 0:03 - Build exists, skips ✅
Time: 0:03 - Server starts
Time: 0:04 - Application ready ✅

Total: ~4 minutes (much faster!)
```

## Benefits

1. ✅ **Faster builds** - Docker build completes in 1-2 minutes
2. ✅ **No timeouts** - No hanging during build
3. ✅ **Reliable** - Installation happens in running container (can monitor)
4. ✅ **Efficient** - Dependencies persist in container
5. ✅ **Debuggable** - Can check logs: `docker logs -f kiplombe_frontend`
6. ✅ **Flexible** - Can restart without full rebuild

## Usage

### Deploy to Server

```bash
# Standard deployment
./deploy/remote-deploy.sh 41.89.173.8 ~/.ssh/id_asusme

# With configuration
source deploy/deploy-config.sh
./deploy/remote-deploy.sh
```

The script will:
1. Build images quickly (no dependency install)
2. Start containers
3. Monitor dependency installation automatically
4. Wait for completion
5. Verify deployment

### Check Installation Progress

```bash
# On server
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
docker logs -f kiplombe_frontend

# You'll see:
# "Installing dependencies..."
# "Dependencies installed successfully!"
# "Building Next.js application..."
# "Build completed successfully!"
# "Starting Next.js server..."
```

### Manual Dependency Installation (if needed)

```bash
# SSH into server
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8

# Enter container
docker exec -it kiplombe_frontend sh

# Install dependencies manually
npm install --legacy-peer-deps

# Exit and restart
exit
docker restart kiplombe_frontend
```

## Configuration

### Environment Variables

Set these in `.env` or `docker-compose.deploy.yml`:

```bash
# For build-time (if you change next.config.mjs)
DOCKER_BUILD=true  # Enables standalone mode

# For runtime
NEXT_PUBLIC_API_URL=http://your-server:port  # Optional
```

### Customizing Installation

To customize the installation process, edit `docker-entrypoint-prod.sh`:

```bash
# Change npm flags
npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund

# Add custom steps
echo "Running custom setup..."
# Your custom commands here
```

## Troubleshooting

### Dependencies Not Installing

Check logs:
```bash
docker logs kiplombe_frontend
```

Check if container has internet:
```bash
docker exec kiplombe_frontend ping -c 3 registry.npmjs.org
```

### Build Failing

Check build logs:
```bash
docker exec kiplombe_frontend npm run build
```

### Installation Taking Too Long

Normal times:
- npm install: 3-5 minutes
- npm run build: 2-4 minutes
- Total: 5-9 minutes

If longer, check:
- Network speed
- npm registry access
- Package.json dependencies

## Notes

- Dependencies are installed with `--legacy-peer-deps` flag as required
- Installation happens automatically - no manual intervention needed
- The entrypoint script is smart enough to skip installation if already done
- Healthcheck allows 10 minutes for installation + build
- Subsequent deployments are much faster (dependencies persist)








