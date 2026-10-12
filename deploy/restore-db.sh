#!/bin/bash

# ============================================
# Database Restore Script
# ============================================
# Restores a mysqldump (.sql or .sql.gz) into the local Docker MySQL container.
# Run from repository root: ./deploy/restore-db.sh path/to/dump.sql.gz

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load env: repo root .env first, then cwd .env
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$REPO_ROOT/.env"
  set +a
elif [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  . ".env"
  set +a
fi

# Check if dump file is provided
if [ -z "${1:-}" ]; then
    echo -e "${RED}❌ ERROR: Please provide the dump file path${NC}"
    echo "Usage: $0 <dump_file.sql|dump_file.sql.gz>"
    exit 1
fi

DUMP_FILE="$1"

# Resolve relative paths from cwd
if [[ "$DUMP_FILE" != /* ]]; then
  DUMP_FILE="$(cd "$(dirname "$DUMP_FILE")" && pwd)/$(basename "$DUMP_FILE")"
fi

# Check if file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}❌ ERROR: Dump file not found: $DUMP_FILE${NC}"
    exit 1
fi

# Check if MySQL container exists (prefer Kakamega local stack when running)
MYSQL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "kakamega_mysql|kiplombe_mysql|mysql" | head -1)
if [ -z "$MYSQL_CONTAINER" ]; then
    MYSQL_CONTAINER="kiplombe_mysql"
fi

# Database configuration
DB_NAME="${MYSQL_DATABASE:-kiplombe_hmis}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root_password}"
if [[ "$MYSQL_CONTAINER" == "kakamega_mysql" ]]; then
  DB_NAME="${MYSQL_DATABASE:-kakamega_hmis_db}"
  MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-kakamega_root_pass}"
fi

if ! docker ps --format "{{.Names}}" | grep -q "^${MYSQL_CONTAINER}$"; then
    echo -e "${RED}❌ ERROR: MySQL container '$MYSQL_CONTAINER' is not running${NC}"
    echo "   Start with: docker compose up -d mysql_db"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Database Restore${NC}"
echo -e "${BLUE}============================================${NC}\n"

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   Dump file: $DUMP_FILE"
echo ""

echo -e "${YELLOW}📥 Restoring database (streaming into MySQL)...${NC}"
echo "   Container: $MYSQL_CONTAINER"

# Strip UTF-8 BOM, then skip SSH/MOTD/terminal junk until mysqldump output starts.
# (Happens if a dump was saved from a session that echoed "Welcome to Ubuntu..." before mysqldump.)
strip_leading_non_sql() {
  if [ "${SKIP_SQL_PREFIX_STRIP:-}" = "1" ]; then
    cat
    return
  fi
  # shellcheck disable=SC2016
  awk '
    BEGIN { skip=1 }
    {
      if (skip) {
        if ($0 ~ /^-- MySQL dump/ || $0 ~ /^\/\*![0-9]{5}/ || $0 ~ /^SET @OLD_CHARACTER_SET/ \
            || $0 ~ /^SET NAMES/ || $0 ~ /^CREATE DATABASE/ || $0 ~ /^DROP DATABASE/ \
            || $0 ~ /^LOCK TABLES/ || $0 ~ /^\/\*!M? /)
          skip=0
      }
      if (!skip) print
    }
    END {
      if (skip) exit 2
    }
  '
}

set +e
FIRST_LINE="$(if [[ "$DUMP_FILE" == *.gz ]]; then gunzip -c "$DUMP_FILE"; else cat "$DUMP_FILE"; fi | head -1)"
if [[ "$FIRST_LINE" == *Welcome*Ubuntu* ]] || [[ "$FIRST_LINE" == *Document* ]] || [[ "$FIRST_LINE" == *GNU/Linux* ]]; then
  echo -e "${YELLOW}   Detected non-SQL prefix (SSH banner/MOTD). Stripping until mysqldump header…${NC}"
fi

if [[ "$DUMP_FILE" == *.gz ]]; then
  echo "   Format: gzip compressed"
else
  echo "   Format: plain SQL"
fi

# sed: strip UTF-8 BOM on first line only (GNU sed)
set -o pipefail
if [[ "$DUMP_FILE" == *.gz ]]; then
  gunzip -c "$DUMP_FILE"
else
  cat "$DUMP_FILE"
fi | sed $'1s/^\xEF\xBB\xBF//' | strip_leading_non_sql | docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" \
  --init-command="SET FOREIGN_KEY_CHECKS=0; SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO';"
RESTORE_EXIT=$?
set +o pipefail
set -e

if [ "$RESTORE_EXIT" -eq 2 ]; then
  echo -e "\n${RED}❌ ERROR: Dump does not contain recognizable mysqldump output (-- MySQL dump, /*!..., SET, CREATE DATABASE, …).${NC}"
  echo "   Re-create the dump from the server (see deploy/dump-remote-db.sh) or set SKIP_SQL_PREFIX_STRIP=1 if your dump uses an unusual format."
  exit 1
fi

if [ "$RESTORE_EXIT" -eq 0 ]; then
    echo -e "\n${GREEN}✅ Database restored successfully!${NC}"
else
    echo -e "\n${RED}❌ ERROR: Database restore failed (exit $RESTORE_EXIT)${NC}"
    exit 1
fi
