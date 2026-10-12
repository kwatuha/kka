# Deployment Architecture Notes

## Runtime Dependency Installation Strategy

### Why Install Dependencies at Runtime?

**Problem:** Installing dependencies during `docker build` can:
- Take 10-30+ minutes (or never complete)
- Cause Docker build timeouts
- Make deployments slow and unreliable
- Waste resources rebuilding images unnecessarily

**Solution:** Install dependencies AFTER container creation but BEFORE app startup

### How It Works

1. **Dockerfile.prod** - Lightweight build
   - Only copies files (fast)
   - Doesn't run `npm install` during build
   - Includes entrypoint script that handles runtime installation

2. **docker-entrypoint-prod.sh** - Runtime installer
   - Checks if `node_modules` exists
   - If not, runs `npm install --legacy-peer-deps`
   - Builds Next.js application if `.next` doesn't exist
   - Starts the server

3. **docker-compose.deploy.yml**
   - Increased `start_period` in healthcheck to 600s (10 minutes)
   - Allows time for dependency installation and build

4. **remote-deploy.sh**
   - Monitors logs during deployment
   - Tracks dependency installation progress
   - Waits for completion before verification

### Timing Breakdown

| Phase | Time | Description |
|-------|------|-------------|
| Docker Build | 1-2 min | Fast - just copies files |
| Container Start | 5-10 sec | Instant |
| Dependency Install | 3-5 min | `npm install --legacy-peer-deps` |
| Next.js Build | 2-4 min | `npm run build` |
| Server Start | 10-30 sec | Next.js server initialization |
| **Total** | **6-11 min** | Much faster than build-time install |

### Benefits

✅ **Fast Docker builds** - No dependency installation delays
✅ **Reliable deployments** - No build timeouts
✅ **Easier debugging** - Can check logs during installation
✅ **Flexible** - Can restart containers without full rebuild
✅ **Efficient** - Dependencies persist in container volume

### First Run vs Subsequent Runs

**First run (no node_modules):**
1. Container starts
2. Entrypoint detects missing dependencies
3. Installs dependencies (3-5 min)
4. Builds Next.js (2-4 min)
5. Starts server

**Subsequent runs (dependencies exist):**
1. Container starts
2. Entrypoint detects existing dependencies
3. Skips installation
4. Checks for build
5. Starts server (or rebuilds if needed)

**Restart (dependencies exist):**
1. Container restarts
2. Dependencies already installed
3. Server starts immediately (< 1 min)

## Configuration

### Environment Variables

The entrypoint script respects these environment variables:

- `NEXT_PUBLIC_API_URL` - API URL for frontend (set during build)
- `DOCKER_BUILD` - Set to `true` to enable standalone build mode
- `NODE_ENV` - Set to `production` for production builds

### Dockerfile Configuration

The `Dockerfile.prod`:
- Uses `node:18-alpine` base image
- Installs `bash`, `curl`, `wget` for entrypoint script
- Copies application code (fast)
- Sets up entrypoint that handles runtime installation

### Healthcheck Configuration

Healthcheck is configured with:
- `start_period: 600s` (10 minutes) - Allows time for installation
- `interval: 30s` - Checks every 30 seconds
- `retries: 5` - Tries 5 times before marking unhealthy

## Troubleshooting

### Dependencies Taking Too Long

If installation is stuck:
```bash
docker logs -f kiplombe_frontend
# Look for npm install progress or errors
```

If it's really stuck, restart:
```bash
docker restart kiplombe_frontend
```

### Build Failing

If Next.js build fails:
```bash
docker exec -it kiplombe_frontend sh
cd /app
npm run build  # See detailed error messages
```

### Dependencies Not Persisting

If dependencies disappear after restart:
- Check if volume mounts are configured correctly
- Verify container is using same image
- Check for `--no-cache` flags that might rebuild

### Speeding Up Subsequent Deployments

To speed up deployments when dependencies haven't changed:
1. Keep container running (don't remove it)
2. Just restart: `docker restart kiplombe_frontend`
3. Or update code only: The entrypoint will detect existing dependencies

## Alternative Approaches

If runtime installation doesn't work for your use case, you can:

1. **Use Docker layer caching** - Build with cache:
   ```bash
   docker build --cache-from kiplombe_frontend -t kiplombe_frontend .
   ```

2. **Pre-build dependencies** - Use a dependency layer:
   ```dockerfile
   COPY package*.json ./
   RUN npm ci --legacy-peer-deps  # Only runs when package.json changes
   ```

3. **Use BuildKit cache mounts** (already configured):
   ```dockerfile
   RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
   ```

The runtime installation approach is recommended for:
- Environments where builds timeout
- Frequent code deployments
- When dependency changes are infrequent










