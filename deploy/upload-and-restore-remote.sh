#!/bin/bash

# ============================================
# Upload and Restore Local Database to Remote
# ============================================
# This script uploads a local database dump and restores it on the remote server

set -e

# Load deployment config if it exists
if [ -f "deploy/deploy-config.sh" ]; then
    source deploy/deploy-config.sh
fi

# Configuration with defaults
SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"
APP_DIR="${APP_DIR:-~/kiplombe-hmis}"

# Database configuration
DB_NAME="${MYSQL_DATABASE:-kiplombe_hmis}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass_2024}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if dump file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ ERROR: Please provide the dump file path${NC}"
    echo "Usage: $0 <dump_file.sql.gz> [dump_file.sql]"
    echo ""
    echo "To dump local database first:"
    echo "   ./deploy/dump-local-db.sh"
    exit 1
fi

DUMP_FILE="$1"

# Check if file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}❌ ERROR: Dump file not found: $DUMP_FILE${NC}"
    exit 1
fi

# Expand SSH key path
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
SSH_CMD="ssh -q -T -o BatchMode=yes -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Upload and Restore Database to Remote${NC}"
echo -e "${BLUE}============================================${NC}\n"

echo "📋 Configuration:"
echo "   Server: $SSH_USER@$SERVER_IP"
echo "   Database: $DB_NAME"
echo "   Dump file: $DUMP_FILE"
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ ERROR: SSH key not found at: $SSH_KEY_PATH${NC}"
    exit 1
fi

# Get file size
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo -e "${YELLOW}📤 Uploading dump file ($DUMP_SIZE)...${NC}"

# Upload the dump file to remote server
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$DUMP_FILE" "$SSH_USER@$SERVER_IP:/tmp/db_dump.sql.gz"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Failed to upload dump file${NC}"
    exit 1
fi

echo -e "${GREEN}✅ File uploaded successfully${NC}"
echo ""

# Restore the database on remote server
echo -e "${YELLOW}📥 Restoring database on remote server...${NC}"

eval "$SSH_CMD" << 'RESTORE_EOF'
    set -e
    cd ~/kiplombe-hmis

    # Load environment variables if .env exists
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    # Use environment variables if available, otherwise use defaults
    DB_NAME=${MYSQL_DATABASE:-kiplombe_hmis}
    MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass_2024}

    # Find MySQL container
    MYSQL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i mysql | head -1)
    if [ -z "$MYSQL_CONTAINER" ]; then
        MYSQL_CONTAINER="kiplombe_mysql"
    fi

    if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
        echo "   ❌ ERROR: MySQL container '$MYSQL_CONTAINER' is not running"
        exit 1
    fi

    echo "   Container: $MYSQL_CONTAINER"
    echo "   Database: $DB_NAME"
    echo ""

    # Wait for MySQL to be ready
    echo "   ⏳ Waiting for MySQL to be ready..."
    until docker exec "$MYSQL_CONTAINER" mysqladmin ping -h localhost --silent 2>/dev/null; do
        echo "   ..."
        sleep 2
    done
    echo "   ✅ MySQL is ready"
    echo ""

    # Restore the database (dump already has SET FOREIGN_KEY_CHECKS=0 at start)
    echo "   📥 Restoring database..."
    gunzip -c /tmp/db_dump.sql.gz | docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "   ✅ Database restored successfully"

        # Verify restoration
        echo ""
        echo "   📊 Verifying restoration..."
        TABLE_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>/dev/null || echo "0")
        echo "   📋 Tables in database: $TABLE_COUNT"

        # Show some table names
        echo ""
        echo "   📋 Sample tables:"
        docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e "SHOW TABLES LIMIT 10;" 2>/dev/null | head -10 | sed 's/^/      - /'
    else
        echo "   ❌ ERROR: Database restore failed"
        exit 1
    fi

    # Cleanup
    echo ""
    echo "   🧹 Cleaning up..."
    rm -f /tmp/db_dump.sql.gz
    echo "   ✅ Cleanup complete"
RESTORE_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Database successfully restored on remote server!${NC}"
    echo ""
    echo "Next steps:"
    echo "   1. Verify the application is working correctly"
    echo "   2. Check that all tables are present"
    echo "   3. Test critical functionality"
else
    echo ""
    echo -e "${RED}❌ ERROR: Database restore failed${NC}"
    exit 1
fi
