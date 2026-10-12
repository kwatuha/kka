# Preventing Bad Gateway Errors

## Common Causes

Bad Gateway (502/504) errors that require server restart are typically caused by:

1. **Container Crashes**: Containers becoming unhealthy or crashing
2. **Memory Exhaustion**: OOM (Out-of-Memory) kills
3. **Disk Space**: Running out of disk space
4. **Database Connection Pool**: Too many connections
5. **Network Issues**: Containers losing connectivity
6. **Docker Daemon Issues**: Docker daemon becoming unresponsive

## Prevention Strategies

### 1. Resource Limits

The `docker-compose.deploy.yml` now includes memory limits:
- **Nginx**: 256MB limit, 128MB reservation
- **API**: 1GB limit, 512MB reservation
- **Frontend**: 1GB limit, 512MB reservation
- **MySQL**: 512MB limit, 256MB reservation

This prevents any single container from consuming all system memory.

### 2. Health Checks

All containers now have health checks:
- **Nginx**: Checks `/health` endpoint
- **API**: Checks root endpoint
- **Frontend**: Checks root endpoint
- **MySQL**: Checks database connectivity

Docker will automatically restart unhealthy containers.

### 3. Auto-Healing Script

The `auto-heal-containers.sh` script:
- Checks container health every 5 minutes (via cron)
- Automatically restarts unhealthy containers
- Checks connectivity between services
- Cleans up Docker if disk space is low

**Setup:**
```bash
./deploy/setup-auto-healing.sh 41.89.173.8 ~/.ssh/id_asusme
```

### 4. Diagnostic Script

The `diagnose-bad-gateway.sh` script provides comprehensive diagnostics:
- Container status and health
- Resource usage (memory, disk)
- Network connectivity
- Database connections
- Recent errors
- OOM kills

**Run manually:**
```bash
./deploy/diagnose-bad-gateway.sh 41.89.173.8 ~/.ssh/id_asusme
```

**Or on server:**
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
./diagnose-bad-gateway.sh
```

### 5. Improved Nginx Configuration

The Nginx config includes:
- Increased timeouts (60s) to prevent premature disconnections
- Better buffer settings for large responses
- Health check endpoint at `/health`

### 6. Restart Policies

All containers use `restart: unless-stopped`, which means:
- Containers automatically restart on failure
- Containers restart after server reboot
- Manual stops are respected

## Monitoring

### Check Container Status
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker ps -a'
```

### Check Container Health
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker inspect --format="{{.State.Health.Status}}" kiplombe_nginx kiplombe_frontend kiplombe_api kiplombe_mysql'
```

### View Auto-Heal Logs
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'tail -f /home/fhir/auto-heal.log'
```

### View Diagnostic Logs
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'tail -f /home/fhir/diagnostic.log'
```

## Manual Recovery

If auto-healing doesn't work, try these steps:

1. **Restart specific container:**
   ```bash
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker restart kiplombe_nginx'
   ```

2. **Restart all containers:**
   ```bash
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker restart kiplombe_nginx kiplombe_frontend kiplombe_api'
   ```

3. **Check logs:**
   ```bash
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker logs --tail 100 kiplombe_nginx'
   ```

4. **Free up disk space:**
   ```bash
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'docker system prune -f'
   ```

5. **Restart Docker daemon (last resort):**
   ```bash
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'sudo systemctl restart docker'
   ```

## Best Practices

1. **Monitor regularly**: Check diagnostic logs weekly
2. **Keep disk space**: Ensure at least 20% free space
3. **Update regularly**: Keep Docker and containers updated
4. **Backup data**: Regular backups of MySQL data
5. **Resource monitoring**: Monitor server resources (CPU, memory, disk)

## Troubleshooting

### If containers keep restarting:
1. Check logs: `docker logs <container_name>`
2. Check resources: `docker stats`
3. Check disk space: `df -h`
4. Run diagnostic: `./diagnose-bad-gateway.sh`

### If Nginx can't reach backend:
1. Check network: `docker network inspect kiplombe_network`
2. Check container names match in nginx.conf
3. Restart Nginx: `docker restart kiplombe_nginx`

### If database connections fail:
1. Check MySQL logs: `docker logs kiplombe_mysql`
2. Check connection pool settings in API
3. Restart MySQL: `docker restart kiplombe_mysql`





