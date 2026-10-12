# Quick Deployment Guide for Minor Code Changes

## Problem

Full deployments take 8-20 minutes because they rebuild everything. For minor code changes, this is too slow.

## Solution: Fast Deploy Mode

I've created a fast deployment system that uses volume mounts so code changes are reflected immediately.

## Quick Start

### Option 1: Use Fast Update Script (Easiest)

```bash
# For minor code changes
./deploy/fast-update.sh 41.89.173.8 ~/.ssh/id_asusme
```

**Time**: 10-30 seconds

### Option 2: Switch to Fast Deploy Mode (Best for Frequent Updates)

1. **First time setup** (one-time):
   ```bash
   # Upload fast deploy files
   scp -i ~/.ssh/id_asusme docker-compose.fast-deploy.yml fhir@41.89.173.8:~/kiplombe-hmis/
   scp -i ~/.ssh/id_asusme docker-entrypoint-fast.sh fhir@41.89.173.8:~/kiplombe-hmis/

   # Switch to fast deploy
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
   cd ~/kiplombe-hmis
   docker compose -f docker-compose.deploy.yml down
   docker compose -f docker-compose.fast-deploy.yml up -d
   ```

2. **For code updates** (after setup):
   ```bash
   # Just upload changed files and restart
   scp -i ~/.ssh/id_asusme -r app/ components/ lib/ fhir@41.89.173.8:~/kiplombe-hmis/
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 'cd ~/kiplombe-hmis && docker compose -f docker-compose.fast-deploy.yml restart frontend'
   ```

**Time**: 10-30 seconds

## Comparison

| Method | Time | When to Use |
|--------|------|-------------|
| **Fast Update** | 10-30 sec | Minor code changes |
| **Fast Deploy Mode** | 10-30 sec | Frequent updates |
| **Full Deploy** | 8-20 min | Dependencies, first deploy |

## How It Works

### Fast Deploy Mode
- Code is mounted as **volumes** (not copied into image)
- Changes are **immediately available** in container
- Only need to **restart** container to apply changes
- `node_modules` and `.next` are **preserved** in volumes

### Standard Deploy Mode
- Code is **copied into image** during build
- Must **rebuild image** to update code
- Takes 8-20 minutes per update

## When to Use Each

### Use Fast Deploy For:
- ✅ Minor code changes
- ✅ Bug fixes
- ✅ UI updates
- ✅ Component changes
- ✅ Style changes
- ✅ Frequent iterations

### Use Standard Deploy For:
- ✅ First deployment
- ✅ Dependency changes (`package.json`)
- ✅ Config changes (`next.config.mjs`)
- ✅ Major structural changes
- ✅ Production releases (for full isolation)

## Workflow Recommendations

### Development/Staging
```bash
# Use fast deploy for quick iteration
./deploy/fast-update.sh 41.89.173.8 ~/.ssh/id_asusme
```

### Production Hot Fixes
```bash
# Use fast deploy for immediate fixes
./deploy/fast-update.sh 41.89.173.8 ~/.ssh/id_asusme
```

### Production Releases
```bash
# Use full deploy for clean builds
./deploy/remote-deploy.sh 41.89.173.8 ~/.ssh/id_asusme
```

## Troubleshooting

### If changes don't appear:
```bash
# Force rebuild inside container
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker compose -f docker-compose.fast-deploy.yml exec frontend rm -rf .next
docker compose -f docker-compose.fast-deploy.yml restart frontend
```

### If dependencies changed:
```bash
# Rebuild (takes 3-5 min for npm install)
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker compose -f docker-compose.fast-deploy.yml exec frontend npm install
docker compose -f docker-compose.fast-deploy.yml restart frontend
```

## Benefits

1. **10-30 seconds** instead of 8-20 minutes
2. **No rebuild needed** for code changes
3. **Faster iteration** during development
4. **Immediate fixes** for production issues
5. **Lower resource usage** (no full rebuild)

## Files Created

- `docker-compose.fast-deploy.yml` - Fast deploy configuration
- `docker-entrypoint-fast.sh` - Smart entrypoint for fast mode
- `deploy/fast-update.sh` - Quick update script
- `deploy/SWITCH_TO_FAST_DEPLOY.md` - Detailed setup guide





