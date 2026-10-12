-- Analytics Sample Data
-- This script creates comprehensive historical data for analytics
-- It generates data for the past 12 months

-- ============================================
-- Helper: Generate dates for the past N months
-- ============================================

-- Get existing patients (we'll use these for historical data)
SET @patient_count = (SELECT COUNT(*) FROM patients WHERE voided = 0);
SET @min_patient_id = (SELECT MIN(patientId) FROM patients WHERE voided = 0);
SET @max_patient_id = (SELECT MAX(patientId) FROM patients WHERE voided = 0);

-- Get existing doctors/users
SET @doctor_count = (SELECT COUNT(*) FROM users WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'doctor'));
SET @min_doctor_id = (SELECT MIN(userId) FROM users WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'doctor'));
SET @max_doctor_id = (SELECT MAX(userId) FROM users WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'doctor'));

-- Get departments
SET @cons_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Consultation' LIMIT 1);
SET @lab_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Laboratory' LIMIT 1);
SET @phar_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Pharmacy' LIMIT 1);
SET @rad_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Radiology' LIMIT 1);
SET @nur_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Nursing' LIMIT 1);

-- ============================================
-- 1. Historical Patient Registrations (Past 12 months)
-- ============================================
-- Note: This assumes patients table already has some data
-- We'll update existing patient creation dates to distribute them over the past 12 months

-- Update patient creation dates to be distributed over the past 12 months
UPDATE patients 
SET createdAt = DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY)
WHERE voided = 0 
  AND createdAt > DATE_SUB(CURDATE(), INTERVAL 1 DAY);

-- ============================================
-- 2. Historical Appointments (Past 12 months)
-- ============================================
-- Generate appointments for the past 12 months

INSERT INTO appointments (
    patientId, doctorId, appointmentDate, appointmentTime, 
    status, notes, createdAt
)
SELECT 
    p.patientId,
    u.userId,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as appointmentDate,
    CONCAT(LPAD(8 + FLOOR(RAND() * 9), 2, '0'), ':', LPAD(FLOOR(RAND() * 60), 2, '0'), ':00') as appointmentTime,
    CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'scheduled'
        WHEN 1 THEN 'completed'
        WHEN 2 THEN 'cancelled'
        ELSE 'no_show'
    END as status,
    'Sample appointment data for analytics' as notes,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as createdAt
FROM patients p
CROSS JOIN (
    SELECT userId FROM users 
    WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'doctor')
    LIMIT 5
) u
WHERE p.voided = 0
  AND (SELECT COUNT(*) FROM appointments WHERE patientId = p.patientId) < 10
LIMIT 200;

-- ============================================
-- 3. Historical Inpatient Admissions (Past 12 months)
-- ============================================
-- Generate inpatient admissions (only if table exists)

-- Check if inpatient_admissions table exists, if not skip this section
-- For now, we'll use admissions table if it exists
INSERT IGNORE INTO admissions (
    admissionNumber, patientId, bedId, admissionDate,
    admittingDoctorId, admissionReason, status, dischargeDate, createdAt
)
SELECT 
    CONCAT('ADM-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(admissionNumber, -5) AS UNSIGNED)), 0) FROM admissions) + ROW_NUMBER() OVER(), 5, '0')) as admissionNumber,
    p.patientId,
    COALESCE((SELECT bedId FROM beds LIMIT 1), 1) as bedId,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as admissionDate,
    u.userId as admittingDoctorId,
    'Sample admission for analytics' as admissionReason,
    CASE 
        WHEN RAND() > 0.3 THEN 'discharged'
        ELSE 'admitted'
    END as status,
    CASE 
        WHEN RAND() > 0.3 THEN DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 300) DAY)
        ELSE NULL
    END as dischargeDate,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as createdAt
FROM patients p
CROSS JOIN (
    SELECT userId FROM users 
    WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'doctor')
    LIMIT 3
) u
WHERE p.voided = 0
  AND (SELECT COUNT(*) FROM admissions WHERE patientId = p.patientId) = 0
LIMIT 50;

-- ============================================
-- 4. Historical Invoices/Revenue (Past 12 months)
-- ============================================
-- Generate invoices with varying amounts and dates

INSERT INTO invoices (
    invoiceNumber, patientId, invoiceDate, dueDate,
    totalAmount, paidAmount, balance, status, paymentMethod, createdAt
)
SELECT 
    CONCAT('INV-', YEAR(CURDATE()), '-', LPAD((SELECT COUNT(*) FROM invoices) + ROW_NUMBER() OVER(), 6, '0')) as invoiceNumber,
    p.patientId,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as invoiceDate,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 330) DAY) as dueDate,
    ROUND(5000 + (RAND() * 50000), 2) as totalAmount,
    CASE 
        WHEN RAND() > 0.4 THEN ROUND(5000 + (RAND() * 50000), 2)  -- More paid invoices
        WHEN RAND() > 0.7 THEN ROUND((5000 + (RAND() * 50000)) * 0.5, 2)  -- Partial payment
        ELSE 0
    END as paidAmount,
    CASE 
        WHEN RAND() > 0.4 THEN 0  -- Fully paid
        WHEN RAND() > 0.7 THEN ROUND((5000 + (RAND() * 50000)) * 0.5, 2)  -- Partial balance
        ELSE ROUND(5000 + (RAND() * 50000), 2)  -- Unpaid
    END as balance,
    CASE FLOOR(RAND() * 10)
        WHEN 0 THEN 'paid'
        WHEN 1 THEN 'paid'
        WHEN 2 THEN 'paid'
        WHEN 3 THEN 'paid'
        WHEN 4 THEN 'partial'
        WHEN 5 THEN 'partial'
        WHEN 6 THEN 'pending'
        WHEN 7 THEN 'pending'
        WHEN 8 THEN 'cancelled'
        ELSE 'draft'
    END as status,
    CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'cash'
        WHEN 1 THEN 'mpesa'
        WHEN 2 THEN 'bank_transfer'
        ELSE 'insurance'
    END as paymentMethod,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as createdAt
