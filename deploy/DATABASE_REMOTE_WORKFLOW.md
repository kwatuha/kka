# Database: remote ↔ local workflow

Server IP used in scripts defaults to **`41.89.173.8`**. Configure `deploy/deploy-config.sh` (or env vars) for SSH.

## Scripts overview

| Goal | Script |
|------|--------|
| **Remote → local file** | `deploy/dump-remote-db.sh` → writes `api/database/ldb/*.sql.gz` |
| **Local file → local MySQL** | `deploy/restore-db.sh path/to/dump.sql.gz` |
| **Dump + restore + telemedicine (local)** | `deploy/sync-remote-to-local.sh --full` or `--dump-only` then restore |
| **Local dump → remote MySQL** | `deploy/upload-and-restore-remote.sh path/to/dump.sql.gz` |
| **Telemedicine 40–43 on REMOTE only** | `deploy/run-telemedicine-migrations-remote.sh` |
| **Migrations 43–48 on REMOTE** (lab + telemedicine 43, 44–46, 48) | `deploy/run-migrations-43-48-remote.sh` |

## A) Copy production data to your laptop (then migrate locally)

```bash
docker compose up -d mysql_db
./deploy/sync-remote-to-local.sh --full
# or: ./deploy/sync-remote-to-local.sh --dump-only
#     ./deploy/restore-db.sh api/database/ldb/kiplombe_hmis_*.sql.gz
cd api && npm run migrate:telemedicine:docker
```

See **`SYNC_REMOTE_TO_LOCAL.md`** for details.

## B) Push a migrated local DB back to the server

After you are happy with local data/schema:

```bash
./deploy/upload-and-restore-remote.sh api/database/ldb/your_dump.sql.gz
```

This uploads the gzip file and restores it inside the remote `kiplombe_mysql` container.

## C1) Migrations 43–48 on REMOTE (awaiting-payment enums, role queue, radiology, lab enum, patient procedures outcome)

There are **two** files prefixed `43_` (lab vs telemedicine); there is **no** `47_*.sql`. From your **dev machine**:

```bash
chmod +x deploy/run-migrations-43-48-remote.sh
./deploy/run-migrations-43-48-remote.sh
```

Uses the same SSH key / server defaults as `run-telemedicine-migrations-remote.sh` (`SERVER_IP`, `SSH_USER`, `SSH_KEY_PATH`, server `~/kiplombe-hmis/.env` for `MYSQL_ROOT_PASSWORD`).

## C) Code is deployed on server — only run SQL migrations (telemedicine 40–43)

You do **not** need to copy the DB for this. From your **development machine** (with repo + SSH key):

```bash
chmod +x deploy/run-telemedicine-migrations-remote.sh
./deploy/run-telemedicine-migrations-remote.sh
```

What it does:

1. `scp` the four files `40`…`43` under `api/database/migrations/` to `/tmp/...` on the server.
2. SSH runs `docker exec -i … mysql -uroot -p… kiplombe_hmis < 40.sql` (then 41–43).
3. Reads **`MYSQL_ROOT_PASSWORD`** from the server’s `~/kiplombe-hmis/.env` (or similar paths) when present; otherwise uses `deploy/deploy-config.sh` / `MYSQL_ROOT_PASSWORD`.

**Manual equivalent on the server** (if you prefer SSH in and run by hand — use the **real** root password from server `.env`):

```bash
docker exec -i kiplombe_mysql mysql -uroot -p'YOUR_ROOT_PASSWORD' kiplombe_hmis < api/database/migrations/40_telemedicine_sessions_schema.sql
# … same for 41, 42, 43
```

Local `docker-compose` often uses `root_password`; production may use a different value — the remote script prefers the server `.env`.

## D) Local Docker: same four files (your commands)

Your local examples use **root** + **`root_password`** (matches `docker-compose.yml`):

```bash
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/40_telemedicine_sessions_schema.sql
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/41_telemedicine_zoom_manual.sql
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/42_user_telemedicine_defaults.sql
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/43_telemedicine_queue_origin.sql
```

Or one command:

```bash
cd api && npm run migrate:telemedicine:docker
```

That script uses the **app DB user** (`kiplombe_user` / `kiplombe_password`) by default; if that user lacks privileges, use the manual **root** commands above.

## E) `43_telemedicine_queue_origin.sql` + `49_telemedicine_video_providers.sql` on REMOTE

If telemedicine **40–42** are already applied and you need **`queue`** origin + `queueEntryId`, and the **video provider** enum (Zoom / Meet / Teams / …):

**Option A — from your laptop (uses SSH + server `.env` for MySQL root password):**

Runs **43** then **49** in order:

```bash
chmod +x deploy/run-43-queue-origin-remote.sh
./deploy/run-43-queue-origin-remote.sh
```

**Option B — already SSH’d into the server, repo path and `root_password` match your compose:**

```bash
cd ~/kiplombe-hmis   # or your deploy path
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/43_telemedicine_queue_origin.sql
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/49_telemedicine_video_providers.sql
```

Use the **real** root password from the server `.env` (`MYSQL_ROOT_PASSWORD`) if it is not `root_password`.

**Option C — from laptop** (replace `USER@HOST` and password; run **43** then **49**):

```bash
ssh USER@HOST 'docker exec -i kiplombe_mysql mysql -uroot -pYOUR_ROOT_PASSWORD kiplombe_hmis' \
  < api/database/migrations/43_telemedicine_queue_origin.sql
ssh USER@HOST 'docker exec -i kiplombe_mysql mysql -uroot -pYOUR_ROOT_PASSWORD kiplombe_hmis' \
  < api/database/migrations/49_telemedicine_video_providers.sql
```

## Order of operations (40 → 43 → 49)

Always **40 → 41 → 42 → 43 → 49** for full queue-linked telemedicine + video provider enum. The current **`43_*.sql`** for telemedicine is **`43_telemedicine_queue_origin.sql`** (adds `queue` to `originType` and `queueEntryId`). An older file **`43_telemedicine_standalone_origin.sql`** only expanded the enum to include `standalone`; if you apply the **queue** migration, it is not needed separately.

Re-running is usually safe (uses `CREATE TABLE IF NOT EXISTS` / `ALTER` patterns where applicable); read errors if a step was already applied.

## F) Video platform enum — `49_telemedicine_video_providers.sql` (alone)

If you **only** need **49** (provider enum; **43** already applied), or to re-run after a failed partial apply:

Extends `telemedicine_sessions.provider` with **Google Meet**, **Microsoft Teams**, **other_link**, alongside **Zoom** and **Daily.co**.

```bash
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/49_telemedicine_video_providers.sql
```

**Note:** `deploy/run-43-queue-origin-remote.sh` applies **43 + 49** in one go — use section **E** for a normal deploy.
