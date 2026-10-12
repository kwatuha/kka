# Database sync and sidebar on deploy

## Sync local database to remote

Your local app uses the **kiplombe_mysql** Docker container. To copy that database to the remote server:

### One command (dump + upload + restore)

From the project root:

```bash
./deploy/dump-and-push-db-to-remote.sh 41.89.173.8 ~/.ssh/id_asusme
```

Or with defaults (41.89.173.8 and ~/.ssh/id_asusme):

```bash
./deploy/dump-and-push-db-to-remote.sh
```

### Step by step

1. **Dump the local database** (from project root):

   ```bash
   ./deploy/dump-local-db.sh
   ```

   - Uses container **kiplombe_mysql** (from `docker-compose up -d mysql_db`).
   - Reads `MYSQL_ROOT_PASSWORD` from `.env` if present; otherwise defaults to `root_password` (matches default in docker-compose.yml).
   - Writes a compressed dump to `api/database/ldb/kiplombe_hmis_local_YYYYMMDD_HHMMSS.sql.gz`.

2. **Upload and restore on remote**:

   ```bash
   ./deploy/upload-and-restore-remote.sh api/database/ldb/kiplombe_hmis_local_<timestamp>.sql.gz
   ```

   Or use the one-shot script above, which runs both steps.

---

## Sidebar missing on deployed version

The deploy archive includes the sidebar (`components/app-sidebar.tsx`, `components/main-layout-content.tsx`, `app/(main)/layout.tsx`). If the sidebar does not appear on the deployed site:

1. **Confirm you’re on a main app route and logged in**  
   The sidebar is only shown inside the main app layout (e.g. `/departments`, `/inpatient`, `/dashboard`). Login and error pages use a different layout and have no sidebar.

2. **Check the browser console**  
   Open DevTools (F12) → Console. Any red errors (e.g. in `AppSidebar`, `SidebarProvider`, or auth) can prevent the sidebar from rendering.

3. **Confirm deploy included latest code**  
   Re-run deploy so the server has the same sidebar and layout code as your local app:

   ```bash
   ./deploy/remote-deploy.sh 41.89.173.8 ~/.ssh/id_asusme
   ```

4. **Verify critical files on the server (optional)**  
   After deploy, on the server you can check that sidebar files exist:

   ```bash
   ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 "ls -la ~/kiplombe-hmis/components/app-sidebar.tsx ~/kiplombe-hmis/components/main-layout-content.tsx"
   ```

If the sidebar still doesn’t appear after a fresh deploy and when logged in on a main route, the next step is to capture any console or network errors and check the frontend container logs on the server.
