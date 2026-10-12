# Docker Setup Guide for Kiplombe Medical Centre HMIS

This guide explains how to run the entire application stack using Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### Development Environment

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop all services:**
   ```bash
   docker-compose down
   ```

4. **Stop and remove volumes (clean slate):**
   ```bash
   docker-compose down -v
   ```

### Access the Application

- **Frontend**: http://localhost:3002 (or 3000 if no local dev server running)
- **API**: http://localhost:3001
- **MySQL**: localhost:3307 (user: `kiplombe_user`, password: `kiplombe_password`)
- **With Nginx** (optional): http://localhost:8080

### Start with Nginx

To use Nginx as a reverse proxy:

```bash
docker-compose --profile with-nginx up -d
```

This will:
- Route `/` to the frontend
- Route `/api/` to the API
- Route `/uploads/` to API uploads

## Services

### 1. MySQL Database (`mysql_db`)
- **Port**: 3307 (host) → 3306 (container)
- **Database**: `kiplombe_hmis`
- **User**: `kiplombe_user`
- **Password**: `kiplombe_password`
- **Root Password**: `root_password`
- **Volume**: `db_data` (persistent storage)

### 2. API Server (`api`)
- **Port**: 3001
- **Environment**: Development mode with hot reload
- **Volume**: Code is mounted for live updates
- **Dependencies**: Waits for MySQL to be healthy

### 3. Frontend (`frontend`)
- **Port**: 3000
- **Environment**: Development mode with hot reload
- **Volume**: Code is mounted for live updates
- **Dependencies**: Waits for API

### 4. Nginx (`nginx`) - Optional
- **Port**: 8080
- **Profile**: `with-nginx` (not started by default)
- **Purpose**: Reverse proxy for production-like setup

## Environment Variables

### API Environment Variables

Create `api/.env` file:

```env
DB_HOST=mysql_db
DB_USER=kiplombe_user
DB_PASSWORD=kiplombe_password
DB_NAME=kiplombe_hmis
DB_PORT=3306
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001
```

### Frontend Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development Workflow

### 1. First Time Setup

```bash
# Build and start all containers
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Wait for MySQL to initialize (check logs)
# Then verify API is running
curl http://localhost:3001
```

### 2. Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f mysql_db
```

### 3. Accessing Containers

```bash
# API container
docker exec -it kiplombe_api sh

# Frontend container
docker exec -it kiplombe_frontend sh

# MySQL container
docker exec -it kiplombe_mysql mysql -u kiplombe_user -p kiplombe_hmis
```

### 4. Database Operations

```bash
# Access MySQL CLI
docker exec -it kiplombe_mysql mysql -u root -p
# Password: root_password

# Run SQL file
docker exec -i kiplombe_mysql mysql -u root -proot_password kiplombe_hmis < api/database/schema.sql

# Backup database
docker exec kiplombe_mysql mysqldump -u root -proot_password kiplombe_hmis > backup.sql

# Restore database
docker exec -i kiplombe_mysql mysql -u root -proot_password kiplombe_hmis < backup.sql
```

### 5. Restarting Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart frontend
```

### 6. Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose build api
docker-compose up -d api

# Rebuild all
docker-compose build
docker-compose up -d
```

## Production Deployment

### Using Production Compose File

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build
```

### Production Environment Variables

Create `.env` file in project root:

```env
MYSQL_ROOT_PASSWORD=strong_root_password
MYSQL_USER=kiplombe_user
MYSQL_PASSWORD=strong_password
MYSQL_DATABASE=kiplombe_hmis
MYSQL_PORT=3307
JWT_SECRET=very_strong_secret_key
NEXT_PUBLIC_API_URL=http://your-domain.com/api
NGINX_PORT=80
```

## Troubleshooting

### Database Connection Issues

1. **Check MySQL is running:**
   ```bash
   docker-compose ps mysql_db
   ```

2. **Check MySQL logs:**
   ```bash
   docker-compose logs mysql_db
   ```

3. **Verify database exists:**
   ```bash
   docker exec -it kiplombe_mysql mysql -u root -proot_password -e "SHOW DATABASES;"
   ```

### API Not Starting

1. **Check API logs:**
   ```bash
   docker-compose logs api
   ```

2. **Verify environment variables:**
   ```bash
   docker exec kiplombe_api env | grep DB_
   ```

3. **Check if API can reach MySQL:**
   ```bash
   docker exec kiplombe_api ping mysql_db
   ```

### Frontend Not Loading

1. **Check frontend logs:**
   ```bash
   docker-compose logs frontend
   ```

2. **Verify API URL:**
   ```bash
   docker exec kiplombe_frontend env | grep NEXT_PUBLIC_API_URL
   ```

### Port Conflicts

If ports are already in use:

1. **Check what's using the port:**
   ```bash
   lsof -i :3000
   lsof -i :3001
   lsof -i :3307
   ```

2. **Change ports in docker-compose.yml:**
   ```yaml
   ports:
     - "3002:3000"  # Change host port
   ```

### Volume Issues

If code changes aren't reflecting:

1. **Restart the service:**
   ```bash
   docker-compose restart frontend
   ```

2. **Rebuild the container:**
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

## Clean Up

### Remove All Containers and Volumes

```bash
# Stop and remove containers
docker-compose down

# Remove containers, volumes, and networks
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

### Reset Database

```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm transelgon_db_data

# Start again (will recreate database)
docker-compose up -d
```

## Useful Commands

```bash
# View running containers
docker-compose ps

# View resource usage
docker stats

# Execute command in container
docker exec -it kiplombe_api npm install

# Copy file from container
docker cp kiplombe_api:/app/file.txt ./

# Copy file to container
docker cp ./file.txt kiplombe_api:/app/
```

## Next Steps

1. **Update environment variables** with secure passwords
2. **Configure JWT_SECRET** with a strong secret
3. **Set up SSL/TLS** for production (use nginx with Let's Encrypt)
4. **Configure backups** for the database
5. **Set up monitoring** and logging

## Notes

- Development mode uses volume mounts for live code updates
- Database data persists in Docker volumes
- API uploads are stored in `api_uploads` volume
- All services restart automatically on failure (`restart: unless-stopped`)

