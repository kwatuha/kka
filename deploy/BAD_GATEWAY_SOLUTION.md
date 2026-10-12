# Bad Gateway Prevention Solution

## Problem
The application was experiencing Bad Gateway (502/504) errors that required server restarts to resolve.

## Root Causes Identified

1. **Container crashes** - Containers becoming unhealthy without auto-restart
2. **Memory exhaustion** - OOM (Out-of-Memory) kills
3. **Disk space** - Running out of disk space
4. **Network connectivity** - Containers losing connection to each other
5. **No health monitoring** - No automatic detection and recovery

## Solutions Implemented

### 1. Resource Limits (docker-compose.deploy.yml)
Added memory limits to prevent any container from consuming all system resources:
- **Nginx**: 256MB limit, 128MB reservation
- **API**: 1GB limit, 512MB reservation
- **Frontend**: 1GB limit, 512MB reservation
- **MySQL**: 512MB limit, 256MB reservation

### 2. Health Checks
All containers now have health checks:
- **Nginx**: Checks `/health` endpoint every 30s
- **API**: Checks root endpoint every 30s
- **Frontend**: Checks root endpoint every 30s
- **MySQL**: Checks database connectivity every 10s

Docker will automatically restart unhealthy containers.

### 3. Auto-Healing Script
Created `auto-heal-containers.sh` that:
- Checks container health every 5 minutes (via cron)
- Automatically restarts unhealthy containers
- Verifies connectivity between services
- Cleans up Docker if disk space is low (>90%)

**Setup:**
```bash
./deploy/setup-auto-healing.sh 41.89.173.8 ~/.ssh/id_asusme
```

### 4. Diagnostic Script
Created `diagnose-bad-gateway.sh` for comprehensive diagnostics:
- Container status and health
- Resource usage (memory, disk, CPU)
- Network connectivity between services
- Database connection pool status
- Recent errors in logs
- OOM kill detection

**Run:**
```bash
./deploy/diagnose-bad-gateway.sh 41.89.173.8 ~/.ssh/id_asusme
```

## Quick Start

### 1. Run Diagnostic (to see current state)
```bash
./deploy/diagnose-bad-gateway.sh 41.89.173.8 ~/.ssh/id_asusme
```

### 2. Setup Auto-Healing (one-time setup)
```bash
./deploy/setup-auto-healing.sh 41.89.173.8 ~/.ssh/id_asusme
```

This will:
- Upload auto-heal script to server
- Setup cron job to run every 5 minutes
- Setup daily diagnostic at 2 AM

### 3. Manual Auto-Heal (if needed)
```bash
# From local machine
./deploy/auto-heal-containers.sh 41.89.173.8 ~/.ssh/id_asusme

# Or on server directly
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
./auto-heal-containers.sh
```

## Monitoring

### View Auto-Heal Logs
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'tail -f /home/fhir/auto-heal.log'
```

### View Diagnostic Logs
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'tail -f /home/fhir/diagnostic.log'
```

### Check Container Status
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker ps -a'
```

### Check Container Health
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker inspect --format="{{.State.Health.Status}}" kiplombe_nginx kiplombe_frontend kiplombe_api kiplombe_mysql'
```

## Expected Behavior

### Before
- Bad Gateway errors requiring manual server restart
- No automatic recovery
- No visibility into root causes

### After
- Automatic container restart on failure
- Health checks every 30s
- Auto-healing every 5 minutes
- Daily diagnostics
- Resource limits prevent OOM kills
- Better visibility into issues

## Troubleshooting

### If auto-healing doesn't work:
1. Check cron is running: `crontab -l`
2. Check script permissions: `ls -la /home/fhir/auto-heal-containers.sh`
3. Check logs: `tail -f /home/fhir/auto-heal.log`
4. Run manually: `./auto-heal-containers.sh`

### If containers keep restarting:
1. Run diagnostic: `./diagnose-bad-gateway.sh`
2. Check logs: `docker logs <container_name>`
3. Check resources: `docker stats`
4. Check disk space: `df -h`

### If resource limits cause issues:
The `deploy.resources` syntax requires docker-compose v2+. If you get errors, you can remove the `deploy:` sections from `docker-compose.deploy.yml` - the health checks and auto-healing will still work.

## Files Created/Modified

1. **docker-compose.deploy.yml** - Added resource limits and Nginx health check
2. **deploy/auto-heal-containers.sh** - Auto-healing script
3. **deploy/diagnose-bad-gateway.sh** - Diagnostic script
4. **deploy/setup-auto-healing.sh** - Setup script for cron jobs
5. **deploy/PREVENT_BAD_GATEWAY.md** - Detailed documentation

## Next Steps

1. ✅ Run diagnostic to see current state
2. ✅ Setup auto-healing (one-time)
3. ✅ Monitor logs for a few days
4. ✅ Adjust resource limits if needed
5. ✅ Review diagnostic logs weekly

## Notes

- Auto-healing runs every 5 minutes - this is a good balance between responsiveness and resource usage
- Daily diagnostics run at 2 AM to avoid peak usage times
- Resource limits are conservative - adjust based on your server capacity
- Health checks have retries built-in to avoid false positives





