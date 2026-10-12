# Fast Deploy Option - Complete Guide

## Overview

The **Fast Deploy** option is designed for quick code updates without full container rebuilds. It uses **volume mounts** to make code changes immediately available in running containers.

## How It Works

### Architecture

1. **Volume Mounts**: Source code is mounted directly into containers
   - Frontend: `./app`, `./components`, `./lib` → `/app/`
   - API: `./api` → `/app/`
   - Node modules persist in Docker volumes (not overwritten)

2. **Smart Rebuilds**:
   - Next.js rebuilds automatically when code changes
   - API restarts to pick up changes
   - No Docker image rebuild needed

3. **Configuration File**: `docker-compose.deploy-fast.yml`
   - Uses same base images as standard deploy
   - Adds volume mounts for code directories
   - Preserves `node_modules` and `.next` in volumes

## What Can You Deploy?

### ✅ **API Changes** (Fully Supported)

**What works:**
- Route changes (`api/routes/*.js`)
- Controller logic changes
- Middleware updates
- Configuration changes
- New API endpoints

**How to deploy:**
```bash
# Option 1: Just restart API container
docker restart kiplombe_api

# Option 2: Use fast deploy script
./deploy/fast-deploy.sh
```

**Time:** ~10-30 seconds

### ✅ **UI/Frontend Changes** (Fully Supported)

**What works:**
- Component changes (`components/*.tsx`)
- Page changes (`app/**/*.tsx`)
- Style changes (`app/globals.css`, `styles/*.css`)
- Library code (`lib/*.ts`)
- Configuration (`next.config.mjs`, `tsconfig.json`)

**How to deploy:**
```bash
# Option 1: Quick restart (fastest)
docker restart kiplombe_frontend

# Option 2: Use fast deploy script
./deploy/fast-deploy.sh

# Option 3: Manual rebuild inside container
docker exec kiplombe_frontend sh -c "cd /app && npm run build"
```

**Time:** ~30-60 seconds (Next.js rebuild)

### ⚠️ **Database Changes** (Manual Step Required)

**Important:** Fast deploy does **NOT** automatically apply database changes. You must run migrations manually.

**What needs manual execution:**
- Schema changes (new tables, columns, indexes)
- Data migrations
- Stored procedures
- Views

**How to apply database changes:**

```bash
# Option 1: Execute SQL file directly
docker exec -i kiplombe_mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < path/to/migration.sql

# Option 2: Use database setup script
./deploy/setup-database.sh

# Option 3: Connect and run manually
docker exec -it kiplombe_mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}"
# Then run your SQL commands
```

**Example workflow for database changes:**
```bash
# 1. Deploy code changes (fast)
./deploy/fast-deploy.sh

# 2. Apply database changes (manual)
docker exec -i kiplombe_mysql mysql -u root -p"kiplombe_root_pass" "kiplombe_hmis" < api/database/migrations/your_migration.sql

# 3. Verify changes
docker exec -it kiplombe_mysql mysql -u root -p"kiplombe_root_pass" "kiplombe_hmis" -e "SHOW TABLES;"
```

## Memory and Resource Settings

### Current Configuration

**Fast Deploy (`docker-compose.deploy-fast.yml`):**
- **No explicit memory limits** (uses Docker defaults)
- Containers share host resources
- Same resource usage as standard deploy

**Standard Deploy (`docker-compose.deploy.yml`):**
- MySQL: 512MB limit, 256MB reservation
- API: 1GB limit, 512MB reservation
- Frontend: No explicit limits (uses defaults)

### Memory Implications

**Fast Deploy:**
- ✅ **Same memory usage** as standard deploy
- ✅ **No additional overhead** from volume mounts
- ✅ **Faster startup** (no full rebuild)
- ⚠️ **Slightly less isolation** (code mounted from host)

