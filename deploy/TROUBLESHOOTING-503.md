# Intermittent 503 on production (`41.89.173.8`) — local works

A **503 Service Unavailable** in front of this stack is often **not** your app “randomly failing” — it is usually one of these:

## 1. **Nginx `limit_req` (most common for “refresh fixes it”)**

In `deploy/nginx.conf`, **`limit_req`** is applied to:

- **`/`** (HTML, JS, assets) — `general_limit`
- **`/api/`** — `api_limit`

When the client exceeds the configured **rate + burst** for the **client IP**, the default response is **503** (unless you set `limit_req_status`).

**Why refresh works:** the leaky bucket refills; a moment later the same request is allowed.

**Why local works but remote doesn’t:** on the server, **everyone behind the same public IP** (office NAT, mobile carrier, shared Wi‑Fi) **shares one rate‑limit bucket** (`$binary_remote_addr`). A few users opening dashboards at once can spike **dozens of parallel `/api/` calls** from the same IP and trip the limit.

**What we changed:** `deploy/nginx.conf` uses **higher** `rate` / `burst` values and documents this. After deploying the updated file:

```bash
# On the server (from repo root)
docker compose -f docker-compose.deploy.yml exec nginx nginx -t
docker compose -f docker-compose.deploy.yml exec nginx nginx -s reload
# or restart nginx container
```

**Verify in logs** (look for “limiting requests”):

```bash
docker logs kiplombe_nginx 2>&1 | grep -i limit
```

**If you still see 503 under heavy use:** temporarily **comment out** the `limit_req` lines in `location /` and `location /api/` to confirm — then re‑enable with higher numbers or a different key (e.g. only for `/api/` abuse protection).

---

## 2. **Nginx upstream marked “down” (`max_fails`)**

`upstream` uses `max_fails` / `fail_timeout`. If the frontend or API fails health checks several times, nginx may **stop sending traffic** briefly → **502/503** until the next probe passes.

**Check:**

```bash
docker logs --tail=100 kiplombe_nginx | grep -iE 'upstream|timed out|refused|reset'
docker ps -a --filter name=kiplombe
```

**Mitigation:** less aggressive `max_fails`, or ensure containers are not OOM‑restarting (see `docker stats`).

---

## 3. **Application returns 503**

The API sometimes returns **503** on purpose, for example:

- **MySQL pool exhausted** (`POOL_ACQUIRE_TIMEOUT` / “Database is busy”) — under load or slow queries.
- **Missing DB migration** (some routes return 503 with a JSON `error` message).

**Check API logs:**

```bash
docker logs --tail=200 kiplombe_api | grep -iE '503|pool|timeout|ECONN'
```

**Mitigation:** increase MySQL / Node pool settings in `api`, optimize slow endpoints, scale resources.

---

## 4. **Resource limits (MySQL / Node OOM)**

`docker-compose.deploy.yml` caps **MySQL** (e.g. 512M) and **API** memory. Under memory pressure, processes slow down or restart → transient errors.

```bash
docker stats --no-stream kiplombe_mysql kiplombe_api kiplombe_frontend kiplombe_nginx
```

---

## Quick isolation checklist

| Symptom | Likely cause |
|--------|----------------|
| 503 on **first load** of a heavy page, **OK after refresh** | `limit_req` burst/rate |
| 503 **only on `/api/...`** JSON responses | API pool / slow DB / app 503 |
| 503 **same time for all users** | Nginx upstream or container restart |
| 503 with **static assets** | `general_limit` on `/` |

---

## Related docs

- `deploy/TROUBLESHOOTING-502.md` — frontend not ready, 502 on `/login`
- `deploy/502_DIAGNOSIS.md` — nginx timeout / retry tuning
- `deploy/investigate-504.sh` — timeouts (504 vs 503)
