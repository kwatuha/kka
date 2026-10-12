#!/usr/bin/env bash
# Apply migration 79 (mobile consultation sync) to local Kakamega MySQL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-kakamega_mysql}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-kakamega_root_pass}"
DB_NAME="${MYSQL_DATABASE:-kakamega_hmis_db}"
SQL="$ROOT/api/database/migrations/79_mobile_consultation_sync.sql"

if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo "Container $MYSQL_CONTAINER is not running. Start with: docker compose --env-file .env up -d"
  exit 1
fi

docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$SQL"
docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE 'mobile_consultation_sync'; DESCRIBE mobile_consultation_sync;"
echo "Migration 79 applied."
