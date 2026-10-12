# Bad Gateway (502) after deploy

## What it means

Nginx is usually **running**, but **`/login` (and most pages)** are proxied to the **Next.js** container (`kiplombe_frontend:3000`). A **502** means nginx could not get a valid response from that upstream—most often because:

1. **Frontend still starting** — `Dockerfile.prod` runs `npm install` and `next build` **inside the container** on startup. That can take **10–15+ minutes** on a small VPS. Until port 3000 serves, you get **502** on `/login`.
2. **Frontend crashed / OOM** — build ran out of memory; container may restart in a loop.
3. **Wrong port / another service on 80** — host nginx pointing at the wrong upstream (less common if you only use Docker).

**Important:** `GET /health` is answered **by nginx itself** (returns `healthy`). It does **not** prove Next.js is ready. You can see **200 on `/health`** and **502 on `/login`** at the same time.

## What to run on the server

```bash
cd ~/kiplombe-hmis

# Container status
docker ps -a --filter name=kiplombe

# Frontend log (most useful)
docker logs --tail=100 kiplombe_frontend

# Can the frontend respond inside the network?
docker exec kiplombe_nginx wget -q -O- --timeout=3 http://kiplombe_frontend:3000/ 2>&1 | head -c 200 || echo "upstream failed"

# From host — wait until this returns 200, not 502
curl -sI "http://127.0.0.1/login" | head -5
```

## Fixes

- **Still building:** wait until logs show the Next server listening (e.g. “Ready” / “started server”). Then retry `/login`.
- **OOM / build failed:** increase Docker memory for `frontend` in `docker-compose.deploy.yml`, or build on CI and use a prebuilt image.
- **After `remote-deploy-fast.sh`:** the script now **waits for `/login`** to return HTTP 200 (or redirect), not only `/health`. If it times out, follow the logs command it prints.

## Full vs fast deploy

- **`remote-deploy.sh`** — long waits and extra checks (slower, more thorough).
- **`remote-deploy-fast.sh`** — now polls **`/login`** so “deploy complete” is closer to “UI actually works.”
