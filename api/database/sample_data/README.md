# Sample Data Scripts

This directory contains SQL scripts to insert sample data into the database. The scripts are organized by module and should be run in order to maintain referential integrity.

## Execution Order

Run scripts in this order to avoid foreign key constraint errors:

1. **00_base_data.sql** - Core data (users, roles, departments, service charges)
2. **01_patients.sql** - Sample patients
3. **02_employees.sql** - Employee data (depends on users, departments)
4. **03_doctors.sql** - Doctor specializations and schedules (depends on employees)
5. **04_inventory.sql** - Inventory items and categories
6. **05_pharmacy.sql** - Medications and pharmacy inventory
7. **06_laboratory.sql** - Lab test types
8. **07_radiology.sql** - Radiology exam types
9. **08_inpatient.sql** - Wards and beds
10. **09_icu_maternity.sql** - ICU beds and equipment
11. **10_insurance.sql** - Insurance providers and packages
12. **11_procurement.sql** - Vendors
13. **12_finance.sql** - Payment methods, accounts, budgets
mobile14. **_payment_logs.sql** - Mobile payment transaction logs (M-Pesa, Airtel Money, T-Kash, Equitel)
15. **13_transactions.sql** - Sample transactions (appointments, prescriptions, etc.)

## Usage

Run each script individually to avoid timeouts:

```bash
# From the project root
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/sample_data/00_base_data.sql
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/sample_data/01_patients.sql
# ... continue with other files
```

Or use the helper script:

```bash
./api/database/sample_data/run_all.sh
```

## Notes

- All scripts use `INSERT IGNORE` or check for existing data to allow re-running
- Foreign key relationships are maintained
- Sample data is realistic but anonymized
- Timestamps are set to recent dates for testing

