#!/usr/bin/env bash
# =============================================================================
# Clone production Kakamega MySQL (VPS) → local Docker MySQL (kakamega_mysql)
# =============================================================================
#
# Prerequisites:
#   docker compose up -d mysql_db
#   deploy/.env.kakamega with REMOTE_MYSQL_ROOT_PASSWORD
#   SSH key access to VPS (kunye@165.22.227.234 by default)
#
# Usage (from repo root):
#   ./deploy/clone-kakamega-db-from-remote.sh
#   ./deploy/clone-kakamega-db-from-remote.sh --dump-only
#   ./deploy/clone-kakamega-db-from-remote.sh api/database/ldb/kakamega_hmis_20260101_120000.sql.gz
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$f"
  set +a
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$REPO_ROOT/deploy/.env.kakamega"

SERVER_IP="${SERVER_IP:-165.22.227.234}"
SSH_USER="${SSH_USER:-kunye}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_asusme}"
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

REMOTE_MYSQL_CONTAINER="${REMOTE_MYSQL_CONTAINER:-db}"
REMOTE_MYSQL_ROOT_PASSWORD="${REMOTE_MYSQL_ROOT_PASSWORD:-${REMOTE_DB_ROOT_PASSWORD:-}}"
SOURCE_DB="${SOURCE_DB:-${DB_NAME:-kakamega_hmis_db}}"

LOCAL_MYSQL_CONTAINER="${LOCAL_MYSQL_CONTAINER:-kakamega_mysql}"
LOCAL_DB="${LOCAL_DB:-${MYSQL_DATABASE:-kakamega_hmis_db}}"
LOCAL_ROOT_PASSWORD="${LOCAL_MYSQL_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-kakamega_root_pass}}"

OUTPUT_DIR="$REPO_ROOT/api/database/ldb"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  sed -n '2,18p' "$0" | sed 's/^# //'
  exit "${1:-0}"
}

dump_remote() {
  if [[ -z "$REMOTE_MYSQL_ROOT_PASSWORD" ]]; then
    echo -e "${RED}ERROR: set REMOTE_MYSQL_ROOT_PASSWORD in deploy/.env.kakamega${NC}" >&2
    exit 1
  fi
  if [[ ! -f "$SSH_KEY_PATH" ]]; then
    echo -e "${RED}ERROR: SSH key not found: $SSH_KEY_PATH${NC}" >&2
    exit 1
  fi

  mkdir -p "$OUTPUT_DIR"
  local dump_sql="${OUTPUT_DIR}/${SOURCE_DB}_${TIMESTAMP}.sql"
  local dump_gz="${dump_sql}.gz"

  echo -e "${BLUE}==> Dumping ${SOURCE_DB} from ${SSH_USER}@${SERVER_IP} (${REMOTE_MYSQL_CONTAINER})${NC}" >&2

  # Exclude known broken views from IntelliNex clone lineage (mysqldump aborts otherwise).
  local ignore_args=()
  local views
  views="$(ssh -q -T -o BatchMode=yes -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
    "${SSH_USER}@${SERVER_IP}" \
    "docker exec -e MYSQL_PWD='${REMOTE_MYSQL_ROOT_PASSWORD}' ${REMOTE_MYSQL_CONTAINER} mysql -uroot -N -e \
      \"SELECT table_name FROM information_schema.views WHERE table_schema='${SOURCE_DB}';\" 2>/dev/null" || true)"
  while IFS= read -r view; do
    [[ -n "$view" ]] || continue
    ignore_args+=(--ignore-table="${SOURCE_DB}.${view}")
  done <<< "$views"

  ssh -q -T -o BatchMode=yes -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
    "${SSH_USER}@${SERVER_IP}" \
    "docker exec -e MYSQL_PWD='${REMOTE_MYSQL_ROOT_PASSWORD}' ${REMOTE_MYSQL_CONTAINER} mysqldump -u root \
      --single-transaction --routines --triggers --events --force \
      ${ignore_args[*]:-} \
      --databases '${SOURCE_DB}'" \
    | sed "s/\`${SOURCE_DB}\`/\`${LOCAL_DB}\`/g" \
    | sed "s/USE \`${SOURCE_DB}\`/USE \`${LOCAL_DB}\`/g" \
    > "$dump_sql"

  if [[ ! -s "$dump_sql" ]]; then
    echo -e "${RED}ERROR: remote dump is empty${NC}" >&2
    exit 1
  fi

  gzip -f "$dump_sql"
  echo -e "${GREEN}✓ Saved ${dump_gz} ($(du -h "$dump_gz" | cut -f1))${NC}" >&2
  printf '%s\n' "$dump_gz"
}

restore_local() {
  local dump_gz="$1"
  if [[ ! -f "$dump_gz" ]]; then
    echo -e "${RED}ERROR: dump not found: $dump_gz${NC}" >&2
    exit 1
  fi
  if ! docker ps --format '{{.Names}}' | grep -qx "$LOCAL_MYSQL_CONTAINER"; then
    echo -e "${RED}ERROR: local MySQL container '$LOCAL_MYSQL_CONTAINER' is not running${NC}" >&2
    echo "   Start with: docker compose up -d mysql_db" >&2
    exit 1
  fi

  echo -e "${YELLOW}==> Restoring into local ${LOCAL_DB} (${LOCAL_MYSQL_CONTAINER})…${NC}"
  MYSQL_ROOT_PASSWORD="$LOCAL_ROOT_PASSWORD" MYSQL_DATABASE="$LOCAL_DB" \
    bash "$SCRIPT_DIR/restore-db.sh" "$dump_gz"
}

case "${1:-}" in
  -h|--help|"")
    usage 0
    ;;
  --dump-only)
    dump_remote >/dev/null
  ;;
  --full|"")
    dump_gz="$(dump_remote)"
    restore_local "$dump_gz"
    echo ""
    echo -e "${GREEN}✅ Production database cloned to local ${LOCAL_DB}.${NC}"
    echo "   UI:  http://localhost:${HMIS_FRONTEND_PORT:-5400}/hmis/login"
    echo "   API: http://localhost:${API_PORT:-3222}"
    echo "   Use staff credentials from your secure credential store (not in repo)."
    ;;
  *)
    restore_local "$1"
    echo -e "${GREEN}✅ Restored dump into local ${LOCAL_DB}.${NC}"
    ;;
esac
