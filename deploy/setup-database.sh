#!/bin/bash

# Database Setup Script for Kiplombe HMIS
# This script initializes the database with schema and sample data

set -e

echo "🗄️  Setting up Kiplombe HMIS Database..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_HOST=${DB_HOST:-mysql_db}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${MYSQL_DATABASE:-kiplombe_hmis}
DB_USER=${MYSQL_USER:-kiplombe_user}
DB_PASSWORD=${MYSQL_PASSWORD:-kiplombe_pass}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass}

echo "📋 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
until docker exec kiplombe_mysql mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; do
    echo "   Waiting for MySQL..."
    sleep 2
done

echo -e "${GREEN}✓ MySQL is ready${NC}"

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    echo "📄 Executing: $file"
    docker exec -i kiplombe_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$file"
    echo -e "${GREEN}✓ Completed: $file${NC}"
}

# Initialize database schema
echo "📚 Loading database schema..."
if [ -f "api/database/schema.sql" ]; then
    execute_sql_file "api/database/schema.sql"
fi

# Load additional schema files
echo "📚 Loading additional schema files..."
for schema in api/database/*_schema.sql; do
    if [ -f "$schema" ]; then
        execute_sql_file "$schema"
    fi
done

# Load ICD-10 sample data
if [ -f "api/database/sample_data/18_icd10_diagnoses_sample.sql" ]; then
    echo "📚 Loading ICD-10 diagnoses sample data..."
    execute_sql_file "api/database/sample_data/18_icd10_diagnoses_sample.sql"
fi

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "📝 You can connect to the database using:"
echo "   mysql -h localhost -P ${MYSQL_PORT:-3308} -u $DB_USER -p$DB_PASSWORD $DB_NAME"


