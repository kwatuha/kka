#!/usr/bin/env bash
# =============================================================================
# Create Kakamega DB + user on remote shared MySQL, optionally clone data
# =============================================================================
#
# Empty DB:
#   REMOTE_MYSQL_ROOT_PASSWORD=… ./deploy/setup-kakamega-db-remote.sh
#
# Clone from existing remote DB:
#   CLONE_FROM_DB=intellinex_hmis_db \
#     REMOTE_MYSQL_ROOT_PASSWORD=… ./deploy/setup-kakamega-db-remote.sh --clone
#
# Credentials default from deploy/.env.kakamega (or env.kakamega.example values).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

DO_CLONE=0
for arg in "$@"; do
  case "$arg" in
    --clone) DO_CLONE=1 ;;
    -h|--help)
      sed -n '1,25p' "$0"
      exit 0
      ;;
  esac
done

load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$f"
  set +a
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/deploy/.env.api-server"
load_env_file "$REPO_ROOT/deploy/.env.kakamega"

SERVER_IP="${SERVER_IP:-165.22.227.234}"
SSH_USER="${SSH_USER:-kunye}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_asusme}"
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

REMOTE_MYSQL_CONTAINER="${REMOTE_MYSQL_CONTAINER:-db}"
REMOTE_MYSQL_ROOT_PASSWORD="${REMOTE_MYSQL_ROOT_PASSWORD:-${REMOTE_DB_ROOT_PASSWORD:-}}"

TARGET_DB="${TARGET_DB:-${DB_NAME:-kakamega_hmis_db}}"
TARGET_USER="${TARGET_USER:-${DB_USER:-kakamega_user}}"
TARGET_PASSWORD="${TARGET_PASSWORD:-${DB_PASSWORD:-}}"

CLONE_FROM_DB="${CLONE_FROM_DB:-intellinex_hmis_db}"
CLONE_FROM_LOCAL="${CLONE_FROM_LOCAL:-0}"
LOCAL_MYSQL_CONTAINER="${LOCAL_MYSQL_CONTAINER:-}"
LOCAL_SOURCE_DB="${LOCAL_SOURCE_DB:-${MYSQL_DATABASE:-intellinex_hmis_db}}"
LOCAL_ROOT_PASS="${LOCAL_MYSQL_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-root_password}}"

if [[ -z "$REMOTE_MYSQL_ROOT_PASSWORD" ]]; then
  echo "ERROR: set REMOTE_MYSQL_ROOT_PASSWORD (or add it to deploy/.env.kakamega)." >&2
  exit 1
fi
if [[ -z "$TARGET_PASSWORD" ]]; then
  echo "ERROR: set DB_PASSWORD / TARGET_PASSWORD for the new Kakamega MySQL user." >&2
  exit 1
fi

echo "==> Creating DB '${TARGET_DB}' + user '${TARGET_USER}' on ${SSH_USER}@${SERVER_IP} (${REMOTE_MYSQL_CONTAINER})"

ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
  "$SSH_USER@$SERVER_IP" \
  REMOTE_MYSQL_CONTAINER="$REMOTE_MYSQL_CONTAINER" \
  REMOTE_MYSQL_ROOT_PASSWORD="$REMOTE_MYSQL_ROOT_PASSWORD" \
  TARGET_DB="$TARGET_DB" \
  TARGET_USER="$TARGET_USER" \
  TARGET_PASSWORD="$TARGET_PASSWORD" \
  bash -s <<'REMOTE'
set -euo pipefail
docker exec -i "$REMOTE_MYSQL_CONTAINER" mysql -uroot -p"$REMOTE_MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${TARGET_USER}'@'%' IDENTIFIED BY '${TARGET_PASSWORD}';
ALTER USER '${TARGET_USER}'@'%' IDENTIFIED BY '${TARGET_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${TARGET_DB}\`.* TO '${TARGET_USER}'@'%';
FLUSH PRIVILEGES;
SQL
echo "OK: database and grants ready."
REMOTE

if [[ "$DO_CLONE" != "1" ]]; then
  echo "==> Empty DB ready. Load schema via local setup script after deploy, or re-run with --clone."
  echo "    Next: fill deploy/.env.kakamega and run deploy-kakamega-shared-mysql.sh"
  exit 0
fi

DUMP_TMP="$(mktemp)"
trap 'rm -f "$DUMP_TMP" "$DUMP_TMP.gz"' EXIT

if [[ "$CLONE_FROM_LOCAL" == "1" ]]; then
  if [[ -z "$LOCAL_MYSQL_CONTAINER" ]]; then
    LOCAL_MYSQL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E 'mysql' | head -1 || true)
  fi
  if [[ -z "$LOCAL_MYSQL_CONTAINER" ]]; then
    echo "ERROR: No local MySQL container. Set LOCAL_MYSQL_CONTAINER." >&2
    exit 1
  fi
  echo "==> Dumping local ${LOCAL_SOURCE_DB} from ${LOCAL_MYSQL_CONTAINER} ..."
  docker exec -e MYSQL_PWD="$LOCAL_ROOT_PASS" "$LOCAL_MYSQL_CONTAINER" \
    mysqldump -u root \
    --single-transaction --routines --triggers --events \
    --databases "$LOCAL_SOURCE_DB" \
    | sed "s/\`${LOCAL_SOURCE_DB}\`/\`${TARGET_DB}\`/g" \
    | sed "s/USE \`${LOCAL_SOURCE_DB}\`/USE \`${TARGET_DB}\`/g" \
    > "$DUMP_TMP"
else
  echo "==> Dumping remote ${CLONE_FROM_DB} ..."
  ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    "$SSH_USER@$SERVER_IP" \
    "docker exec -e MYSQL_PWD='$REMOTE_MYSQL_ROOT_PASSWORD' '$REMOTE_MYSQL_CONTAINER' mysqldump -u root --single-transaction --routines --triggers --events --databases '$CLONE_FROM_DB'" \
    | sed "s/\`${CLONE_FROM_DB}\`/\`${TARGET_DB}\`/g" \
    | sed "s/USE \`${CLONE_FROM_DB}\`/USE \`${TARGET_DB}\`/g" \
    > "$DUMP_TMP"
fi

echo "==> Loading dump into remote ${TARGET_DB} ..."
gzip -c "$DUMP_TMP" > "${DUMP_TMP}.gz"
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
  "${DUMP_TMP}.gz" "${SSH_USER}@${SERVER_IP}:/tmp/kakamega_clone.sql.gz"
ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
  "$SSH_USER@$SERVER_IP" \
  REMOTE_MYSQL_CONTAINER="$REMOTE_MYSQL_CONTAINER" \
  REMOTE_MYSQL_ROOT_PASSWORD="$REMOTE_MYSQL_ROOT_PASSWORD" \
  bash -s <<'REMOTE'
set -euo pipefail
gunzip -c /tmp/kakamega_clone.sql.gz | docker exec -i "$REMOTE_MYSQL_CONTAINER" mysql -uroot -p"$REMOTE_MYSQL_ROOT_PASSWORD"
rm -f /tmp/kakamega_clone.sql.gz
echo "OK: clone loaded."
REMOTE

echo "==> Done. Point DB_NAME=${TARGET_DB} in deploy/.env.kakamega and deploy."
