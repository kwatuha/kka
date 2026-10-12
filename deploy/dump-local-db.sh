#!/bin/bash

# ============================================
# Local Database Dump Script
# ============================================
# This script dumps the local database using Docker

set -e

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database configuration
DB_NAME="${MYSQL_DATABASE:-kiplombe_hmis}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root_password}"

# Local output directory
OUTPUT_DIR="api/database/ldb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${OUTPUT_DIR}/kiplombe_hmis_local_${TIMESTAMP}.sql"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Local Database Dump${NC}"
echo -e "${BLUE}============================================${NC}\n"

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   Output: $DUMP_FILE"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Prefer kiplombe_mysql (local Docker Compose container name)
MYSQL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "kiplombe_mysql|mysql" | head -1)
if [ -z "$MYSQL_CONTAINER" ]; then
    MYSQL_CONTAINER="kiplombe_mysql"
fi

if ! docker ps --format "{{.Names}}" | grep -q "^${MYSQL_CONTAINER}$"; then
    echo -e "${RED}❌ ERROR: MySQL container '$MYSQL_CONTAINER' is not running${NC}"
    echo "   Please start the MySQL container first:"
    echo "   docker-compose up -d mysql_db"
    exit 1
fi

echo -e "${YELLOW}📦 Dumping local database...${NC}"
echo "   Container: $MYSQL_CONTAINER"
echo "   Database: $DB_NAME"

# Dump the database
docker exec "$MYSQL_CONTAINER" mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "$DB_NAME" \
    --set-gtid-purged=OFF 2>/dev/null | \
    sed '1i SET FOREIGN_KEY_CHECKS=0;' > "$DUMP_FILE" || {
    echo -e "${YELLOW}⚠️  Root user failed, trying alternative method...${NC}"
    # Try with DB user if root fails
    DB_USER="${MYSQL_USER:-kiplombe_user}"
    DB_PASSWORD="${MYSQL_PASSWORD:-kiplombe_password}"
    docker exec "$MYSQL_CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "$DB_NAME" \
        --set-gtid-purged=OFF 2>/dev/null | \
        sed '1i SET FOREIGN_KEY_CHECKS=0;' > "$DUMP_FILE"
}

# Check if dump was successful
if [ ! -f "$DUMP_FILE" ] || [ ! -s "$DUMP_FILE" ]; then
    echo -e "${RED}❌ ERROR: Database dump failed or is empty${NC}"
    exit 1
fi

# Compress the dump file
echo -e "${YELLOW}📦 Compressing dump file...${NC}"
gzip -f "$DUMP_FILE"
DUMP_FILE="${DUMP_FILE}.gz"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo -e "\n${GREEN}✅ Database dump completed successfully!${NC}"
echo -e "   📁 File: $DUMP_FILE"
echo -e "   📊 Size: $DUMP_SIZE"
echo ""
echo "To restore this dump locally:"
echo "   ./deploy/restore-db.sh $DUMP_FILE"
echo ""
echo "To upload and restore to remote:"
echo "   ./deploy/upload-and-restore-remote.sh $DUMP_FILE"
