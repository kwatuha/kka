# Missing Database Tables Analysis

## Current Database Schema Overview

The current schema includes:
- ✅ roles, privileges, role_privileges (Authorization)
- ✅ users (User management)
- ✅ patients (Patient registration)
- ✅ appointments (Appointment scheduling)
- ✅ queue_entries (Queue management)
- ✅ service_charges (Billing - service definitions)
- ✅ invoices, invoice_items (Billing - invoicing)
- ✅ inventory_items (Inventory - basic)
- ✅ medical_records (Basic medical records)

## Missing Tables by Module

### 1. PHARMACY MODULE ❌ MISSING

**Required Tables:**
- `prescriptions` - Prescription orders from doctors
- `prescription_items` - Individual medications in prescriptions
- `medications` - Drug catalog (separate from inventory for reference)
- `dispensations` - Dispensing records
- `pharmacy_inventory` - Pharmacy-specific inventory (can extend inventory_items)

**Key Fields Needed:**
- Prescription ID, patient ID, doctor ID, prescription date, status
- Medication name, dosage, frequency, duration, instructions
- Dispensation date, quantity dispensed, dispensed by
- Drug interactions, contraindications

### 2. LABORATORY MODULE ❌ MISSING

**Required Tables:**
- `lab_test_types` - Catalog of available lab tests
- `lab_test_orders` - Test orders from doctors
- `lab_test_results` - Test results
- `lab_result_values` - Individual result parameters (e.g., WBC count, RBC count)
- `lab_samples` - Sample tracking (collection, processing)

**Key Fields Needed:**
- Test type name, category, turnaround time, cost
- Order ID, patient ID, ordered by, priority, status
- Result ID, test order ID, result date, verified by
- Parameter name, value, unit, normal range, flag (normal/abnormal)

### 3. RADIOLOGY MODULE ❌ MISSING

**Required Tables:**
- `radiology_exam_types` - Catalog of imaging types
- `radiology_exam_orders` - Imaging requests from doctors
- `radiology_exams` - Performed examinations
- `radiology_reports` - Radiology reports/interpretations
- `radiology_images` - Image file references

**Key Fields Needed:**
- Exam type name, category (X-ray, CT, MRI, Ultrasound), duration, cost
- Order ID, patient ID, body part, clinical indication, priority
- Exam ID, performed date, technician ID, image files
- Report ID, findings, impression, recommendations, reported by

### 4. INPATIENT MODULE ❌ MISSING

**Required Tables:**
- `wards` - Ward definitions
- `beds` - Bed definitions and status
- `admissions` - Patient admissions
- `discharges` - Discharge records
- `ward_transfers` - Patient transfers between wards
- `admission_diagnoses` - Admission diagnoses

**Key Fields Needed:**
- Ward name, type, capacity, location
- Bed number, ward ID, status (available/occupied/maintenance)
- Admission ID, patient ID, admission date, admission diagnosis, admitting doctor
- Discharge ID, discharge date, discharge diagnosis, discharge summary
- Transfer ID, from ward, to ward, transfer date, reason

### 5. ICU MODULE ❌ MISSING

**Required Tables:**
- `icu_admissions` - ICU-specific admissions (can extend admissions)
- `icu_beds` - ICU bed definitions
- `icu_monitoring` - Continuous monitoring data (vital signs over time)
- `icu_equipment` - Equipment tracking (ventilators, monitors, etc.)

**Key Fields Needed:**
- ICU bed ID, equipment list
- Monitoring timestamp, patient ID, vital signs (HR, BP, SpO2, temp, etc.)
- Equipment ID, type, status, assigned to patient

### 6. MATERNITY MODULE ❌ MISSING

**Required Tables:**
- `maternity_admissions` - Maternity-specific admissions
- `deliveries` - Delivery records
- `newborns` - Newborn baby records
- `antenatal_visits` - Antenatal care visits
- `postnatal_visits` - Postnatal care visits

**Key Fields Needed:**
- Gestation weeks, expected delivery date, pregnancy history
- Delivery ID, delivery type (normal/C-section), delivery date/time, complications
- Baby ID, birth weight, gender, Apgar scores, health status
- Visit date, visit type, findings, next appointment

### 7. TRIAGING MODULE ❌ MISSING

**Required Tables:**
- `triage_assessments` - Triage evaluations
- `vital_signs` - Detailed vital signs records (separate from basic medical records)

**Key Fields Needed:**
- Triage ID, patient ID, triage date/time, chief complaint
- Triage category (Red/Yellow/Green/Blue), priority level, triaged by
- Vital signs: BP, pulse, temperature, respiratory rate, SpO2, pain score, GCS
- Triage notes, assigned to doctor/department