FROM patients p
WHERE p.voided = 0
  AND (SELECT COUNT(*) FROM invoices WHERE patientId = p.patientId) < 5
LIMIT 300;

-- Add invoice items for the invoices
INSERT INTO invoice_items (
    invoiceId, chargeId, description, quantity, unitPrice, totalPrice
)
SELECT 
    i.invoiceId,
    (SELECT chargeId FROM service_charges WHERE status = 'Active' LIMIT 1) as chargeId,
    CONCAT('Service charge for ', i.invoiceNumber) as description,
    1 + FLOOR(RAND() * 3) as quantity,
    ROUND(1000 + (RAND() * 5000), 2) as unitPrice,
    ROUND((1 + FLOOR(RAND() * 3)) * (1000 + (RAND() * 5000)), 2) as totalPrice
FROM invoices i
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_items WHERE invoiceId = i.invoiceId
)
LIMIT 300;

-- ============================================
-- 5. Historical Queue Entries (Past 12 months)
-- ============================================
-- Generate queue entries including emergency cases

INSERT INTO queue_entries (
    ticketNumber, patientId, servicePoint, priority, status, createdAt
)
SELECT 
    CONCAT('T', YEAR(CURDATE()), LPAD((SELECT COUNT(*) FROM queue_entries) + ROW_NUMBER() OVER(), 6, '0')) as ticketNumber,
    p.patientId,
    CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'Consultation'
        WHEN 1 THEN 'Laboratory'
        WHEN 2 THEN 'Pharmacy'
        WHEN 3 THEN 'Radiology'
        ELSE 'Registration'
    END as servicePoint,
    CASE FLOOR(RAND() * 10)
        WHEN 0 THEN 'emergency'
        WHEN 1 THEN 'emergency'
        WHEN 2 THEN 'urgent'
        WHEN 3 THEN 'urgent'
        ELSE 'normal'
    END as priority,
    CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'completed'
        WHEN 1 THEN 'serving'
        WHEN 2 THEN 'waiting'
        ELSE 'cancelled'
    END as status,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as createdAt
FROM patients p
WHERE p.voided = 0
  AND (SELECT COUNT(*) FROM queue_entries WHERE patientId = p.patientId) < 3
LIMIT 400;

-- ============================================
-- 6. Historical Transactions/Expenses (Past 12 months)
-- ============================================
-- Generate expense transactions if transactions table exists

-- First, check if accounts table exists and create expense accounts if needed
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, isActive) VALUES
('EXP-SAL', 'Salaries and Wages', 'Expense', TRUE),
('EXP-SUP', 'Supplies', 'Expense', TRUE),
('EXP-EQUIP', 'Equipment', 'Expense', TRUE),
('EXP-MAINT', 'Maintenance', 'Expense', TRUE),
('EXP-UTIL', 'Utilities', 'Expense', TRUE),
('REV-SERV', 'Service Revenue', 'Revenue', TRUE);

SET @expense_account = (SELECT accountId FROM accounts WHERE accountType = 'Expense' LIMIT 1);
SET @revenue_account = (SELECT accountId FROM accounts WHERE accountType = 'Revenue' LIMIT 1);
SET @cash_account = (SELECT accountId FROM accounts WHERE accountType = 'Asset' AND accountName LIKE '%Cash%' LIMIT 1);

-- If cash account doesn't exist, create it
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, isActive) VALUES
('ASSET-CASH', 'Cash Account', 'Asset', TRUE);

SET @cash_account = (SELECT accountId FROM accounts WHERE accountType = 'Asset' LIMIT 1);

-- Generate expense transactions
INSERT INTO transactions (
    transactionNumber, transactionDate, description, referenceNumber, referenceType,
    debitAccountId, creditAccountId, amount, postedBy, notes
)
SELECT 
    CONCAT('TXN-', YEAR(CURDATE()), '-', LPAD((SELECT COUNT(*) FROM transactions) + ROW_NUMBER() OVER(), 6, '0')) as transactionNumber,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as transactionDate,
    CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'Monthly salaries payment'
        WHEN 1 THEN 'Medical supplies purchase'
        WHEN 2 THEN 'Equipment maintenance'
        WHEN 3 THEN 'Utility bills payment'
        ELSE 'General expenses'
    END as description,
    CONCAT('REF-', FLOOR(RAND() * 10000)) as referenceNumber,
    'expense' as referenceType,
    @expense_account as debitAccountId,
    @cash_account as creditAccountId,
    ROUND(10000 + (RAND() * 100000), 2) as amount,
    (SELECT userId FROM users WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'admin') LIMIT 1) as postedBy,
    'Sample expense transaction for analytics' as notes
FROM (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) months
CROSS JOIN (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) items
LIMIT 120;

-- ============================================
-- Verification Queries
-- ============================================
-- Uncomment to verify data:
-- SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count 
-- FROM patients 
-- WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
-- GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
-- ORDER BY month;

-- SELECT DATE_FORMAT(invoiceDate, '%Y-%m') as month, 
--        SUM(CASE WHEN status = 'paid' THEN totalAmount ELSE 0 END) as revenue
-- FROM invoices
-- WHERE invoiceDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
-- GROUP BY DATE_FORMAT(invoiceDate, '%Y-%m')
-- ORDER BY month;

