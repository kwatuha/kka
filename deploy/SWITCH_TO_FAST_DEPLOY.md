# Switching to Fast Deploy Mode

## Overview

Fast deploy mode uses volume mounts so code changes are reflected immediately without rebuilding the container.

## Benefits

- **Minor code changes**: < 30 seconds (just restart container)
- **No rebuild needed**: Code is mounted as volumes
- **Faster iteration**: See changes immediately
- **Persistent builds**: `.next` and `node_modules` are preserved

## Setup

### Step 1: Upload Fast Deploy Files

```bash
# Upload docker-compose.fast-deploy.yml
scp -i ~/.ssh/id_asusme docker-compose.fast-deploy.yml fhir@41.89.173.8:~/kiplombe-hmis/

# Upload fast entrypoint
scp -i ~/.ssh/id_asusme docker-entrypoint-fast.sh fhir@41.89.173.8:~/kiplombe-hmis/
```

### Step 2: Switch to Fast Deploy

```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis

# Stop current containers
docker compose -f docker-compose.deploy.yml down

# Start with fast deploy
docker compose -f docker-compose.fast-deploy.yml up -d
```

### Step 3: First Build

The first time will still take 8-15 minutes as it builds everything. After that, code changes are instant.

## Usage

### For Minor Code Changes

```bash
# Use the fast update script
./deploy/fast-update.sh 41.89.173.8 ~/.ssh/id_asusme
```

Or manually:
```bash
# 1. Upload changed files
scp -i ~/.ssh/id_asusme -r app/ components/ lib/ fhir@41.89.173.8:~/kiplombe-hmis/

# 2. Restart frontend
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'cd ~/kiplombe-hmis && docker compose -f docker-compose.fast-deploy.yml restart frontend'
```

### When to Rebuild

Rebuild is needed when:
- `package.json` changes (dependencies)
- `next.config.mjs` changes
- `tsconfig.json` changes significantly
- Major structural changes

To force rebuild:
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker compose -f docker-compose.fast-deploy.yml exec frontend rm -rf .next
docker compose -f docker-compose.fast-deploy.yml restart frontend
```

## Comparison

| Operation | Standard Deploy | Fast Deploy |
|-----------|----------------|-------------|
| Minor code change | 8-20 min (full rebuild) | 10-30 sec (restart) |
| Dependency change | 8-20 min | 3-5 min (npm install) |
| First deployment | 8-20 min | 8-20 min (same) |
| Code update speed | Slow | Fast |
| Isolation | High | Medium |

## Switching Back

To switch back to standard deploy:

```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker compose -f docker-compose.fast-deploy.yml down
docker compose -f docker-compose.deploy.yml up -d
```

## Best Practice

- **Development/Staging**: Use fast deploy for quick iteration
- **Production releases**: Use standard deploy for full isolation
- **Hot fixes**: Use fast deploy for immediate fixes
- **Major releases**: Use standard deploy for clean builds





