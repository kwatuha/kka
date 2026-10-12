# Kiplombe HMIS Deployment Guide

This guide explains how to deploy the Kiplombe HMIS application to your server.

## Prerequisites

- Docker and Docker Compose installed on the server
- SSH access to the server
- Ports available: 3001 (API), 8081 (Nginx), 3308 (MySQL - optional)

## Quick Start

### 1. Copy Files to Server

```bash
# From your local machine
scp -i ~/.ssh/id_asusme -r /path/to/transelgon kunye@165.22.227.234:/home/kunye/kiplombe-hmis
```

### 2. SSH into Server

```bash
ssh -i ~/.ssh/id_asusme kunye@165.22.227.234
cd /home/kunye/kiplombe-hmis
```

### 3. Configure Environment

```bash
# Copy and edit environment file
cp deploy/.env.example .env
nano .env  # Edit with your configuration
```

**Important:** Update these values in `.env`:
- `MYSQL_ROOT_PASSWORD` - Strong password for MySQL root
- `MYSQL_PASSWORD` - Strong password for application database user
- `JWT_SECRET` - Strong random secret (minimum 32 characters)
- `NEXT_PUBLIC_API_URL` - Your API URL (e.g., `http://your-domain.com/api`)

### 4. Deploy

```bash
# Make scripts executable (if not already)
chmod +x deploy/*.sh

# Run deployment
./deploy/deploy.sh
```

### 5. Setup Database

After deployment, initialize the database:

```bash
./deploy/setup-database.sh
```

## Using Existing MySQL

If you want to use the existing MySQL on the server (port 3307), update your `.env`:

```env
# Comment out or remove MYSQL_* variables
# MYSQL_ROOT_PASSWORD=...
# MYSQL_DATABASE=...
# MYSQL_USER=...
# MYSQL_PASSWORD=...

# Use existing MySQL
DB_HOST=172.17.0.1
DB_PORT=3307
DB_USER=existing_user
DB_PASSWORD=existing_password
DB_NAME=kiplombe_hmis
```

And remove the `mysql_db` service from `docker-compose.deploy.yml`.

## Manual Deployment Steps

If you prefer manual deployment:

```bash
# Build and start services
docker-compose -f docker-compose.deploy.yml build
docker-compose -f docker-compose.deploy.yml up -d

# Check status
docker-compose -f docker-compose.deploy.yml ps

# View logs
docker-compose -f docker-compose.deploy.yml logs -f
```

## Accessing the Application

After deployment:

- **Frontend (via Nginx):** `http://server-ip:8081`
- **API Direct:** `http://server-ip:3001`
- **MySQL:** `server-ip:3308` (if using containerized MySQL)

## Useful Commands

```bash
# View logs
docker-compose -f docker-compose.deploy.yml logs -f

# View specific service logs
docker-compose -f docker-compose.deploy.yml logs -f api
docker-compose -f docker-compose.deploy.yml logs -f frontend

# Restart services
docker-compose -f docker-compose.deploy.yml restart

# Stop services
docker-compose -f docker-compose.deploy.yml down

# Stop and remove volumes (⚠️ deletes data)
docker-compose -f docker-compose.deploy.yml down -v

# Rebuild after code changes
docker-compose -f docker-compose.deploy.yml build --no-cache
docker-compose -f docker-compose.deploy.yml up -d
```

## Updating the Application

1. Pull latest code or copy updated files
2. Rebuild and restart:

```bash
docker-compose -f docker-compose.deploy.yml build --no-cache
docker-compose -f docker-compose.deploy.yml up -d
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.deploy.yml logs

# Check container status
docker ps -a

# Check resource usage
docker stats
```

### Database connection issues

```bash
# Test MySQL connection
docker exec -it kiplombe_mysql mysql -u root -p

# Check MySQL logs
docker logs kiplombe_mysql
```

### Port conflicts

If ports 3001, 8081, or 3308 are already in use, update them in `.env`:
- `NGINX_PORT=8082` (for nginx)
- `MYSQL_PORT=3309` (for MySQL)
- Update API port in docker-compose.deploy.yml if needed

### Out of memory

```bash
# Check memory usage
free -h
docker stats

# Stop unnecessary containers
docker stop <container-name>

# Clean up unused images
docker image prune -a
```

## Security Considerations

1. **Change default passwords** in `.env`
2. **Use strong JWT_SECRET** (minimum 32 random characters)
3. **Restrict database access** - only allow necessary IPs
4. **Use HTTPS** in production (configure SSL in nginx)
5. **Regular updates** - keep Docker images updated
6. **Backup database** regularly

## Database Backups

```bash
# Create backup
docker exec kiplombe_mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" kiplombe_hmis > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i kiplombe_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" kiplombe_hmis < backup_file.sql
```

## Monitoring

```bash
# Watch resource usage
watch docker stats

# Check service health
docker-compose -f docker-compose.deploy.yml ps

# Check nginx access logs
docker exec kiplombe_nginx tail -f /var/log/nginx/access.log
```

## Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.deploy.yml logs`
2. Check container status: `docker ps -a`
3. Review this README for common solutions


