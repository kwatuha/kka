# Kiplombe HMIS Remote Deployment Guide

## Overview

This directory contains scripts for deploying the Kiplombe HMIS application to any remote server via SSH.

### Key Feature: Runtime Dependency Installation

**Important:** The deployment script uses a special approach where:
- **Dependencies are installed AFTER container creation** (not during Docker build)
- This avoids long build times and timeouts during `docker build`
- Dependencies install automatically when the container starts via the entrypoint script
- First startup takes 3-5 minutes (npm install + build), but subsequent restarts are faster

## Current Issue Analysis

Based on diagnostics, the deployed application has the following issues:

1. **Frontend container is unhealthy** - Next.js is not starting properly
   - Error: `bash: not found` and `ECONNREFUSED ::1:3000`
   - This causes Nginx to return 504 Gateway Timeout

2. **Nginx is running on port 80** (not 8081 as configured)
   - The app should be accessible at `http://41.89.173.8:80/` but getting timeout

3. **Frontend container needs to be rebuilt** - The Docker image likely has issues

## Quick Fix for Current Deployment

To fix the current deployment on the server:

```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker compose -f docker-compose.deploy.yml restart frontend
# Wait for rebuild, then check logs
docker logs -f kiplombe_frontend
```

If that doesn't work, rebuild the frontend:

```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker compose -f docker-compose.deploy.yml build --no-cache frontend
docker compose -f docker-compose.deploy.yml up -d frontend
```

## Deployment Scripts

### 1. Main Deployment Script: `remote-deploy.sh`

Deploys the latest code to any remote server.

**Usage:**
```bash
# Option 1: Pass parameters directly
./deploy/remote-deploy.sh 41.89.173.8 ~/.ssh/id_asusme

# Option 2: Use environment variables (create deploy-config.sh first)
source deploy/deploy-config.sh
./deploy/remote-deploy.sh

# Option 3: Export variables inline
export SERVER_IP=41.89.173.8
export SSH_KEY_PATH=~/.ssh/id_asusme
export SSH_USER=fhir
export NGINX_PORT=80
./deploy/remote-deploy.sh
```

**What it does:**
1. Tests SSH connection
2. Checks server prerequisites (Docker, Docker Compose)
3. Checks current deployment status
4. Creates and uploads deployment archive
5. Extracts files on server
6. **Quickly builds Docker images** (no dependency installation - fast!)
7. **Starts containers** (dependencies install automatically at runtime)
8. **Monitors dependency installation** (waits 3-5 minutes for npm install + build)
9. Verifies deployment
10. Shows final status and URLs

**Runtime Installation Process:**
- Container starts quickly (no long build wait)
- Entrypoint script detects missing dependencies
- Installs dependencies with `npm install --legacy-peer-deps`
- Builds Next.js application if needed
- Starts the server automatically

### 2. Diagnostic Script: `diagnose.sh`

Diagnoses issues with existing deployment.

**Usage:**
```bash
./deploy/diagnose.sh [SERVER_IP] [SSH_KEY_PATH]

# Example:
./deploy/diagnose.sh 41.89.173.8 ~/.ssh/id_asusme
```

**What it checks:**
- SSH connectivity
- Docker container status
- Container health status
- Network ports
- Container logs (frontend, API, nginx)
- Internal service connectivity
- Docker network configuration
- Project directory and configuration files

### 3. Configuration File: `deploy-config.sh`

Template for deployment configuration. Copy and customize:

```bash
cp deploy/deploy-config.sh deploy/my-config.sh
# Edit my-config.sh with your settings
source deploy/my-config.sh
./deploy/remote-deploy.sh
```

## Configuration Options

### Required Variables

- `SERVER_IP` - IP address or hostname of the server
- `SSH_USER` - SSH username (default: `fhir`)
- `SSH_KEY_PATH` - Path to SSH private key (default: `~/.ssh/id_asusme`)

### Optional Variables