### 8. INSURANCE MODULE ❌ MISSING

**Required Tables:**
- `insurance_providers` - Insurance company information
- `insurance_packages` - Insurance packages/plans
- `patient_insurance` - Patient insurance coverage
- `insurance_claims` - Insurance claim submissions
- `insurance_authorizations` - Pre-authorizations

**Key Fields Needed:**
- Provider name, contact info, claims address
- Package name, coverage limits, co-pay amounts
- Policy number, member ID, coverage period, beneficiary info
- Claim ID, invoice ID, claim amount, status, submission date
- Authorization number, authorized amount, validity period

### 9. PROCUREMENT MODULE ❌ MISSING

**Required Tables:**
- `vendors` - Supplier/vendor information
- `purchase_orders` - Purchase order requests
- `purchase_order_items` - Items in purchase orders
- `requisitions` - Internal requisition requests
- `receipts` - Goods received notes
- `vendor_ratings` - Vendor performance tracking

**Key Fields Needed:**
- Vendor name, contact, address, payment terms, tax ID
- PO number, vendor ID, order date, status, total amount
- Item ID, quantity, unit price, delivery date
- Requisition ID, requested by, department, status
- Receipt ID, PO ID, received date, received by

### 10. HR MODULE ❌ MISSING

**Required Tables:**
- `employees` - Employee records (separate from users, for HR management)
- `departments` - Department definitions
- `employee_leave` - Leave requests and records
- `employee_attendance` - Attendance tracking
- `employee_positions` - Job positions
- `employee_salaries` - Salary information (if needed)

**Key Fields Needed:**
- Employee ID, user ID (link to users), employee number, hire date
- Department name, description, head of department
- Leave type, start date, end date, status, approval
- Attendance date, check-in, check-out, hours worked
- Position title, department, salary scale

### 11. FINANCE MODULE ❌ PARTIALLY MISSING

**Currently Has:**
- ✅ service_charges
- ✅ invoices
- ✅ invoice_items

**Missing Tables:**
- `payments` - Payment transactions
- `payment_methods` - Payment method definitions
- `accounts` - Chart of accounts (for ledger)
- `transactions` - General ledger transactions (journal entries)
- `budgets` - Budget planning and tracking
- `assets` - Fixed asset management
- `receivables` - Accounts receivable tracking
- `payables` - Accounts payable tracking
- `cash_transactions` - Cash register transactions
- `revenue_share` - Revenue sharing allocations

**Key Fields Needed:**
- Payment ID, invoice ID, amount, payment method, payment date, reference number
- Account code, account name, account type (Asset/Liability/Equity/Income/Expense)
- Transaction ID, date, description, debit account, credit account, amount
- Budget ID, department, period, allocated amount, spent amount
- Asset ID, asset name, category, purchase date, value, depreciation

### 12. DOCTORS MODULE ❌ MISSING

**Required Tables:**
- `doctor_schedules` - Doctor availability and schedules
- `doctor_specializations` - Doctor specialties
- `doctor_availability` - Available time slots

**Key Fields Needed:**
- Schedule ID, doctor ID, day of week, start time, end time
- Specialization name, description
- Date, time slot, status (available/booked)

### 13. DEPARTMENTS MODULE ❌ MISSING

**Required Tables:**
- `departments` - Department definitions (already mentioned in HR, but needed separately)

### 14. ADDITIONAL ENHANCEMENTS NEEDED

**Medical Records Enhancements:**
- `vital_signs_log` - Detailed vital signs tracking over time
- `clinical_notes` - More structured clinical documentation
- `diagnoses` - Diagnosis catalog (ICD-10 codes)
- `procedures` - Procedure records
- `allergies` - Detailed allergy tracking
- `medication_history` - Patient medication history

**System Enhancements:**
- `notifications` - System notifications
- `audit_logs` - System audit trail
- `settings` - System configuration

**Inventory Enhancements:**
- `inventory_transactions` - Stock movements (receipts, issues, adjustments, transfers)
- `inventory_categories` - Inventory categorization
- `suppliers` - Supplier information (linked to procurement vendors)

**Billing Enhancements:**
- `payment_plans` - Payment plan agreements
- `discounts` - Discount rules and applications

## Summary

**Total Missing Modules:** ~12 major modules
**Estimated Missing Tables:** ~50-60 tables
**Critical Missing Tables:** Pharmacy, Laboratory, Radiology, Inpatient, ICU, Maternity, Triaging, Insurance, Procurement, HR, Finance (partial), Doctors

The current database schema captures only the basic structure. To fully support all the application modules, significant expansion is required.

