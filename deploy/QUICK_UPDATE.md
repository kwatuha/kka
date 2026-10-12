# Quick Code Update Guide

## Fast Deployment (No Rebuild Required)

For code changes that don't require dependency updates, use the fast deployment method:

### Option 1: Quick Restart (Fastest - ~30 seconds)

```bash
# Just restart the frontend container - it will rebuild Next.js automatically
docker restart kiplombe_frontend

# Wait for it to be ready (check logs)
docker logs -f kiplombe_frontend
```

### Option 2: Using Fast Deploy Script

```bash
# Run the fast deployment script
./deploy/fast-deploy.sh
```

This will:
- Restart the frontend container
- Trigger Next.js rebuild inside the container (much faster than full Docker build)
- Wait for services to be ready

### Option 3: Manual Fast Deploy

```bash
# If using the fast deployment compose file
docker compose -f docker-compose.deploy-fast.yml restart frontend

# Or rebuild Next.js inside the running container
docker exec kiplombe_frontend sh -c "cd /app && npm run build && pm2 restart all || node server.js"
```

## When to Use Full Rebuild

You **MUST** do a full rebuild (`docker compose -f docker-compose.deploy.yml build`) when:

1. ✅ **Dependencies changed** (package.json, package-lock.json)
2. ✅ **Dockerfile changed**
3. ✅ **Environment variables changed** (NEXT_PUBLIC_API_URL, etc.)
4. ✅ **First time deployment**

You **DON'T need** a full rebuild for:

1. ✅ **Code changes only** (components, pages, styles)
2. ✅ **Bug fixes**
3. ✅ **UI updates**
4. ✅ **Configuration changes** (that don't require rebuild)

## Comparison

| Method | Time | When to Use |
|--------|------|-------------|
| **Quick Restart** | ~30-60s | Code changes only |
| **Fast Deploy** | ~1-2 min | Code changes, first time with fast compose |
| **Full Rebuild** | ~5-10 min | Dependencies, Dockerfile, or first deployment |

## Recommended Workflow

1. **For regular code updates**: Use `docker restart kiplombe_frontend`
2. **For dependency updates**: Use full rebuild
3. **For production deployments**: Use full rebuild to ensure consistency

## Troubleshooting

If quick restart doesn't work:

```bash
# Check if container is running
docker ps | grep kiplombe_frontend

# Check logs for errors
docker logs kiplombe_frontend

# Force rebuild inside container
docker exec kiplombe_frontend sh -c "rm -rf .next && npm run build"

# If still issues, do full rebuild
docker compose -f docker-compose.deploy.yml build --no-cache frontend
docker compose -f docker-compose.deploy.yml up -d frontend
```

