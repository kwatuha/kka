-- ============================================
-- RECEIVABLES SAMPLE DATA
-- ============================================
-- This script creates sample data for accounts receivable (patient invoices)

-- First, ensure we have some patients and invoices
-- Get patient IDs (assuming patients exist)
SET @patient1 = (SELECT patientId FROM patients LIMIT 1 OFFSET 0);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);
SET @patient4 = (SELECT patientId FROM patients LIMIT 1 OFFSET 3);
SET @patient5 = (SELECT patientId FROM patients LIMIT 1 OFFSET 4);
SET @patient6 = (SELECT patientId FROM patients LIMIT 1 OFFSET 5);
SET @patient7 = (SELECT patientId FROM patients LIMIT 1 OFFSET 6);
SET @patient8 = (SELECT patientId FROM patients LIMIT 1 OFFSET 7);
SET @patient9 = (SELECT patientId FROM patients LIMIT 1 OFFSET 8);
SET @patient10 = (SELECT patientId FROM patients LIMIT 1 OFFSET 9);

-- Create invoices first if they don't exist
INSERT IGNORE INTO invoices (
    patientId, invoiceNumber, invoiceDate, dueDate,
    totalAmount, paidAmount, balance, status, paymentMethod, createdAt
)
SELECT
    p.patientId,
    CONCAT('INV-', YEAR(CURDATE()), '-', LPAD(FLOOR(RAND() * 100000), 5, '0')),
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 60) DAY) as invoiceDate,
    DATE_ADD(DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 60) DAY), INTERVAL 30 DAY) as dueDate,
    ROUND(5000 + (RAND() * 150000), 2) as totalAmount,
    CASE
        WHEN RAND() < 0.3 THEN ROUND(5000 + (RAND() * 150000), 2) -- 30% paid
        WHEN RAND() < 0.5 THEN ROUND(2000 + (RAND() * 50000), 2) -- 20% partial
        ELSE 0
    END as paidAmount,
    CASE
        WHEN RAND() < 0.3 THEN 0
        WHEN RAND() < 0.5 THEN ROUND(3000 + (RAND() * 100000), 2)
        ELSE ROUND(5000 + (RAND() * 150000), 2)
    END as balance,
    CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'paid'
        WHEN 1 THEN 'paid'
        WHEN 2 THEN 'partial'
        WHEN 3 THEN 'pending'
        ELSE 'pending'
    END as status,
    CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'cash'
        WHEN 1 THEN 'mpesa'
        WHEN 2 THEN 'bank_transfer'
        ELSE 'insurance'
    END as paymentMethod,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 60) DAY) as createdAt
FROM patients p
WHERE p.patientId IN (@patient1, @patient2, @patient3, @patient4, @patient5, @patient6, @patient7, @patient8, @patient9, @patient10)
LIMIT 20;

-- Get invoice IDs for receivables
SET @invoice1 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 0);
SET @invoice2 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 1);
SET @invoice3 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 2);
SET @invoice4 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 3);
SET @invoice5 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 4);
SET @invoice6 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 5);
SET @invoice7 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 6);
SET @invoice8 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 7);
SET @invoice9 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 8);
SET @invoice10 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 9);
SET @invoice11 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 10);
SET @invoice12 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 11);
SET @invoice13 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 12);
SET @invoice14 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 13);
SET @invoice15 = (SELECT invoiceId FROM invoices ORDER BY invoiceId DESC LIMIT 1 OFFSET 14);

-- Insert sample receivable invoices
-- Status: current, overdue, paid, written_off
INSERT IGNORE INTO receivables (
    patientId, invoiceId, totalAmount, paidAmount, outstandingAmount, dueDate, status, notes, createdAt
)
SELECT
    i.patientId,
    i.invoiceId,
    i.totalAmount,
    i.paidAmount,
    i.balance as outstandingAmount,
    i.dueDate,
    CASE
        WHEN i.balance <= 0 THEN 'paid'
        WHEN i.dueDate < CURDATE() THEN 'overdue'
        ELSE 'current'
    END as status,
    CONCAT('Invoice for ', p.firstName, ' ', p.lastName) as notes,
    i.createdAt
FROM invoices i
LEFT JOIN patients p ON i.patientId = p.patientId
WHERE i.invoiceId IN (@invoice1, @invoice2, @invoice3, @invoice4, @invoice5, @invoice6, @invoice7, @invoice8, @invoice9, @invoice10, @invoice11, @invoice12, @invoice13, @invoice14, @invoice15)
AND NOT EXISTS (
    SELECT 1 FROM receivables r WHERE r.invoiceId = i.invoiceId
)
LIMIT 15;

-- Update lastPaymentDate for paid receivables
UPDATE receivables 
SET lastPaymentDate = DATE_SUB(CURDATE(), INTERVAL 5 DAY)
WHERE status = 'paid' AND lastPaymentDate IS NULL;

-- Verify the data
SELECT 
    status,
    COUNT(*) as count,
    SUM(totalAmount) as total_amount,
    SUM(paidAmount) as paid_amount,
    SUM(outstandingAmount) as outstanding_amount
FROM receivables
GROUP BY status
ORDER BY status;

