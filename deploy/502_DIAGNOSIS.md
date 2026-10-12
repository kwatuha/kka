# 502 Bad Gateway Diagnosis and Fix

## Problem
502 Bad Gateway errors occurred during deployment startup.

## Root Cause Analysis

### ✅ Memory Status
- **Memory Limits**: Correctly set to 2GB limit, 1GB reservation
- **Current Usage**: 189.1MiB / 2GiB (9.23%) - **NOT a memory issue**
- **System Memory**: 7.3Gi available out of 8.6Gi total - **Plenty available**
- **No OOM Kills**: No out-of-memory kills detected

### 🔍 Actual Issue
The 502 errors occurred during **startup** when:
1. Nginx started before the frontend was ready
2. Nginx tried to connect to `frontend:3000` but the Next.js server wasn't listening yet
3. Connection refused errors appeared in nginx logs at 11:43:12 and 11:43:18
4. Once frontend finished building and started, everything worked correctly

### ✅ Current Status
- Frontend is now **healthy** and responding correctly
- All containers are running properly
- HTTP Status: 200 (working)

## Fixes Applied

### 1. Updated Nginx Configuration (`deploy/nginx.conf`)
- **Increased timeouts**: `proxy_connect_timeout` from 60s to 90s
- **Added retry logic**: `proxy_next_upstream` with 3 retries
- **Better upstream configuration**: Added `max_fails` and `fail_timeout` to upstream server

### 2. Updated Docker Compose (`docker-compose.deploy.yml`)
- **Health check dependency**: Nginx now waits for frontend to be healthy before starting
- **Increased nginx start_period**: From 10s to 120s to allow frontend to be ready

## Changes Made

### `deploy/nginx.conf`
```nginx
upstream frontend {
    server kiplombe_frontend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
    keepalive_timeout 60s;
}

location / {
    proxy_connect_timeout 90s;
    proxy_send_timeout 90s;
    proxy_read_timeout 90s;

    proxy_next_upstream error timeout http_502 http_503;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 30s;
}
```

### `docker-compose.deploy.yml`
```yaml
nginx:
  depends_on:
    frontend:
      condition: service_healthy
    api:
      condition: service_healthy
  healthcheck:
    start_period: 120s  # Wait for frontend to be ready
```

## Deployment

To apply these fixes:

```bash
# 1. Upload updated files
scp -i ~/.ssh/id_asusme deploy/nginx.conf fhir@41.89.173.8:~/kiplombe-hmis/deploy/nginx.conf
scp -i ~/.ssh/id_asusme docker-compose.deploy.yml fhir@41.89.173.8:~/kiplombe-hmis/docker-compose.deploy.yml

# 2. Restart nginx on server
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'cd ~/kiplombe-hmis && docker compose -f docker-compose.deploy.yml restart nginx'
```

Or use the full deployment script which will include these changes:
```bash
./deploy/remote-deploy.sh 41.89.173.8 ~/.ssh/id_asusme
```

## Prevention

These changes will:
1. ✅ Prevent 502 errors during startup by making nginx wait for frontend
2. ✅ Add retry logic for transient connection issues
3. ✅ Increase timeouts to handle slow startup scenarios
4. ✅ Better error handling with upstream fail detection

## Monitoring

To monitor for 502 errors:
```bash
# Check nginx error logs
docker logs kiplombe_nginx 2>&1 | grep -i "502\|bad gateway\|upstream"

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}" | grep kiplombe

# Test connectivity
curl -I http://41.89.173.8/
```

## Summary

- **Memory**: ✅ Sufficient (2GB limit, only 9% used)
- **Issue**: ⚠️ Startup timing (nginx starting before frontend ready)
- **Fix**: ✅ Health check dependencies + retry logic + increased timeouts
- **Status**: ✅ Currently working, fixes prevent future occurrences


