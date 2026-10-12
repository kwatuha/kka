#!/bin/bash
# Script to load ICD-10 diagnoses sample data into the database
# Supports both Docker and direct MySQL execution
# Usage:
#   Docker: ./load_icd10_diagnoses.sh docker [container_name] [database_name] [username] [password]
#   Direct: ./load_icd10_diagnoses.sh [database_name] [username] [password]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/18_icd10_diagnoses_sample.sql"

# Check if using Docker
if [ "$1" = "docker" ]; then
    CONTAINER_NAME=${2:-"kiplombe_mysql"}
    DB_NAME=${3:-"kiplombe_hmis"}
    DB_USER=${4:-"kiplombe_user"}
    DB_PASS=${5:-"kiplombe_password"}

    echo "🐳 Loading ICD-10 diagnoses sample data using Docker..."
    echo "   Container: $CONTAINER_NAME"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"

    # Check if container is running
    if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo "❌ Error: Docker container '$CONTAINER_NAME' is not running"
        echo "   Start it with: docker start $CONTAINER_NAME"
        exit 1
    fi

    # Copy SQL file into container and execute
    docker cp "$SQL_FILE" "${CONTAINER_NAME}:/tmp/icd10_diagnoses.sql"

    if [ -z "$DB_PASS" ]; then
        docker exec -i "$CONTAINER_NAME" mysql -u "$DB_USER" "$DB_NAME" < "$SQL_FILE"
    else
        docker exec -i "$CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
    fi

    # Clean up
    docker exec "$CONTAINER_NAME" rm -f /tmp/icd10_diagnoses.sql

    if [ $? -eq 0 ]; then
        echo "✅ ICD-10 diagnoses data loaded successfully via Docker!"
        echo "   You can now search for diagnoses like 'Malaria', 'Diabetes', 'Hypertension', etc."
    else
        echo "❌ Error loading ICD-10 diagnoses data via Docker"
        exit 1
    fi
else
    # Direct MySQL execution
    DB_NAME=${1:-"transelgon"}
    DB_USER=${2:-"root"}
    DB_PASS=${3:-""}

    echo "📊 Loading ICD-10 diagnoses sample data directly into database: $DB_NAME"

    if [ -z "$DB_PASS" ]; then
        mysql -u "$DB_USER" "$DB_NAME" < "$SQL_FILE"
    else
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
    fi

    if [ $? -eq 0 ]; then
        echo "✅ ICD-10 diagnoses data loaded successfully!"
        echo "   You can now search for diagnoses like 'Malaria', 'Diabetes', 'Hypertension', etc."
    else
        echo "❌ Error loading ICD-10 diagnoses data"
        exit 1
    fi
fi
