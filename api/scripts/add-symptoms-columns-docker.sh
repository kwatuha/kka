#!/bin/bash
# Script to add symptoms, historyOfPresentIllness, and physicalExamination columns to medical_records table
# Uses Docker exec to run SQL commands inside the MySQL container

set -e

CONTAINER_NAME="kiplombe_mysql"
DB_NAME="kiplombe_hmis"
DB_USER="kiplombe_user"
DB_PASSWORD="kiplombe_password"

echo "Checking if Docker container '$CONTAINER_NAME' is running..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Docker container '$CONTAINER_NAME' is not running"
    echo "   Please start it with: docker-compose up -d mysql_db"
    exit 1
fi

echo "✅ Container is running"
echo "Checking for existing columns..."

# Check which columns exist
EXISTING_COLS=$(docker exec $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -sN -e "
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
    AND TABLE_NAME = 'medical_records' 
    AND COLUMN_NAME IN ('symptoms', 'historyOfPresentIllness', 'physicalExamination')
" 2>/dev/null || echo "")

echo "Existing columns: $EXISTING_COLS"

# Add symptoms column if it doesn't exist
if echo "$EXISTING_COLS" | grep -q "symptoms"; then
    echo "⚠️  symptoms column already exists"
else
    echo "Adding symptoms column..."
    docker exec $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "
        ALTER TABLE medical_records
        ADD COLUMN symptoms TEXT NULL AFTER chiefComplaint;
    " 2>/dev/null
    echo "✅ Added symptoms column"
fi

# Add historyOfPresentIllness column if it doesn't exist
if echo "$EXISTING_COLS" | grep -q "historyOfPresentIllness"; then
    echo "⚠️  historyOfPresentIllness column already exists"
else
    echo "Adding historyOfPresentIllness column..."
    docker exec $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "
        ALTER TABLE medical_records
        ADD COLUMN historyOfPresentIllness TEXT NULL AFTER symptoms;
    " 2>/dev/null
    echo "✅ Added historyOfPresentIllness column"
fi

# Add physicalExamination column if it doesn't exist
if echo "$EXISTING_COLS" | grep -q "physicalExamination"; then
    echo "⚠️  physicalExamination column already exists"
else
    echo "Adding physicalExamination column..."
    docker exec $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "
        ALTER TABLE medical_records
        ADD COLUMN physicalExamination TEXT NULL AFTER historyOfPresentIllness;
    " 2>/dev/null
    echo "✅ Added physicalExamination column"
fi

echo ""
echo "✅ Migration completed successfully!"

