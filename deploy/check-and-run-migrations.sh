#!/bin/bash

# ============================================
# Check and Run Missing Migrations
# ============================================
# This script checks which migrations have been applied and runs missing ones

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database configuration
DB_NAME="${MYSQL_DATABASE:-kiplombe_hmis}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root_password}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Check and Run Missing Migrations${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Check if MySQL container exists
MYSQL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i mysql | head -1)
if [ -z "$MYSQL_CONTAINER" ]; then
    MYSQL_CONTAINER="kiplombe_mysql"
fi

if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
    echo -e "${RED}❌ ERROR: MySQL container '$MYSQL_CONTAINER' is not running${NC}"
    exit 1
fi

echo "📋 Checking migration status..."
echo ""

# Function to check if a table exists
check_table_exists() {
    local table_name=$1
    docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e \
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$table_name';" 2>/dev/null | grep -q "1"
}

# Function to check if a column exists
check_column_exists() {
    local table_name=$1
    local column_name=$2
    docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e \
        "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$table_name' AND COLUMN_NAME = '$column_name';" 2>/dev/null | grep -q "1"
}

# Function to check if a view exists
check_view_exists() {
    local view_name=$1
    docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e \
        "SELECT COUNT(*) FROM information_schema.VIEWS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$view_name';" 2>/dev/null | grep -q "1"
}

# Function to run a migration file
run_migration() {
    local migration_file=$1
    local description=$2

    echo -e "${YELLOW}   📄 Running: $(basename $migration_file)${NC}"
    echo -e "      ${description}"

    if docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$migration_file" 2>&1 | grep -v "Warning"; then
        echo -e "      ${GREEN}✅ Success${NC}"
        return 0
    else
        echo -e "      ${YELLOW}⚠️  Migration may have already been applied or has warnings (continuing...)${NC}"
        return 0
    fi
}

# Track which migrations need to be run
MIGRATIONS_TO_RUN=()

# Check migration 20: Add patient type (already applied based on earlier check)
if check_column_exists "patients" "patientType"; then
    echo -e "${GREEN}✓${NC} Migration 20: patientType column exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 20: patientType column missing"
    MIGRATIONS_TO_RUN+=("api/database/20_add_patient_type_migration.sql:Add patientType column")
fi

# Check migration 21: Add insurance number (already applied)
if check_column_exists "patients" "insuranceNumber"; then
    echo -e "${GREEN}✓${NC} Migration 21: insuranceNumber column exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 21: insuranceNumber column missing"
    MIGRATIONS_TO_RUN+=("api/database/21_add_insurance_number_migration.sql:Add insuranceNumber column")
fi

# Check migration: Add symptoms/history to medical_records (already applied)
if check_column_exists "medical_records" "symptoms"; then
    echo -e "${GREEN}✓${NC} Migration: symptoms column in medical_records exists"
else
    echo -e "${YELLOW}⚠${NC} Migration: symptoms column missing"
    MIGRATIONS_TO_RUN+=("api/database/20_add_symptoms_history_to_medical_records.sql:Add symptoms/history columns")
fi

# Check migration: Add outcome to medical_records (already applied)
if check_column_exists "medical_records" "outcome"; then
    echo -e "${GREEN}✓${NC} Migration: outcome column in medical_records exists"
else
    echo -e "${YELLOW}⚠${NC} Migration: outcome column missing"
    MIGRATIONS_TO_RUN+=("api/database/add_outcome_to_medical_records.sql:Add outcome column")
fi

# Check migration: Add doctorId to queue_entries (already applied)
if check_column_exists "queue_entries" "doctorId"; then
    echo -e "${GREEN}✓${NC} Migration: doctorId column in queue_entries exists"
else
    echo -e "${YELLOW}⚠${NC} Migration: doctorId column missing"
    MIGRATIONS_TO_RUN+=("api/database/add_doctor_id_to_queue_entries.sql:Add doctorId to queue_entries")
fi

# Check migration 27: Ambulance schema (already applied)
if check_table_exists "ambulances"; then
    echo -e "${GREEN}✓${NC} Migration 27: ambulance tables exist"
else
    echo -e "${YELLOW}⚠${NC} Migration 27: ambulance tables missing"
    MIGRATIONS_TO_RUN+=("api/database/27_ambulance_schema.sql:Create ambulance tables")
fi

# Check migration 29: Bill waiver schema (already applied)
if check_table_exists "bill_waivers"; then
    echo -e "${GREEN}✓${NC} Migration 29: bill_waivers table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 29: bill_waivers table missing"
    MIGRATIONS_TO_RUN+=("api/database/29_bill_waiver_schema.sql:Create bill waiver tables")
fi

# Check migration 31: Add waived status to invoices
if docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e \
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'status';" 2>/dev/null | grep -q "waived"; then
    echo -e "${GREEN}✓${NC} Migration 31: waived status in invoices exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 31: waived status missing"
    MIGRATIONS_TO_RUN+=("api/database/31_add_waived_status_to_invoices.sql:Add waived status to invoices")
fi

# Check migration 20: Patient documents schema
if check_table_exists "patient_documents"; then
    echo -e "${GREEN}✓${NC} Migration 20: patient_documents table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 20: patient_documents table missing"
    MIGRATIONS_TO_RUN+=("api/database/20_patient_documents_schema.sql:Create patient_documents table")
fi

# Check migration 18: Family history schema (table is named patient_family_history)
if check_table_exists "patient_family_history"; then
    echo -e "${GREEN}✓${NC} Migration 18: patient_family_history table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 18: patient_family_history table missing"
    MIGRATIONS_TO_RUN+=("api/database/18_family_history_schema.sql:Create patient_family_history table")
fi

