# Database Schema Files - Installation Guide

This directory contains the database schema files for the Kiplombe Medical Centre HMIS system, split into multiple files for easier management and progressive installation.

## Schema File Organization

The schema files are organized by module and should be executed in the following order:

### Base Schema (Required First)
- `schema.sql` - Base schema with core tables (users, patients, appointments, queue, billing basics, inventory basics, medical records basics)

### Module Schemas (Install in order)

1. **01_pharmacy_schema.sql** - Pharmacy module
   - Medications catalog
   - Prescriptions
   - Prescription items
   - Dispensations
   - Pharmacy inventory
   - Drug interactions

2. **02_laboratory_schema.sql** - Laboratory module
   - Lab test types
   - Lab test orders
   - Lab test results
   - Lab result values
   - Lab samples tracking

3. **03_radiology_schema.sql** - Radiology module
   - Radiology exam types
   - Radiology exam orders
   - Radiology exams
   - Radiology images
   - Radiology reports

4. **04_inpatient_schema.sql** - Inpatient module
   - Wards
   - Beds
   - Admissions
   - Admission diagnoses
   - Discharges
   - Ward transfers

5. **05_icu_maternity_schema.sql** - ICU and Maternity modules
   - ICU beds
   - ICU admissions
   - ICU monitoring
   - ICU equipment
   - Maternity admissions
   - Antenatal visits
   - Deliveries
   - Newborns
   - Postnatal visits

6. **06_triaging_schema.sql** - Triaging module
   - Triage assessments
   - Vital signs (detailed tracking)

7. **07_insurance_schema.sql** - Insurance module
   - Insurance providers
   - Insurance packages
   - Patient insurance
   - Insurance authorizations
   - Insurance claims

8. **08_procurement_schema.sql** - Procurement module
   - Vendors
   - Vendor ratings
   - Requisitions
   - Requisition items
   - Purchase orders
   - Purchase order items
   - Receipts (GRN)
   - Receipt items

9. **09_hr_schema.sql** - Human Resources module
   - Departments
   - Employees
   - Employee positions
   - Employee leave
   - Employee attendance

10. **10_finance_schema.sql** - Finance module additions
    - Payment methods
    - Payments
    - Chart of accounts
    - Transactions (journal entries)
    - Budgets
    - Fixed assets
    - Accounts receivable
    - Accounts payable
    - Cash transactions
    - Revenue share
    - Payment plans
    - Payment plan installments

11. **11_doctors_schema.sql** - Doctors module
    - Doctor specializations
    - Doctor specialization assignments
    - Doctor schedules
    - Doctor availability

12. **12_medical_records_enhancements.sql** - Medical records enhancements
    - Diagnoses catalog (ICD-10)
    - Patient diagnoses
    - Procedures catalog
    - Patient procedures
    - Patient allergies
    - Clinical notes

13. **13_inventory_enhancements.sql** - Inventory enhancements
    - Inventory categories
    - Inventory transactions

## Installation Instructions

### Option 1: Install All at Once

```bash
# Navigate to database directory
cd /path/to/api/database

# Run base schema first
mysql -u root -p kiplombe_hmis < schema.sql

# Run all module schemas
for file in 0*.sql; do
    mysql -u root -p kiplombe_hmis < "$file"
done
```

### Option 2: Install Progressively (Recommended for Development)

Install modules one at a time as needed:

```bash
# 1. Base schema
mysql -u root -p kiplombe_hmis < schema.sql

# 2. Install modules as needed
mysql -u root -p kiplombe_hmis < 01_pharmacy_schema.sql
mysql -u root -p kiplombe_hmis < 02_laboratory_schema.sql
# ... continue with other modules
```

### Option 3: Single Combined Script (for Production)

You can combine all files into one:

```bash
cat schema.sql 0*.sql > complete_schema.sql
mysql -u root -p kiplombe_hmis < complete_schema.sql
```

## Dependencies

Some tables have foreign key dependencies. The files are ordered to satisfy these dependencies:

- Most modules depend on `schema.sql` (base tables)
- Inpatient module (04) is required before ICU/Maternity (05)
- Departments (09) is referenced by HR and Finance modules
- Payment methods (10) is required before payments
- Insurance depends on patients and invoices (base schema)
- Procurement depends on vendors (08) and inventory (base schema)

## Notes

1. **Foreign Key Constraints**: All foreign keys use appropriate ON DELETE actions:
   - `CASCADE` - Delete related records when parent is deleted
   - `RESTRICT` - Prevent deletion if related records exist
   - `SET NULL` - Set foreign key to NULL when parent is deleted

2. **Indexes**: All tables have appropriate indexes for:
   - Primary keys
   - Foreign keys
   - Frequently queried fields (dates, status, codes, etc.)

3. **Data Types**:
   - Use `DECIMAL(15, 2)` for monetary amounts
   - Use `DATE` for dates, `DATETIME` for timestamps
   - Use appropriate VARCHAR lengths for codes and names
   - Use ENUM for fixed value sets

4. **Default Values**: Many fields have sensible defaults (e.g., status fields, timestamps)

5. **Timestamps**: Most tables have `createdAt` and `updatedAt` timestamps for auditing

## Troubleshooting

### Foreign Key Errors

If you get foreign key constraint errors, ensure:
- Base schema is installed first
- Dependencies are installed in order
- Referenced tables exist before creating foreign keys

### Table Already Exists

If a table already exists, you can:
- Drop the database and recreate: `DROP DATABASE kiplombe_hmis; CREATE DATABASE kiplombe_hmis;`
- Use `CREATE TABLE IF NOT EXISTS` (already included in all files)

### Syntax Errors

Ensure you're using MySQL 8.0 or higher. Some features may not work in older versions.

## Testing

After installation, verify the schema:

```sql
-- Check all tables
SHOW TABLES;

-- Check table structure
DESCRIBE table_name;

-- Check foreign keys
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'kiplombe_hmis'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### Telemedicine (optional module)

- `migrations/40_telemedicine_sessions_schema.sql` — `telemedicine_sessions` + `telemedicine_session_audit`
- `migrations/41_telemedicine_zoom_manual.sql` — optional; adds `zoomJoinUrl` / `zoomPassword` if upgrading an old DB

From `api/`: `npm run migrate:telemedicine` (uses `.env` `DB_*` settings).

**Docker:** with MySQL running as container `kiplombe_mysql` (see repo `docker-compose.yml`): `npm run migrate:telemedicine:docker`.

- `migrations/42_user_telemedicine_defaults.sql` — optional `user_telemedicine_settings` (per-user default Zoom link); included in `migrate:telemedicine` scripts.

## Summary

**Total Files**: 14 (1 base + 13 module files)
**Estimated Total Tables**: ~80-90 tables
**Total Modules Covered**: 15+ modules

All modules identified in the application code are now represented in the database schema.

