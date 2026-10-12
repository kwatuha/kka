#!/usr/bin/env bash
# =============================================================================
# Sync production/remote MySQL (41.89.173.8) → local Docker MySQL, then migrations
# =============================================================================
# Prerequisites:
#   - SSH access to the server (see deploy/deploy-config.sh or env vars below)
#   - Local: docker compose up -d mysql_db  (container kiplombe_mysql)
#   - Repo root .env with MYSQL_ROOT_PASSWORD matching local Docker (default root_password)
#
# Usage:
#   ./deploy/sync-remote-to-local.sh --dump-only
#       → Creates api/database/ldb/kiplombe_hmis_<timestamp>.sql.gz on this machine
#
#   ./deploy/sync-remote-to-local.sh api/database/ldb/kiplombe_hmis_20260101_120000.sql.gz
#       → Restores that file into local MySQL, then runs telemedicine migrations (40–43)
#
#   ./deploy/sync-remote-to-local.sh --full
#       → Dump from remote, restore locally, run telemedicine migrations (one shot)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  sed -n '2,22p' "$0" | sed 's/^# //'
  exit "${1:-0}"
}

run_telemedicine_migrations() {
  echo -e "\n${BLUE}==> Telemedicine migrations (40–43: sessions, zoom_manual, user defaults, standalone)${NC}"
  if docker ps --format '{{.Names}}' | grep -q '^kiplombe_mysql$'; then
    (cd "$REPO_ROOT/api" && npm run migrate:telemedicine:docker)
  else
    echo -e "${YELLOW}⚠ kiplombe_mysql not running — using api/.env and local mysql client${NC}"
    (cd "$REPO_ROOT/api" && npm run migrate:telemedicine)
  fi
}

run_optional_migrations_prompt() {
  echo -e "\n${BLUE}==> Optional: schema gap check (interactive)${NC}"
  echo "   bash deploy/check-and-run-migrations.sh"
  echo "   (answers prompts for older incremental migrations not in the telemedicine bundle)"
}

case "${1:-}" in
  -h|--help|"")
    usage 0
    ;;
  --dump-only)
    echo -e "${BLUE}Dumping remote database to api/database/ldb/ …${NC}"
    bash "$SCRIPT_DIR/dump-remote-db.sh"
    echo -e "\n${GREEN}Next:${NC} ./deploy/sync-remote-to-local.sh api/database/ldb/kiplombe_hmis_*.sql.gz"
    echo "   Or:     ./deploy/sync-remote-to-local.sh --full"
    ;;
  --full)
    echo -e "${YELLOW}This will overwrite local ${MYSQL_DATABASE:-kiplombe_hmis} with remote data.${NC}"
    read -r -p "Continue? [y/N] " ok
    [[ "$ok" =~ ^[Yy]$ ]] || exit 0
    bash "$SCRIPT_DIR/dump-remote-db.sh"
    LATEST=$(ls -t "$REPO_ROOT/api/database/ldb"/kiplombe_hmis_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$LATEST" ] || [ ! -f "$LATEST" ]; then
      echo -e "${RED}No dump file found under api/database/ldb/${NC}"
      exit 1
    fi
    echo -e "${BLUE}Restoring: $LATEST${NC}"
    bash "$SCRIPT_DIR/restore-db.sh" "$LATEST"
    run_telemedicine_migrations
    run_optional_migrations_prompt
    echo -e "\n${GREEN}✅ Full sync finished.${NC}"
    ;;
  *)
    DUMP="$1"
    if [ ! -f "$DUMP" ]; then
      # allow path relative to repo
      if [ -f "$REPO_ROOT/$DUMP" ]; then
        DUMP="$REPO_ROOT/$DUMP"
      else
        echo -e "${RED}File not found: $1${NC}"
        exit 1
      fi
    fi
    echo -e "${YELLOW}Restoring dump into local Docker MySQL…${NC}"
    bash "$SCRIPT_DIR/restore-db.sh" "$DUMP"
    run_telemedicine_migrations
    run_optional_migrations_prompt
    echo -e "\n${GREEN}✅ Restore + telemedicine migrations finished.${NC}"
    ;;
esac