# Check migration 21: Drug stores schema
if check_table_exists "drug_stores"; then
    echo -e "${GREEN}✓${NC} Migration 21: drug_stores table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 21: drug_stores table missing"
    MIGRATIONS_TO_RUN+=("api/database/21_drug_stores_schema.sql:Create drug_stores table")
fi

# Check migration 23: Triage sequence table
if check_table_exists "triage_sequence"; then
    echo -e "${GREEN}✓${NC} Migration 23: triage_sequence table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 23: triage_sequence table missing"
    MIGRATIONS_TO_RUN+=("api/database/23_triage_sequence_table.sql:Create triage_sequence table")
fi

# Check migration 21: Hospital chart of accounts (inserts into accounts table)
CHART_ACCOUNT_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e \
    "SELECT COUNT(*) FROM accounts WHERE accountCode LIKE '1%' OR accountCode LIKE '2%' OR accountCode LIKE '3%' OR accountCode LIKE '4%' OR accountCode LIKE '5%';" 2>/dev/null)
if [ "$CHART_ACCOUNT_COUNT" -gt 50 ]; then
    echo -e "${GREEN}✓${NC} Migration 21: Hospital chart of accounts populated ($CHART_ACCOUNT_COUNT accounts)"
else
    echo -e "${YELLOW}⚠${NC} Migration 21: Hospital chart of accounts may be incomplete ($CHART_ACCOUNT_COUNT accounts found)"
    MIGRATIONS_TO_RUN+=("api/database/21_hospital_chart_of_accounts.sql:Populate hospital chart of accounts")
fi

# Check migration 22: Claim requirements schema
if check_table_exists "claim_requirements"; then
    echo -e "${GREEN}✓${NC} Migration 22: claim_requirements table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 22: claim_requirements table missing"
    MIGRATIONS_TO_RUN+=("api/database/22_claim_requirements_schema.sql:Create claim_requirements table")
fi

# Check migration 20: Fix drug inventory summary view
if check_view_exists "vw_drug_inventory_aggregated"; then
    echo -e "${GREEN}✓${NC} Migration 20: vw_drug_inventory_aggregated view exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 20: vw_drug_inventory_aggregated view missing"
    MIGRATIONS_TO_RUN+=("api/database/20_fix_drug_inventory_summary_view.sql:Create/fix drug inventory summary view")
fi

# Check migration 21: Enhance service charges for procedures
if check_column_exists "service_charges" "chargeType" && check_column_exists "procedures" "chargeId"; then
    echo -e "${GREEN}✓${NC} Migration 21: service_charges enhanced with chargeType and procedures linked"
else
    echo -e "${YELLOW}⚠${NC} Migration 21: service_charges enhancements missing"
    MIGRATIONS_TO_RUN+=("api/database/21_enhance_service_charges_for_procedures.sql:Enhance service_charges for procedures")
fi

# Check migration 24: Create procedure service charges (populates service_charges for procedures)
PROCEDURE_CHARGE_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" -sN -e \
    "SELECT COUNT(*) FROM service_charges WHERE chargeType = 'Procedure';" 2>/dev/null)
if [ "$PROCEDURE_CHARGE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Migration 24: Procedure service charges created ($PROCEDURE_CHARGE_COUNT found)"
else
    echo -e "${YELLOW}⚠${NC} Migration 24: Procedure service charges may be missing"
    MIGRATIONS_TO_RUN+=("api/database/24_create_procedure_service_charges.sql:Create service charges for procedures")
fi

# Check migration 22: Update drug inventory locations
if check_column_exists "drug_inventory" "location"; then
    echo -e "${GREEN}✓${NC} Migration 22: location column in drug_inventory exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 22: location column missing"
    MIGRATIONS_TO_RUN+=("api/database/22_update_drug_inventory_locations.sql:Add location to drug_inventory")
fi

# Check migration 19: Drug inventory redesign
if check_table_exists "drug_inventory_transactions"; then
    echo -e "${GREEN}✓${NC} Migration 19: drug_inventory_transactions table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 19: drug_inventory_transactions table missing"
    MIGRATIONS_TO_RUN+=("api/database/19_drug_inventory_redesign_migration.sql:Drug inventory redesign")
fi

# Check migration 33: Inpatient management enhancements
if check_table_exists "ward_transfers"; then
    echo -e "${GREEN}✓${NC} Migration 33: ward_transfers table exists"
else
    echo -e "${YELLOW}⚠${NC} Migration 33: ward_transfers table missing"
    MIGRATIONS_TO_RUN+=("api/database/33_inpatient_management_enhancements.sql:Inpatient management enhancements")
fi

echo ""
echo -e "${BLUE}============================================${NC}"

if [ ${#MIGRATIONS_TO_RUN[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All checked migrations have been applied!${NC}"
    echo ""
else
    echo -e "${YELLOW}📋 Found ${#MIGRATIONS_TO_RUN[@]} migration(s) that may need to be run:${NC}"
    echo ""

    for migration_info in "${MIGRATIONS_TO_RUN[@]}"; do
        IFS=':' read -r migration_file description <<< "$migration_info"
        if [ -f "$migration_file" ]; then
            echo -e "   • ${description}"
            echo -e "     File: $migration_file"
        fi
    done

    echo ""
    read -p "Do you want to run these migrations? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${YELLOW}📥 Running migrations...${NC}"
        echo ""

        for migration_info in "${MIGRATIONS_TO_RUN[@]}"; do
            IFS=':' read -r migration_file description <<< "$migration_info"
            if [ -f "$migration_file" ]; then
                run_migration "$migration_file" "$description"
                echo ""
            else
                echo -e "${RED}   ❌ File not found: $migration_file${NC}"
            fi
        done

        echo -e "${GREEN}✅ Migration check and run completed!${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping migrations${NC}"
    fi
fi

echo ""
