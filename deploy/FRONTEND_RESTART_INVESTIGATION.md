# Frontend Restart Investigation Results

## Root Cause Identified

The frontend container keeps restarting/rebuilding due to **memory exhaustion**:

### Problem
- **Memory usage**: 99.90% (1023MiB / 1GiB limit)
- **Process status**: "Killed" (found in logs)
- **Container behavior**: Build starts → Memory spikes → Hits limit → Process killed → Container restarts → Cycle repeats

### Evidence
1. Memory at 99.90% of 1GB limit
2. Logs show "Killed" message
3. Container restarts before build completes
4. No `.next/standalone` directory (build never finishes)
5. Health check fails because server never starts

## Solution

### Increase Memory Limit

Update `docker-compose.deploy.yml`:

```yaml
frontend:
  # ... other config ...
  deploy:
    resources:
      limits:
        memory: 2G  # Increased from 1G
      reservations:
        memory: 1G  # Increased from 512M
```

### Why This Happens

Next.js builds are memory-intensive:
- TypeScript compilation
- Webpack bundling
- Code optimization
- Tree shaking
- Minification

A 1GB limit is insufficient for large Next.js applications during the build phase.

## Fix Script

Run the automated fix:

```bash
./deploy/fix-frontend-memory.sh 41.89.173.8 ~/.ssh/id_asusme
```

Or manually:
1. Find docker-compose file: `find ~ -name docker-compose.deploy.yml | grep -v backup`
2. Update memory limit to 2G
3. Restart: `docker compose -f docker-compose.deploy.yml up -d --force-recreate frontend`

## After Fix

Once memory is increased:
1. Build will complete successfully
2. Container will stop restarting
3. Health check will pass
4. 502 errors will stop

## Monitoring

After applying the fix, monitor:
```bash
# Watch memory usage
docker stats kiplombe_frontend

# Watch build progress
docker logs -f kiplombe_frontend

# Check if build completes
docker exec kiplombe_frontend ls -la /app/.next/standalone
```

## Prevention

The auto-healing script will now:
- Detect when frontend is unhealthy
- Restart it (but won't help if memory limit is too low)
- Monitor connectivity

For future deployments, ensure memory limits are adequate for build processes.





