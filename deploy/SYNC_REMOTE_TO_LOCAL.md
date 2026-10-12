# Sync remote database (41.89.173.8) → local + migrations

Use this when you want a **copy of production data** on your machine and an **up-to-date schema** (including telemedicine and other migrations).

**Related:** [DATABASE_REMOTE_WORKFLOW.md](./DATABASE_REMOTE_WORKFLOW.md) — full picture (dump/restore/upload, **run telemedicine on server**).

## Prerequisites

1. **Local MySQL (Docker)** — from repo root:
   ```bash
   docker compose up -d mysql_db
   ```
   Default container name: `kiplombe_mysql`. Port **3308** on the host maps to 3306 in the container.

2. **SSH to the server** — the dump script uses `deploy/dump-remote-db.sh`, which expects:
   - `deploy/deploy-config.sh` **or** environment variables:
     - `SERVER_IP` (default `41.89.173.8`)
     - `SSH_USER` (e.g. `fhir`)
     - `SSH_KEY_PATH` (e.g. `~/.ssh/id_asusme`)
   - Remote app directory `APP_DIR` (default `~/kiplombe-hmis`) with Docker MySQL running.

3. **Repo root `.env`** (optional but recommended) — match local Docker MySQL root password:
   ```env
   MYSQL_ROOT_PASSWORD=root_password
   MYSQL_DATABASE=kiplombe_hmis
   ```
   (`docker-compose.yml` uses `root_password` for the local MySQL service.)

## One-shot: dump + restore + telemedicine migrations

```bash
chmod +x deploy/sync-remote-to-local.sh deploy/restore-db.sh deploy/dump-remote-db.sh
./deploy/sync-remote-to-local.sh --full
```

You will be prompted to confirm before overwriting the local DB.

## Step by step

### 1) Dump only (file saved under `api/database/ldb/`)

```bash
./deploy/sync-remote-to-local.sh --dump-only
```

### 2) Restore a dump into local Docker MySQL

```bash
./deploy/restore-db.sh api/database/ldb/kiplombe_hmis_YYYYMMDD_HHMMSS.sql.gz
```

### 3) Apply telemedicine migrations (40–43)

If MySQL runs in Docker:

```bash
cd api && npm run migrate:telemedicine:docker
```

If MySQL is on the host with `api/.env` pointing at it:

```bash
cd api && npm run migrate:telemedicine
```

### 4) Optional: other incremental migrations

The repo has many small SQL files under `api/database/` and `api/database/migrations/`. After a restore, run the interactive checker:

```bash
bash deploy/check-and-run-migrations.sh
```

Answer `y` to apply any migrations that are still missing for your restored snapshot.

## Notes

- **Remote is source of truth for data**; migrations bring **local schema** up to match the **current codebase**.
- If remote is already on a **newer** schema than your branch, some migrations may no-op or warn — read the output.
- **Large dumps**: restore can take several minutes; ensure enough disk space.
- **Secrets**: dumps contain real patient data — treat files under `api/database/ldb/` as sensitive and add to `.gitignore` if not already ignored.

## Troubleshooting

| Issue | What to try |
|--------|----------------|
| Restore error: `near 'Welcome to Ubuntu'` | The `.sql.gz` file starts with **SSH/MOTD text**, not mysqldump. Re-dump with `./deploy/dump-remote-db.sh` (uses `ssh -q -T`). Or run `./deploy/restore-db.sh` — it strips junk until `-- MySQL dump` / `/*!…`. |
| SSH fails | Check `SSH_USER`, `SSH_KEY_PATH`, and that the key is added to `ssh-agent` or path is correct. |
| `kiplombe_mysql` not running | `docker compose up -d mysql_db` |
| Wrong root password on restore | Set `MYSQL_ROOT_PASSWORD` in repo `.env` to match `docker-compose.yml` (`root_password`). |
| Telemedicine migrate fails | Ensure MySQL is up; run `npm run migrate:telemedicine` from `api/` with correct `DB_*` in `api/.env`. |
