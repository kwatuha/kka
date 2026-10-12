-- ============================================
-- INVOICES AND PAYMENTS SAMPLE DATA
-- ============================================
-- This script creates sample data for invoices and payments

-- Get patient IDs (assuming patients exist)
SET @patient1 = (SELECT patientId FROM patients LIMIT 1 OFFSET 0);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);
SET @patient4 = (SELECT patientId FROM patients LIMIT 1 OFFSET 3);
SET @patient5 = (SELECT patientId FROM patients LIMIT 1 OFFSET 4);
SET @patient6 = (SELECT patientId FROM patients LIMIT 1 OFFSET 5);
SET @patient7 = (SELECT patientId FROM patients LIMIT 1 OFFSET 6);
SET @patient8 = (SELECT patientId FROM patients LIMIT 1 OFFSET 7);

-- Get service charge IDs (assuming service charges exist)
SET @charge1 = (SELECT chargeId FROM service_charges LIMIT 1 OFFSET 0);
SET @charge2 = (SELECT chargeId FROM service_charges LIMIT 1 OFFSET 1);
SET @charge3 = (SELECT chargeId FROM service_charges LIMIT 1 OFFSET 2);

-- Create sample invoices
INSERT IGNORE INTO invoices (
    patientId, invoiceNumber, invoiceDate, dueDate,
    totalAmount, paidAmount, balance, status, paymentMethod, createdAt
)
SELECT
    p.patientId,
    CONCAT('INV-', YEAR(CURDATE()), '-', LPAD(ROW_NUMBER() OVER (ORDER BY p.patientId), 5, '0')) as invoiceNumber,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY) as invoiceDate,
    DATE_ADD(DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY), INTERVAL 30 DAY) as dueDate,
    ROUND(5000 + (RAND() * 150000), 2) as totalAmount,
    CASE
        WHEN RAND() < 0.4 THEN ROUND(5000 + (RAND() * 150000), 2) -- 40% fully paid
        WHEN RAND() < 0.6 THEN ROUND(2000 + (RAND() * 50000), 2) -- 20% partial
        ELSE 0
    END as paidAmount,
    CASE
        WHEN RAND() < 0.4 THEN 0
        WHEN RAND() < 0.6 THEN ROUND(3000 + (RAND() * 100000), 2)
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
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY) as createdAt
FROM patients p
WHERE p.patientId IN (@patient1, @patient2, @patient3, @patient4, @patient5, @patient6, @patient7, @patient8)
LIMIT 15;

-- Get invoice IDs for items
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

-- Insert sample invoice items
INSERT IGNORE INTO invoice_items (
    invoiceId, chargeId, description, quantity, unitPrice, totalPrice
)
SELECT
    i.invoiceId,
    CASE 
        WHEN RAND() < 0.7 THEN @charge1
        WHEN RAND() < 0.9 THEN @charge2
        ELSE @charge3
    END as chargeId,
    CASE FLOOR(RAND() * 8)
        WHEN 0 THEN 'General Consultation'
        WHEN 1 THEN 'Laboratory Tests'
        WHEN 2 THEN 'X-Ray Examination'
        WHEN 3 THEN 'Ultrasound Scan'
        WHEN 4 THEN 'Medication'
        WHEN 5 THEN 'Emergency Care'
        WHEN 6 THEN 'CT Scan'
        ELSE 'Physical Therapy'
    END as description,
    FLOOR(1 + RAND() * 3) as quantity,
    ROUND(1000 + (RAND() * 20000), 2) as unitPrice,
    ROUND((1 + RAND() * 3) * (1000 + (RAND() * 20000)), 2) as totalPrice
FROM invoices i
WHERE i.invoiceId IN (@invoice1, @invoice2, @invoice3, @invoice4, @invoice5, @invoice6, @invoice7, @invoice8, @invoice9, @invoice10)
AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii WHERE ii.invoiceId = i.invoiceId
)
LIMIT 30;

-- Verify the data
SELECT 
    status,
    COUNT(*) as count,
    SUM(totalAmount) as total_amount,
    SUM(paidAmount) as paid_amount,
    SUM(balance) as outstanding_amount
FROM invoices
WHERE invoiceId IN (@invoice1, @invoice2, @invoice3, @invoice4, @invoice5, @invoice6, @invoice7, @invoice8, @invoice9, @invoice10)
GROUP BY status
ORDER BY status;

