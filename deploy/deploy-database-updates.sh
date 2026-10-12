#!/bin/bash

# ============================================
# Deploy Database Updates to Remote Server
# ============================================
# This script deploys database updates including ICD-10 data and migrations

set -e

# Load deployment configuration
if [ -f "$(dirname "$0")/deploy-config.sh" ]; then
    . "$(dirname "$0")/deploy-config.sh"
else
    echo "Error: deploy-config.sh not found!"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}Deploy Database Updates to Remote${NC}"
echo -e "${BLUE}============================================${NC}\n"

echo "📋 Configuration:"
echo "   Server: $SSH_USER@$SERVER_IP"
echo "   App Directory: $APP_DIR"
echo ""

# Step 1: Copy ICD-10 diagnoses script to remote
echo -e "${YELLOW}📤 Step 1: Copying ICD-10 diagnoses script...${NC}"
if [ -f "api/database/sample_data/18_icd10_diagnoses_sample.sql" ]; then
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
        "api/database/sample_data/18_icd10_diagnoses_sample.sql" \
        "$SSH_USER@$SERVER_IP:/tmp/18_icd10_diagnoses_sample.sql"
    echo -e "${GREEN}✅ ICD-10 script copied${NC}"
else
    echo -e "${RED}❌ ICD-10 script not found!${NC}"
    exit 1
fi

# Step 2: Copy migration check script
echo -e "\n${YELLOW}📤 Step 2: Copying migration check script...${NC}"
if [ -f "deploy/check-and-run-migrations.sh" ]; then
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
        "deploy/check-and-run-migrations.sh" \
        "$SSH_USER@$SERVER_IP:/tmp/check-and-run-migrations.sh"
    echo -e "${GREEN}✅ Migration check script copied${NC}"
else
    echo -e "${YELLOW}⚠️  Migration check script not found (continuing...)${NC}"
fi

# Step 3: Run database updates on remote
echo -e "\n${YELLOW}📥 Step 3: Running database updates on remote...${NC}"
eval "$SSH_CMD" << 'REMOTE_DB_UPDATE_EOF'
    set -e
    cd ~/kiplombe-hmis

    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    DB_NAME=${MYSQL_DATABASE:-kiplombe_hmis}
    MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass}

    echo "   Checking MySQL container..."
    MYSQL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i mysql | head -1)
    if [ -z "$MYSQL_CONTAINER" ]; then
        MYSQL_CONTAINER="kiplombe_mysql"
    fi

    if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
        echo "   ❌ ERROR: MySQL container '$MYSQL_CONTAINER' is not running"
        exit 1
    fi

    echo "   ✓ MySQL container found: $MYSQL_CONTAINER"

    # Check current diagnosis count
    CURRENT_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM diagnoses;" 2>/dev/null || echo "0")
    echo "   Current diagnoses count: $CURRENT_COUNT"

    # Load ICD-10 diagnoses
    echo ""
    echo "   📄 Loading ICD-10 diagnoses..."
    if docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < /tmp/18_icd10_diagnoses_sample.sql 2>&1 | grep -v "Warning"; then
        NEW_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM diagnoses;" 2>/dev/null)
        ADDED=$((NEW_COUNT - CURRENT_COUNT))
        echo "   ✅ ICD-10 diagnoses loaded"
        echo "   New diagnoses count: $NEW_COUNT (added $ADDED)"
    else
        echo "   ⚠️  ICD-10 script may have warnings (checking results...)"
        NEW_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM diagnoses;" 2>/dev/null)
        ADDED=$((NEW_COUNT - CURRENT_COUNT))
        if [ "$ADDED" -gt 0 ]; then
            echo "   ✅ Diagnoses were added ($ADDED new)"
        else
            echo "   ℹ️  No new diagnoses added (may already exist)"
        fi
    fi

    # Check for Malaria diagnoses
    MALARIA_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM diagnoses WHERE diagnosisName LIKE '%Malaria%' OR icd10Code LIKE '%B5%';" 2>/dev/null || echo "0")
    echo "   Malaria diagnoses: $MALARIA_COUNT"

    # Run migration check script if available
    if [ -f /tmp/check-and-run-migrations.sh ]; then
        echo ""
        echo "   📋 Checking for missing migrations..."
        chmod +x /tmp/check-and-run-migrations.sh
        # Run non-interactively (skip migrations)
        echo "n" | /tmp/check-and-run-migrations.sh || true
    fi

    # Clean up temp files
    rm -f /tmp/18_icd10_diagnoses_sample.sql /tmp/check-and-run-migrations.sh

    echo ""
    echo "   ✅ Database updates completed"
REMOTE_DB_UPDATE_EOF

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Database updates deployed successfully!${NC}"
else
    echo -e "\n${RED}❌ Database update failed!${NC}"
    exit 1
fi

echo ""
