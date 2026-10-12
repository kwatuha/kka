#!/usr/bin/env bash
# =============================================================================
# Apply telemedicine migrations on REMOTE (in order):
#   1) 43_telemedicine_queue_origin.sql — originType 'queue' + queueEntryId
#   2) 49_telemedicine_video_providers.sql — Zoom / Meet / Teams / other_link / daily enum
#
# From repo root:
#   chmod +x deploy/run-43-queue-origin-remote.sh
#   ./deploy/run-43-queue-origin-remote.sh
#
# Uses same SSH / server / .env password resolution as run-telemedicine-migrations-remote.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ -f "$SCRIPT_DIR/deploy-config.sh" ]; then
  # shellcheck source=deploy/deploy-config.sh
  source "$SCRIPT_DIR/deploy-config.sh"
fi

SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_USER="${SSH_USER:-fhir}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
CONTAINER_NAME="${MYSQL_CONTAINER:-kiplombe_mysql}"
DB_NAME="${MYSQL_DATABASE:-kiplombe_hmis}"

SQL43="$REPO_ROOT/api/database/migrations/43_telemedicine_queue_origin.sql"
SQL49="$REPO_ROOT/api/database/migrations/49_telemedicine_video_providers.sql"

for f in "$SQL43" "$SQL49"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing: $f"
    exit 1
  fi
done

if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "❌ SSH key not found: $SSH_KEY_PATH"
  exit 1
fi

REMOTE_TMP="/tmp/kiplombe_tmig_43_49_$(date +%s)"
REMOTE_PASS="${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass_2024}"

echo "=============================================="
echo " Telemedicine migrations 43 + 49 → REMOTE"
echo "=============================================="
echo " Server:     $SSH_USER@$SERVER_IP"
echo "   43:       43_telemedicine_queue_origin.sql"
echo "   49:       49_telemedicine_video_providers.sql"
echo " Container:  $CONTAINER_NAME"
echo " Database:   $DB_NAME"
echo ""

ssh -q -T -o BatchMode=yes -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
  "${SSH_USER}@${SERVER_IP}" "mkdir -p $REMOTE_TMP"

scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
  "$SQL43" "${SSH_USER}@${SERVER_IP}:${REMOTE_TMP}/43.sql"
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
  "$SQL49" "${SSH_USER}@${SERVER_IP}:${REMOTE_TMP}/49.sql"

echo "📥 Running migrations inside Docker MySQL on server..."
# shellcheck disable=SC2029
ssh -q -T -o BatchMode=yes -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
  "${SSH_USER}@${SERVER_IP}" bash -s << REMOTE_EOF
set -euo pipefail
REMOTE_TMP="$REMOTE_TMP"
DB_NAME="$DB_NAME"
CONTAINER_NAME="$CONTAINER_NAME"
FALLBACK_PW=$(printf '%q' "$REMOTE_PASS")

for d in "\$HOME/kiplombe-hmis" "\$HOME/kiplombehmis" "\$HOME/dev/kiplombehmis"; do
  if [ -f "\$d/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    . "\$d/.env"
    set +a
    echo "   (loaded .env from \$d)"
    break
  fi
done

MYSQL_ROOT_PASSWORD="\${MYSQL_ROOT_PASSWORD:-\$FALLBACK_PW}"

C="\$(docker ps --format '{{.Names}}' | grep -E 'mysql|MariaDB' | head -1)"
if [ -z "\$C" ]; then
  C="\$CONTAINER_NAME"
fi
echo "   container: \$C"

echo "==> 43_telemedicine_queue_origin.sql"
docker exec -i "\$C" mysql -uroot -p"\$MYSQL_ROOT_PASSWORD" "\$DB_NAME" < "\$REMOTE_TMP/43.sql"

echo "==> 49_telemedicine_video_providers.sql"
docker exec -i "\$C" mysql -uroot -p"\$MYSQL_ROOT_PASSWORD" "\$DB_NAME" < "\$REMOTE_TMP/49.sql"

rm -rf "\$REMOTE_TMP"
echo "   (removed \$REMOTE_TMP)"
REMOTE_EOF

echo ""
echo "✅ Migrations 43 + 49 applied on remote (${DB_NAME})."
