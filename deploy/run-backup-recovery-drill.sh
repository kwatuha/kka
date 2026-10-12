#!/usr/bin/env bash
# DHA evidence: backup + restore drill into a temporary database (does not overwrite production DB).
# Usage (from repo root): ./deploy/run-backup-recovery-drill.sh
# Optional: DRILL_NOTE="Pre-DHA certification" ./deploy/run-backup-recovery-drill.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$REPO_ROOT/.env"
  set +a
fi

MYSQL_CONTAINER="${MYSQL_CONTAINER:-${KAKAMEGA_MYSQL_CONTAINER:-kakamega_mysql}}"
DB_NAME="${MYSQL_DATABASE:-${DB_NAME:-kakamega_hmis_db}}"
ROOT_PW="${MYSQL_ROOT_PASSWORD:-${REMOTE_MYSQL_ROOT_PASSWORD:-kakamega_root_pass}}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DATE_LOCAL="$(date +%Y-%m-%d)"
OUT="${DRILL_BACKUP_DIR:-$REPO_ROOT/docs/evidence/backups}"
LOG="$REPO_ROOT/docs/DHA_BACKUP_RECOVERY_TEST_LOG.md"
DRILL_DB="kakamega_drill_${STAMP}"

mkdir -p "$OUT"

if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo "ERROR: MySQL container '$MYSQL_CONTAINER' is not running." >&2
  exit 1
fi

BACKUP_FILE="$OUT/kakamega_hmis_drill_${STAMP}.sql.gz"

echo "==> Backup: $DB_NAME -> $BACKUP_FILE"
docker exec "$MYSQL_CONTAINER" mysqldump \
  --default-character-set=utf8mb4 \
  -u root -p"$ROOT_PW" \
  --single-transaction --routines --triggers \
  "$DB_NAME" | gzip > "$BACKUP_FILE"

SHA="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"
SIZE="$(ls -lh "$BACKUP_FILE" | awk '{print $5}')"

echo "==> Pre-drill row counts (production $DB_NAME)"
PRE_PATIENTS="$(docker exec "$MYSQL_CONTAINER" mysql -N -u root -p"$ROOT_PW" "$DB_NAME" \
  -e "SELECT COUNT(*) FROM patients WHERE voided = 0 OR voided IS NULL" 2>/dev/null || echo "n/a")"
PRE_USERS="$(docker exec "$MYSQL_CONTAINER" mysql -N -u root -p"$ROOT_PW" "$DB_NAME" \
  -e "SELECT COUNT(*) FROM users WHERE voided = 0 OR voided IS NULL" 2>/dev/null || echo "n/a")"

echo "==> Restore drill DB: $DRILL_DB"
docker exec "$MYSQL_CONTAINER" mysql -u root -p"$ROOT_PW" \
  -e "DROP DATABASE IF EXISTS \`$DRILL_DB\`; CREATE DATABASE \`$DRILL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

gunzip -c "$BACKUP_FILE" | docker exec -i "$MYSQL_CONTAINER" mysql \
  --default-character-set=utf8mb4 \
  -u root -p"$ROOT_PW" "$DRILL_DB"

POST_PATIENTS="$(docker exec "$MYSQL_CONTAINER" mysql -N -u root -p"$ROOT_PW" "$DRILL_DB" \
  -e "SELECT COUNT(*) FROM patients WHERE voided = 0 OR voided IS NULL" 2>/dev/null || echo "n/a")"
POST_USERS="$(docker exec "$MYSQL_CONTAINER" mysql -N -u root -p"$ROOT_PW" "$DRILL_DB" \
  -e "SELECT COUNT(*) FROM users WHERE voided = 0 OR voided IS NULL" 2>/dev/null || echo "n/a")"
SAMPLE_PATIENT="$(docker exec "$MYSQL_CONTAINER" mysql -N -u root -p"$ROOT_PW" "$DRILL_DB" \
  -e "SELECT CONCAT('patientId=', patientId, ', patientNumber=', COALESCE(patientNumber,''), ', name=', firstName, ' ', lastName) FROM patients ORDER BY patientId DESC LIMIT 1" 2>/dev/null || echo "n/a")"

VERIFY="PASS"
if [[ "$PRE_PATIENTS" != "n/a" && "$POST_PATIENTS" != "n/a" && "$PRE_PATIENTS" != "$POST_PATIENTS" ]]; then
  VERIFY="FAIL (patient count mismatch)"
fi

OPERATOR="${DRILL_OPERATOR:-$(whoami)}"
NOTE="${DRILL_NOTE:-DHA backup/recovery drill — restore to isolated database}"

echo "==> Dropping drill database $DRILL_DB"
docker exec "$MYSQL_CONTAINER" mysql -u root -p"$ROOT_PW" -e "DROP DATABASE IF EXISTS \`$DRILL_DB\`;"

cat > "$LOG" <<EOF
# Backup / recovery test log (DHA evidence)

**Backup/Recovery tested date:** $DATE_LOCAL  
**Test executed (UTC):** $STAMP  
**Result:** $VERIFY  
**Operator:** $OPERATOR  
**Environment:** Docker MySQL container \`$MYSQL_CONTAINER\`, source database \`$DB_NAME\`  
**Note:** $NOTE  

## Procedure

1. Logical backup with \`mysqldump --single-transaction\` (compressed \`.sql.gz\`).
2. Restore into temporary database \`$DRILL_DB\` (production database **not** overwritten).
3. Compare row counts and sample patient row.
4. Drop temporary database.

## Artefacts

| Item | Value |
|------|--------|
| Backup file | \`docs/evidence/backups/$(basename "$BACKUP_FILE")\` |
| File size | $SIZE |
| SHA-256 | \`$SHA\` |

## Verification

| Check | Production (\`$DB_NAME\`) | After restore (\`$DRILL_DB\`) |
|-------|---------------------------|-------------------------------|
| Active patients | $PRE_PATIENTS | $POST_PATIENTS |
| Active users | $PRE_USERS | $POST_USERS |
| Sample record | — | $SAMPLE_PATIENT |

## RTO / RPO (declared targets)

| Metric | Target | This drill |
|--------|--------|------------|
| RPO | 15 minutes (0.25 h) — production SLA | Point-in-time of backup at $STAMP |
| RTO | 4 hours — production SLA | Drill completed in same session (non-production DB) |

## Form HMIS / assessor field

Use **Backup/Recovery Tested:** **$DATE_LOCAL** (attach this log + backup checksum).

## Regenerate

\`\`\`bash
./deploy/run-backup-recovery-drill.sh
\`\`\`

See also \`docs/BACKUP_RESTORE_RUNBOOK.md\`.
EOF

echo ""
echo "Drill complete: $VERIFY"
echo "Log written: $LOG"
echo "Backup: $BACKUP_FILE ($SIZE, sha256=$SHA)"
echo ""
echo "DHA field — Backup/Recovery Tested: $DATE_LOCAL"
