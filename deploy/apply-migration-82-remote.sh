#!/usr/bin/env bash
# Apply migration 82 (service points + branch-scoped queues) on remote Kakamega MySQL.
set -euo pipefail

SERVER_IP="${SERVER_IP:-165.22.227.234}"
SSH_USER="${SSH_USER:-kunye}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_asusme}"
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
REMOTE_DIR="${REMOTE_DIR:-intellinex-kakamega}"
SQL_NAME="82_service_points_and_queue_scope.sql"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/api/database/migrations/$SQL_NAME"

scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
  "$SQL" "${SSH_USER}@${SERVER_IP}:/tmp/$SQL_NAME"

ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
  "$SSH_USER@$SERVER_IP" bash -s <<REMOTE
set -euo pipefail
cd "\$HOME/${REMOTE_DIR}"
set -a && source .env && set +a
MYSQL_CONTAINER=\${MYSQL_CONTAINER:-\${KAKAMEGA_MYSQL_CONTAINER:-db}}
DB_NAME=\${MYSQL_DATABASE:-\${DB_NAME:-kakamega_hmis_db}}
ROOT_PW="\${REMOTE_MYSQL_ROOT_PASSWORD:-\${MYSQL_ROOT_PASSWORD:-}}"
if [[ -z "\$ROOT_PW" ]]; then
  echo "ERROR: set REMOTE_MYSQL_ROOT_PASSWORD or MYSQL_ROOT_PASSWORD in remote .env" >&2
  exit 1
fi
docker exec -i "\$MYSQL_CONTAINER" mysql -u root -p"\$ROOT_PW" "\$DB_NAME" < "/tmp/$SQL_NAME"
echo "Migration 82 applied."
REMOTE
