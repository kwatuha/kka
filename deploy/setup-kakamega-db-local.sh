#!/usr/bin/env bash
# =============================================================================
# Load schema + migrations + Kakamega seed into local kakamega_mysql
# =============================================================================
#
# Prerequisites:
#   docker compose up -d   (kakamega_mysql healthy)
#
# Usage (from repo root):
#   ./deploy/setup-kakamega-db-local.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MYSQL_CONTAINER="${MYSQL_CONTAINER:-kakamega_mysql}"
DB_NAME="${MYSQL_DATABASE:-${DB_NAME:-kakamega_hmis_db}}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-kakamega_root_pass}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🗄️  Kakamega HMIS — local database setup"
echo "   Container: $MYSQL_CONTAINER"
echo "   Database:  $DB_NAME"
echo ""

if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo -e "${RED}❌ MySQL container '$MYSQL_CONTAINER' is not running.${NC}"
  echo "   Start with: docker compose --env-file .env up -d"
  exit 1
fi

echo "⏳ Waiting for MySQL..."
until docker exec "$MYSQL_CONTAINER" mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; do
  sleep 2
done
echo -e "${GREEN}✓ MySQL ready${NC}"

run_sql() {
  local file="$1"
  echo "📄 $(basename "$file")"
  # Force statements into $DB_NAME (many SQL files hardcode USE kiplombe_hmis / intellinex_hmis_db)
  sed -E \
    -e "s/^[[:space:]]*USE[[:space:]]+\`?[A-Za-z0-9_]+\`?[[:space:]]*;/USE \`${DB_NAME}\`;/I" \
    -e "s/CREATE DATABASE IF NOT EXISTS[[:space:]]+\`?[A-Za-z0-9_]+\`?/CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`/I" \
    "$file" \
  | docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" \
    2>&1 | grep -v -E 'Warning|Using a password' || true
}

echo ""
echo "📚 Base schema..."
if [[ -f api/database/schema.sql ]]; then
  run_sql api/database/schema.sql
fi

echo ""
echo "📚 Module schemas (*_schema.sql)..."
shopt -s nullglob
for schema in api/database/*_schema.sql; do
  run_sql "$schema"
done
shopt -u nullglob

echo ""
echo "📚 Migrations (ordered)..."
# Some migrations depend on columns from others but sort earlier alphabetically.
PRIORITY_MIGRATIONS=(
  add_role_landing_config.sql
  add_landing_quick_links.sql
  add_role_dashboard_cards.sql
)
declare -A PRIORITY_DONE=()
for mig_name in "${PRIORITY_MIGRATIONS[@]}"; do
  mig="api/database/migrations/$mig_name"
  if [[ -f "$mig" ]]; then
    run_sql "$mig"
    PRIORITY_DONE["$mig_name"]=1
  fi
done

shopt -s nullglob
for mig in api/database/migrations/*.sql; do
  base="$(basename "$mig")"
  if [[ -n "${PRIORITY_DONE[$base]:-}" ]]; then
    continue
  fi
  # Skip telemedicine showcase pack (hides menus) — full HMIS for county pilot
  if [[ "$base" == *telemedicine_showcase* ]]; then
    echo -e "${YELLOW}⏭  Skipping $base (telemedicine showcase)${NC}"
    continue
  fi
  run_sql "$mig"
done
shopt -u nullglob

if [[ -f api/database/sample_data/18_icd10_diagnoses_sample.sql ]]; then
  echo ""
  echo "📚 ICD-10 sample codes..."
  run_sql api/database/sample_data/18_icd10_diagnoses_sample.sql
fi

echo ""
echo "🏥 Kakamega facility seed..."
run_sql api/database/kakamega_seed.sql

echo ""
echo -e "${GREEN}✅ Kakamega database ready${NC}"
echo ""
echo "   Login: use staff credentials from your local UAT list (not stored in repo)."
echo "   MySQL: localhost:${MYSQL_PORT:-3330}  db=$DB_NAME  user=${MYSQL_USER:-kakamega_user}"
echo "   UI:    http://localhost:${HMIS_FRONTEND_PORT:-5400}/hmis"
echo "   API:   http://localhost:${API_PORT:-3222}"
