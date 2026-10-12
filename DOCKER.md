# Docker Setup Guide

This guide explains how to run the Kiplombe Medical Centre HMIS using Docker.

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)

## Quick Start

### Development Mode

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

### Production Mode

1. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Start production services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Services

The Docker setup includes:

1. **MySQL Database** (`mysql_db`)
   - Port: `3307` (host) → `3306` (container)
   - Database: `kiplombe_hmis`
   - Auto-initializes with schema on first run

2. **API Server** (`api`)
   - Port: `3001`
   - Node.js/Express backend
   - Connects to MySQL database

3. **Frontend** (`frontend`)
   - Port: `3000`
   - Next.js application
   - Connects to API on port 3001

## Access Points

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **MySQL**: localhost:3307

## Environment Variables

### Development (docker-compose.yml)

The development setup uses default values. You can override them by creating a `.env` file:

```env
DB_ROOT_PASSWORD=your_root_password
DB_USER=kiplombe_user
DB_PASSWORD=kiplombe_password
JWT_SECRET=your_jwt_secret
```

### Production (docker-compose.prod.yml)

Create a `.env` file with production values:

```env
DB_ROOT_PASSWORD=strong_production_password
DB_USER=kiplombe_user
DB_PASSWORD=strong_production_password
JWT_SECRET=very_strong_jwt_secret_key
NEXT_PUBLIC_API_URL=http://your-domain.com:3001
API_BASE_URL=http://your-domain.com:3001
DB_PORT=3307
```

## Common Commands

### Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Rebuild after code changes
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v
```

### Production

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Rebuild production
docker-compose -f docker-compose.prod.yml up -d --build

# Stop production
docker-compose -f docker-compose.prod.yml down
```

## Database Management

### Access MySQL

```bash
# Connect to MySQL container
docker exec -it kiplombe_mysql mysql -u kiplombe_user -p kiplombe_hmis

# Or using root
docker exec -it kiplombe_mysql mysql -u root -p
```

### Backup Database

```bash
docker exec kiplombe_mysql mysqldump -u kiplombe_user -pkiplombe_password kiplombe_hmis > backup.sql
```

### Restore Database

```bash
docker exec -i kiplombe_mysql mysql -u kiplombe_user -pkiplombe_password kiplombe_hmis < backup.sql
```

## Troubleshooting

### Services won't start

1. **Check if ports are in use:**
   ```bash
   # Check port 3000
   lsof -i :3000
   # Check port 3001
   lsof -i :3001
   # Check port 3307
   lsof -i :3307
   ```

2. **View container logs:**
   ```bash
   docker-compose logs [service_name]
   ```

3. **Rebuild containers:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Database connection issues

1. **Wait for database to be ready:**
   ```bash
   docker-compose logs mysql_db
   # Look for "ready for connections"
   ```

2. **Check database health:**
   ```bash
   docker exec kiplombe_mysql mysqladmin ping -h localhost -u root -p
   ```

### API not connecting to database

1. **Check environment variables:**
   ```bash
   docker exec kiplombe_api env | grep DB_
   ```

2. **Verify database is accessible:**
   ```bash
   docker exec kiplombe_api ping mysql_db
   ```

## Development Workflow

### Making Code Changes

1. **Code changes are automatically synced** via volume mounts
2. **Frontend**: Next.js hot-reloads automatically
3. **API**: Restart required for changes:
   ```bash
   docker-compose restart api
   ```

### Adding Dependencies

1. **Frontend:**
   ```bash
   docker exec kiplombe_frontend npm install [package]
   ```

2. **API:**
   ```bash
   docker exec kiplombe_api npm install [package]
   ```

3. **Rebuild to persist:**
   ```bash
   docker-compose up -d --build
   ```

## Production Deployment

1. **Set environment variables** in `.env`
2. **Build production images:**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```
3. **Start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
4. **Monitor logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## Security Notes

⚠️ **Important for Production:**

1. Change all default passwords
2. Use strong JWT secrets
3. Don't expose MySQL port publicly
4. Use environment variables for secrets
5. Regularly update Docker images
6. Use Docker secrets for sensitive data in production

## Volume Management

### View volumes:
```bash
docker volume ls
```

### Remove volumes (⚠️ deletes data):
```bash
docker-compose down -v
```

### Backup volumes:
```bash
docker run --rm -v kiplombe_hmis_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data
```

## Next Steps

- Set up reverse proxy (nginx) for production
- Configure SSL/TLS certificates
- Set up automated backups
- Configure monitoring and logging
- Set up CI/CD pipeline

