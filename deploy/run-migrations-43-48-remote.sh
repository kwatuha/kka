#!/usr/bin/env bash
# =============================================================================
# Run SQL migrations 43–48 on the REMOTE server (e.g. 41.89.173.8)
# =============================================================================
# Two files share prefix 43 (lab + telemedicine); there is no 47_*.sql in repo.
# Order: lab 43 → telemedicine 43 → 44 → 45 → 46 → 48
#
# From repo root:
#   chmod +x deploy/run-migrations-43-48-remote.sh
#   ./deploy/run-migrations-43-48-remote.sh
#
# Optional: SERVER_IP=x SSH_USER=x SSH_KEY_PATH=~/.ssh/key ./deploy/run-migrations-43-48-remote.sh
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

MIGRATIONS=(
  "$REPO_ROOT/api/database/migrations/43_lab_awaiting_payment_status.sql"
  "$REPO_ROOT/api/database/migrations/43_telemedicine_queue_origin.sql"
  "$REPO_ROOT/api/database/migrations/44_role_queue_telemedicine_procedure.sql"
  "$REPO_ROOT/api/database/migrations/45_radiology_awaiting_payment_status.sql"
  "$REPO_ROOT/api/database/migrations/46_lab_test_orders_awaiting_payment_enum.sql"
  "$REPO_ROOT/api/database/migrations/48_patient_procedures_outcome.sql"
)

for f in "${MIGRATIONS[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing: $f"
    exit 1
  fi
done

if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "❌ SSH key not found: $SSH_KEY_PATH"
  exit 1
fi

REMOTE_TMP="/tmp/kiplombe_m43_48_$(date +%s)"
REMOTE_PASS="${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass_2024}"

echo "=============================================="
echo " Migrations 43–48 → REMOTE MySQL"
echo "=============================================="
echo " Server:     $SSH_USER@$SERVER_IP"
echo " Staging:    $REMOTE_TMP"
echo " Container:  $CONTAINER_NAME"
echo " Database:   $DB_NAME"
echo ""

ssh -q -T -o BatchMode=yes -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
  "${SSH_USER}@${SERVER_IP}" "mkdir -p $REMOTE_TMP"

i=0
for f in "${MIGRATIONS[@]}"; do
  i=$((i + 1))
  bn=$(printf "%02d_%s" "$i" "$(basename "$f")")
  scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
    "$f" "${SSH_USER}@${SERVER_IP}:${REMOTE_TMP}/${bn}"
done

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

for sql in "\$REMOTE_TMP"/*.sql; do
  echo "==> \$(basename "\$sql")"
  docker exec -i "\$C" mysql -uroot -p"\$MYSQL_ROOT_PASSWORD" "\$DB_NAME" < "\$sql"
done

rm -rf "\$REMOTE_TMP"
echo "   (removed \$REMOTE_TMP)"
REMOTE_EOF

echo ""
echo "✅ Migrations 43–48 finished on remote (${DB_NAME})."
