#!/bin/bash

# Script to run all sample data SQL files in order
# This helps avoid timeouts by running files individually

set -e

DB_CONTAINER="kiplombe_mysql"
DB_USER="root"
DB_PASSWORD="root_password"
DB_NAME="kiplombe_hmis"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Loading Sample Data into Database"
echo "=========================================="
echo ""

# Array of SQL files in order
FILES=(
    "00_base_data.sql"
    "01_patients.sql"
    "02_employees.sql"
    "03_doctors.sql"
    "04_inventory.sql"
    "05_pharmacy.sql"
    "06_laboratory.sql"
    "07_radiology.sql"
    "08_inpatient.sql"
    "09_icu_maternity.sql"
    "10_insurance.sql"
    "11_procurement.sql"
    "12_finance.sql"
    "13_triaging.sql"
    "14_appointments.sql"
    "15_queue.sql"
    "16_medical_records.sql"
)

# Run each file
for file in "${FILES[@]}"; do
    filepath="${SCRIPT_DIR}/${file}"
    if [ -f "$filepath" ]; then
        echo "Running $file..."
        docker exec -i "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$filepath"
        if [ $? -eq 0 ]; then
            echo "✅ $file completed successfully"
        else
            echo "❌ Error running $file"
            exit 1
        fi
        echo ""
    else
        echo "⚠️  File not found: $filepath"
    fi
done

echo "=========================================="
echo "Sample data loading completed!"
echo "=========================================="