- `APP_DIR` - Directory on server where app will be deployed (default: `~/kiplombe-hmis`)
- `NGINX_PORT` - Port for Nginx (default: `80`)
- `MYSQL_ROOT_PASSWORD` - MySQL root password
- `MYSQL_DATABASE` - Database name
- `MYSQL_USER` - Database user
- `MYSQL_PASSWORD` - Database password
- `NEXT_PUBLIC_API_URL` - Public API URL (leave empty for relative URLs)
- `FRONTEND_URL` - Frontend URL for CORS

## Typical Deployment Workflow

1. **Configure deployment:**
   ```bash
   source deploy/deploy-config.sh
   # Or edit the file with your settings
   ```

2. **Test connectivity:**
   ```bash
   ssh -i $SSH_KEY_PATH $SSH_USER@$SERVER_IP "echo 'Connection works'"
   ```

3. **Diagnose current deployment (if exists):**
   ```bash
   ./deploy/diagnose.sh $SERVER_IP $SSH_KEY_PATH
   ```

4. **Deploy latest code:**
   ```bash
   ./deploy/remote-deploy.sh $SERVER_IP $SSH_KEY_PATH
   ```

5. **Verify deployment:**
   ```bash
   curl http://$SERVER_IP:$NGINX_PORT/health
   curl http://$SERVER_IP:$NGINX_PORT/
   ```

## Troubleshooting

### Deployment Script Issues

**Problem:** SSH connection fails
- Check SSH key permissions: `chmod 600 ~/.ssh/id_asusme`
- Test SSH manually: `ssh -i ~/.ssh/id_asusme fhir@41.89.173.8`
- Verify SSH key is added to server: Check `~/.ssh/authorized_keys` on server

**Problem:** Docker not found on server
- Install Docker: See `deploy/INSTALL_DOCKER.md`
- Or the script will fail with clear error message

**Problem:** Upload fails
- Check disk space on server: `df -h`
- Check network connectivity
- Try uploading manually to verify

### Application Issues

**Problem:** Frontend container unhealthy
- Check logs: `docker logs kiplombe_frontend`
- Rebuild frontend: `docker compose -f docker-compose.deploy.yml build --no-cache frontend`
- Check for missing dependencies in package.json

**Problem:** Nginx 504 Gateway Timeout
- Frontend is likely not ready
- Wait for Next.js build to complete
- Check frontend logs for errors
- Verify frontend container is healthy

**Problem:** Port already in use
- Check what's using the port: `sudo netstat -tlnp | grep :80`
- Change NGINX_PORT in .env or docker-compose.deploy.yml
- Or stop conflicting service

**Problem:** Database connection errors
- Verify MySQL container is running: `docker ps | grep mysql`
- Check database credentials in .env
- Test connection: `docker exec kiplombe_mysql mysql -uroot -p`

## Server Access

After deployment, access the application:

- **Frontend:** `http://SERVER_IP:NGINX_PORT/`
- **API Direct:** `http://SERVER_IP:3001/`
- **API via Nginx:** `http://SERVER_IP:NGINX_PORT/api/`
- **Health Check:** `http://SERVER_IP:NGINX_PORT/health`

## Useful Commands on Server

```bash
# View logs
docker logs -f kiplombe_frontend
docker logs -f kiplombe_api
docker logs -f kiplombe_nginx

# Restart services
docker compose -f docker-compose.deploy.yml restart

# Stop services
docker compose -f docker-compose.deploy.yml down

# Check status
docker compose -f docker-compose.deploy.yml ps

# Enter container shell
docker exec -it kiplombe_frontend sh
docker exec -it kiplombe_api sh

# Rebuild specific service
docker compose -f docker-compose.deploy.yml build --no-cache frontend
docker compose -f docker-compose.deploy.yml up -d frontend
```

## Security Notes

1. **SSH Keys:** Keep your SSH private key secure (chmod 600)
2. **Environment Variables:** Never commit .env files with sensitive data
3. **Firewall:** Ensure server firewall allows required ports (80, 443, 3001, 3308)
4. **SSL/TLS:** Consider adding SSL certificates for production (use Let's Encrypt)

## Next Steps

After successful deployment:
1. Set up SSL/TLS certificates
2. Configure domain name DNS records
3. Set up monitoring and logging
4. Configure backups for database
5. Set up automated deployments (CI/CD)