**Recommendation:**
If you want to add memory limits to fast deploy, you can add the same `deploy.resources` section from `docker-compose.deploy.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
  mysql_db:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## When to Use Fast Deploy

### ✅ **Use Fast Deploy For:**

1. **Code changes only** (components, routes, logic)
2. **Bug fixes** (quick iterations)
3. **UI updates** (styling, layout)
4. **Hot fixes** (urgent production fixes)
5. **Development/Staging** (faster iteration)

**Time:** 30-60 seconds

### ❌ **Use Full Deploy For:**

1. **Dependency changes** (`package.json`, `package-lock.json`)
2. **Dockerfile changes** (base image, build steps)
3. **Environment variable changes** (that require rebuild)
4. **First time deployment**
5. **Production releases** (for full isolation)
6. **Major structural changes**

**Time:** 5-10 minutes

## Complete Deployment Workflow

### Scenario 1: Code Changes Only (API + UI)

```bash
# 1. Make your code changes locally
# Edit api/routes/*.js or components/*.tsx

# 2. Fast deploy
./deploy/fast-deploy.sh

# Done! Changes are live in ~30-60 seconds
```

### Scenario 2: Code + Database Changes

```bash
# 1. Make code changes
# Edit components, API routes, etc.

# 2. Prepare database migration
# Create api/database/migrations/001_add_new_table.sql

# 3. Fast deploy code
./deploy/fast-deploy.sh

# 4. Apply database changes
docker exec -i kiplombe_mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < api/database/migrations/001_add_new_table.sql

# 5. Verify
docker logs kiplombe_api
docker logs kiplombe_frontend
```

### Scenario 3: Dependency Changes

```bash
# 1. Update package.json files
# Edit package.json or api/package.json

# 2. Full rebuild required
docker compose -f docker-compose.deploy-fast.yml down
docker compose -f docker-compose.deploy-fast.yml up -d --build

# Or switch to standard deploy
docker compose -f docker-compose.deploy-fast.yml down
docker compose -f docker-compose.deploy.yml up -d --build
```

## Switching Between Deploy Modes

### Switch to Fast Deploy

```bash
# Stop standard deploy
docker compose -f docker-compose.deploy.yml down

# Start fast deploy
docker compose -f docker-compose.deploy-fast.yml up -d
```

### Switch to Standard Deploy

```bash
# Stop fast deploy
docker compose -f docker-compose.deploy-fast.yml down

# Start standard deploy
docker compose -f docker-compose.deploy.yml up -d
```

## Troubleshooting

### Issue: Changes Not Reflecting

```bash
# Force Next.js rebuild
docker exec kiplombe_frontend sh -c "rm -rf .next && npm run build"

# Restart containers
docker restart kiplombe_frontend kiplombe_api
```

### Issue: API Not Picking Up Changes

```bash
# Check if API restarted
docker logs kiplombe_api --tail 50

# Force restart
docker restart kiplombe_api

# Check file permissions
docker exec kiplombe_api ls -la /app/routes/
```

### Issue: Database Connection Errors

```bash
# Check MySQL is running
docker ps | grep kiplombe_mysql

# Check database connection
docker exec kiplombe_api node -e "console.log(process.env.DB_HOST)"
```

## Best Practices

1. **Development/Staging**: Use fast deploy for quick iterations
2. **Production Hot Fixes**: Use fast deploy for urgent fixes
3. **Production Releases**: Use standard deploy for major releases
4. **Database Changes**: Always test migrations in staging first
5. **Backup**: Backup database before applying migrations
6. **Monitor**: Watch logs after deployment: `docker logs -f kiplombe_frontend`

## Summary

| Aspect | Fast Deploy | Standard Deploy |
|--------|-------------|-----------------|
| **Code Changes** | ✅ 30-60s | ✅ 5-10 min |
| **Dependency Changes** | ❌ Requires rebuild | ✅ 5-10 min |
| **Database Changes** | ⚠️ Manual step | ⚠️ Manual step |
| **Memory Usage** | Same | Same (with limits) |
| **Isolation** | Medium | High |
| **Speed** | Fast | Slower |
| **Use Case** | Iterations, hot fixes | Releases, dependencies |

## Quick Reference

```bash
# Fast deploy (code only)
./deploy/fast-deploy.sh

# Quick restart (fastest)
docker restart kiplombe_frontend kiplombe_api

# Apply database migration
docker exec -i kiplombe_mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < migration.sql

# View logs
docker logs -f kiplombe_frontend
docker logs -f kiplombe_api

# Check status
docker ps | grep kiplombe
```


