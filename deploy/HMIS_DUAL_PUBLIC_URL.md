# Dual public URLs — Kakamega county + AZIMKIM (DHA)

Run **one** HMIS stack; allow users to open either hostname:

| URL | Typical use |
|-----|-------------|
| `https://kakamega.intellibizafrica.co.ke/hmis/` | County users (existing bookmarks) |
| `https://hmis.azimkim.co.ke/hmis/` | DHA / vendor registration, AZIMKIM branding |

Both must proxy to the **same** Docker UI (`5400`) and API (`3222`) on the VPS.

## 1. DNS

- **hmis.azimkim.co.ke** → A record to VPS **or** cPanel host that proxies to VPS (same as kakamega setup).
- Keep **kakamega.intellibizafrica.co.ke** unchanged.

## 2. TLS + reverse proxy

**Option A — both hostnames on the VPS (hmis.azimkim.co.ke → 165.22.227.234)**

On the server (requires sudo password):

```bash
sudo bash ~/apply-dual-hmis-domain-on-vps.sh
```

(Script copied by deploy; or from repo: `deploy/apply-dual-hmis-domain-on-vps.sh`.)

Manual alternative: use `deploy/nginx-kakamega-dual-public-host.conf` and  
`sudo certbot certonly --nginx -d kakamega.intellibizafrica.co.ke -d hmis.azimkim.co.ke --expand`

**Option B — hmis on azimkim cPanel, kakamega on intellibizafrica cPanel**

- `deploy/cpanel-hmis-azimkim.htaccess.example` on **hmis** docroot
- Existing `deploy/cpanel-kakamega-subdomain-proxy.htaccess.example` on **kakamega** docroot  
- Both proxy to the same `VPS_IP:5400` and `:3222`.

## 3. Environment (`deploy/.env.kakamega`)

Update on the server, then **redeploy** (frontend rebuild if you change `NEXT_PUBLIC_*`).

```bash
# Canonical URL for DHA portal / evidence exports (origin only, no /hmis)
DHA_PUBLIC_APP_URL=https://hmis.azimkim.co.ke

# CORS + API — comma-separated origins (no paths)
FRONTEND_URL=https://hmis.azimkim.co.ke,https://kakamega.intellibizafrica.co.ke
PUBLIC_CORS_ORIGINS=https://hmis.azimkim.co.ke,https://kakamega.intellibizafrica.co.ke

# Same-origin /api through each hostname (keep empty)
NEXT_PUBLIC_API_URL=

# Dual-host: leave NEXT_PUBLIC_BASE_URL UNSET at build time so the browser uses
# window.location.origin on whichever URL the user opened. If you set only one
# URL here, links may always jump to that host.
# NEXT_PUBLIC_BASE_URL=
```

Redeploy:

```bash
LOCAL_ENV_FILE=./deploy/.env.kakamega ./deploy/deploy-kakamega-shared-mysql.sh
```

## 4. Smoke tests

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://hmis.azimkim.co.ke/hmis/
curl -sS -o /dev/null -w '%{http_code}\n' https://kakamega.intellibizafrica.co.ke/hmis/
curl -sS -o /dev/null -w '%{http_code}\n' https://hmis.azimkim.co.ke/api/health
```

Log in on **each** hostname; confirm API calls stay on the same host (Network tab: `/api/...`, not cross-origin errors).

## 5. DHA submission

Register **`https://hmis.azimkim.co.ke/hmis/`** in the portal. County staff can keep using the kakamega URL.

Evidence pack / registration profile JSON uses `DHA_PUBLIC_APP_URL` when set.
