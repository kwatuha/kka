#!/bin/bash

# ============================================
# Remote Database Dump Script
# ============================================
# This script dumps the remote database and saves it locally

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
DB_USER="${MYSQL_USER:-kiplombe_user}"
DB_PASSWORD="${MYSQL_PASSWORD:-kiplombe_pass_2024}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass_2024}"

# Local output directory
OUTPUT_DIR="api/database/ldb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${OUTPUT_DIR}/kiplombe_hmis_${TIMESTAMP}.sql"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Expand SSH key path
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
# -q quiet, -T no pseudo-tty (reduces MOTD/"Welcome to Ubuntu" leaking into dump stdout)
SSH_CMD="ssh -q -T -o BatchMode=yes -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Remote Database Dump${NC}"
echo -e "${BLUE}============================================${NC}\n"

echo "📋 Configuration:"
echo "   Server: $SSH_USER@$SERVER_IP"
echo "   Database: $DB_NAME"
echo "   Output: $DUMP_FILE"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ ERROR: SSH key not found at: $SSH_KEY_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Dumping remote database...${NC}"

# Dump the database from remote server
eval "$SSH_CMD" << REMOTE_DUMP_EOF
    set -e
    cd $APP_DIR

    # Load environment variables if .env exists
    if [ -f .env ]; then
        export \$(cat .env | grep -v '^#' | xargs)
    fi

    # Use environment variables if available, otherwise use defaults
    DB_NAME=\${MYSQL_DATABASE:-$DB_NAME}
    DB_USER=\${MYSQL_USER:-$DB_USER}
    DB_PASSWORD=\${MYSQL_PASSWORD:-$DB_PASSWORD}
    MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}

    echo "   Connecting to MySQL container..."

    # Check if MySQL container exists
    if ! docker ps | grep -q kiplombe_mysql; then
        echo "   ⚠️  MySQL container not running, trying to find MySQL service..."
        # Try alternative container names
        MYSQL_CONTAINER=\$(docker ps --format "{{.Names}}" | grep -i mysql | head -1)
        if [ -z "\$MYSQL_CONTAINER" ]; then
            echo "   ❌ ERROR: No MySQL container found"
            exit 1
        fi
        echo "   ✓ Found MySQL container: \$MYSQL_CONTAINER"
    else
        MYSQL_CONTAINER="kiplombe_mysql"
    fi

    echo "   📤 Dumping database: \$DB_NAME"

    # Dump the database
    docker exec \$MYSQL_CONTAINER mysqldump -u root -p"\$MYSQL_ROOT_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "\$DB_NAME" > /tmp/db_dump.sql 2>/dev/null || {
        echo "   ⚠️  Root user failed, trying with DB user..."
        docker exec \$MYSQL_CONTAINER mysqldump -u "\$DB_USER" -p"\$DB_PASSWORD" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --databases "\$DB_NAME" > /tmp/db_dump.sql
    }

    # Check if dump was successful
    if [ ! -f /tmp/db_dump.sql ] || [ ! -s /tmp/db_dump.sql ]; then
        echo "   ❌ ERROR: Database dump failed or is empty"
        exit 1
    fi

    DUMP_SIZE=\$(du -h /tmp/db_dump.sql | cut -f1)
    echo "   ✓ Database dumped successfully (\$DUMP_SIZE)"

    # Output the dump file
    cat /tmp/db_dump.sql

    # Cleanup
    rm -f /tmp/db_dump.sql
REMOTE_DUMP_EOF

# Check if the dump was successful
if [ $? -eq 0 ]; then
    # Save the output to file
    eval "$SSH_CMD" << REMOTE_DUMP_EOF | gzip > "${DUMP_FILE}.gz"
    set -e
    cd $APP_DIR

    # Load environment variables if .env exists
    if [ -f .env ]; then
        export \$(cat .env | grep -v '^#' | xargs)
    fi

    DB_NAME=\${MYSQL_DATABASE:-$DB_NAME}
    MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}
    DB_USER=\${MYSQL_USER:-$DB_USER}
    DB_PASSWORD=\${MYSQL_PASSWORD:-$DB_PASSWORD}

    MYSQL_CONTAINER=\$(docker ps --format "{{.Names}}" | grep -i mysql | head -1)
    if [ -z "\$MYSQL_CONTAINER" ]; then
        MYSQL_CONTAINER="kiplombe_mysql"
    fi

    docker exec \$MYSQL_CONTAINER mysqldump -u root -p"\$MYSQL_ROOT_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "\$DB_NAME" \
        --set-gtid-purged=OFF 2>/dev/null | sed '1i SET FOREIGN_KEY_CHECKS=0;' || \
    docker exec \$MYSQL_CONTAINER mysqldump -u "\$DB_USER" -p"\$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "\$DB_NAME" \
        --set-gtid-purged=OFF 2>/dev/null | sed '1i SET FOREIGN_KEY_CHECKS=0;'
REMOTE_DUMP_EOF

    if [ -f "${DUMP_FILE}.gz" ] && [ -s "${DUMP_FILE}.gz" ]; then
        DUMP_SIZE=$(du -h "${DUMP_FILE}.gz" | cut -f1)
        echo -e "\n${GREEN}✅ Database dump completed successfully!${NC}"
        echo -e "   📁 File: ${DUMP_FILE}.gz"
        echo -e "   📊 Size: $DUMP_SIZE"
        echo ""
        echo "To restore this dump:"
        echo "   gunzip < ${DUMP_FILE}.gz | docker exec -i kiplombe_mysql mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\""
    else
        echo -e "${RED}❌ ERROR: Dump file was not created or is empty${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ ERROR: Database dump failed${NC}"
    exit 1
fi
