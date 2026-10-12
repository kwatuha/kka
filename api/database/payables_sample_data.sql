-- ============================================
-- PAYABLES SAMPLE DATA
-- ============================================
-- This script creates sample data for accounts payable (vendor invoices)

-- First, ensure we have some vendors
-- If vendors don't exist, create sample vendors
INSERT IGNORE INTO vendors (vendorCode, vendorName, contactPerson, phone, email, address, city, country, category, status, paymentTerms)
VALUES
    ('VND-001', 'Medical Supplies Ltd', 'John Smith', '+254 712 345 678', 'john@medicalsupplies.co.ke', '123 Medical Street', 'Nairobi', 'Kenya', 'Medical Supplies', 'active', 'Net 30'),
    ('VND-002', 'Pharma Distributors', 'Sarah Johnson', '+254 723 456 789', 'sarah@pharmadist.co.ke', '456 Pharmacy Avenue', 'Nairobi', 'Kenya', 'Pharmaceuticals', 'active', 'Net 30'),
    ('VND-003', 'Lab Equipment Co.', 'Michael Brown', '+254 734 567 890', 'michael@labequipment.co.ke', '789 Lab Road', 'Nairobi', 'Kenya', 'Laboratory Equipment', 'active', 'Net 45'),
    ('VND-004', 'Office Solutions', 'Emily Davis', '+254 745 678 901', 'emily@officesolutions.co.ke', '321 Office Park', 'Nairobi', 'Kenya', 'Office Supplies', 'active', 'Net 30'),
    ('VND-005', 'Cleaning Services Inc.', 'David Wilson', '+254 756 789 012', 'david@cleaningservices.co.ke', '654 Clean Street', 'Nairobi', 'Kenya', 'Cleaning Services', 'active', 'Net 15'),
    ('VND-006', 'IT Solutions Ltd', 'James Anderson', '+254 767 890 123', 'james@itsolutions.co.ke', '987 Tech Boulevard', 'Nairobi', 'Kenya', 'IT Equipment', 'active', 'Net 30'),
    ('VND-007', 'Maintenance Services', 'Linda Martinez', '+254 778 901 234', 'linda@maintenance.co.ke', '147 Service Road', 'Nairobi', 'Kenya', 'Maintenance', 'active', 'Net 30'),
    ('VND-008', 'Food Services Co.', 'Robert Taylor', '+254 789 012 345', 'robert@foodservices.co.ke', '258 Food Court', 'Nairobi', 'Kenya', 'Food Services', 'active', 'Net 15');

-- Get vendor IDs for use in payables
SET @vendor1 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-001' LIMIT 1);
SET @vendor2 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-002' LIMIT 1);
SET @vendor3 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-003' LIMIT 1);
SET @vendor4 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-004' LIMIT 1);
SET @vendor5 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-005' LIMIT 1);
SET @vendor6 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-006' LIMIT 1);
SET @vendor7 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-007' LIMIT 1);
SET @vendor8 = (SELECT vendorId FROM vendors WHERE vendorCode = 'VND-008' LIMIT 1);

-- Insert sample payable invoices
-- Status: pending, partial, paid, overdue, cancelled
INSERT IGNORE INTO payables (
    vendorId, invoiceNumber, invoiceDate, dueDate, totalAmount, paidAmount, outstandingAmount, status, notes, createdAt
)
VALUES
    -- Pending invoices (recent, not yet due)
    (@vendor1, 'INV-2024-001', DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 250000.00, 0.00, 250000.00, 'pending', 'Medical supplies for Q1 2024', DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
    (@vendor2, 'INV-2024-002', DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 27 DAY), 180000.00, 0.00, 180000.00, 'pending', 'Pharmaceutical supplies', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    (@vendor3, 'INV-2024-003', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 35 DAY), 350000.00, 0.00, 350000.00, 'pending', 'Lab equipment maintenance', DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
    
    -- Partial payments
    (@vendor4, 'INV-2024-004', DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 75000.00, 30000.00, 45000.00, 'partial', 'Office supplies - partial payment made', DATE_SUB(CURDATE(), INTERVAL 20 DAY)),
    (@vendor5, 'INV-2024-005', DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 0 DAY), 120000.00, 60000.00, 60000.00, 'partial', 'Cleaning services - 50% paid', DATE_SUB(CURDATE(), INTERVAL 15 DAY)),
    
    -- Paid invoices
    (@vendor1, 'INV-2024-006', DATE_SUB(CURDATE(), INTERVAL 45 DAY), DATE_SUB(CURDATE(), INTERVAL 15 DAY), 150000.00, 150000.00, 0.00, 'paid', 'Medical supplies - fully paid', DATE_SUB(CURDATE(), INTERVAL 45 DAY)),
    (@vendor2, 'INV-2024-007', DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 95000.00, 95000.00, 0.00, 'paid', 'Pharmaceuticals - paid on time', DATE_SUB(CURDATE(), INTERVAL 40 DAY)),
    (@vendor6, 'INV-2024-008', DATE_SUB(CURDATE(), INTERVAL 35 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 220000.00, 220000.00, 0.00, 'paid', 'IT equipment - fully paid', DATE_SUB(CURDATE(), INTERVAL 35 DAY)),
    
    -- Overdue invoices
    (@vendor4, 'INV-2024-009', DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_SUB(CURDATE(), INTERVAL 20 DAY), 85000.00, 0.00, 85000.00, 'overdue', 'Office supplies - overdue payment', DATE_SUB(CURDATE(), INTERVAL 50 DAY)),
    (@vendor7, 'INV-2024-010', DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_SUB(CURDATE(), INTERVAL 30 DAY), 140000.00, 0.00, 140000.00, 'overdue', 'Maintenance services - overdue', DATE_SUB(CURDATE(), INTERVAL 60 DAY)),
    (@vendor5, 'INV-2024-011', DATE_SUB(CURDATE(), INTERVAL 55 DAY), DATE_SUB(CURDATE(), INTERVAL 25 DAY), 65000.00, 0.00, 65000.00, 'overdue', 'Cleaning services - overdue', DATE_SUB(CURDATE(), INTERVAL 55 DAY)),
    
    -- More pending invoices
    (@vendor8, 'INV-2024-012', DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 13 DAY), 95000.00, 0.00, 95000.00, 'pending', 'Food services for cafeteria', DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
    (@vendor3, 'INV-2024-013', DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 38 DAY), 280000.00, 0.00, 280000.00, 'pending', 'New lab equipment', DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
    (@vendor1, 'INV-2024-014', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 29 DAY), 165000.00, 0.00, 165000.00, 'pending', 'Additional medical supplies', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    
    -- More paid invoices (this month)
    (@vendor2, 'INV-2024-015', DATE_SUB(CURDATE(), INTERVAL 25 DAY), DATE_SUB(CURDATE(), INTERVAL 0 DAY), 110000.00, 110000.00, 0.00, 'paid', 'Pharmaceuticals - paid this month', DATE_SUB(CURDATE(), INTERVAL 25 DAY)),
    (@vendor6, 'INV-2024-016', DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 0 DAY), 185000.00, 185000.00, 0.00, 'paid', 'IT services - paid this month', DATE_SUB(CURDATE(), INTERVAL 20 DAY)),
    
    -- More partial payments
    (@vendor7, 'INV-2024-017', DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), 200000.00, 100000.00, 100000.00, 'partial', 'Maintenance contract - 50% paid', DATE_SUB(CURDATE(), INTERVAL 18 DAY)),
    (@vendor8, 'INV-2024-018', DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 75000.00, 25000.00, 50000.00, 'partial', 'Food services - partial payment', DATE_SUB(CURDATE(), INTERVAL 12 DAY));

-- Update lastPaymentDate for paid and partial invoices
UPDATE payables 
SET lastPaymentDate = DATE_SUB(CURDATE(), INTERVAL 5 DAY)
WHERE status = 'paid' AND invoiceNumber IN ('INV-2024-006', 'INV-2024-007', 'INV-2024-008', 'INV-2024-015', 'INV-2024-016');

UPDATE payables 
SET lastPaymentDate = DATE_SUB(CURDATE(), INTERVAL 10 DAY)
WHERE status = 'partial' AND invoiceNumber IN ('INV-2024-004', 'INV-2024-005', 'INV-2024-017', 'INV-2024-018');

-- Verify the data
SELECT 
    status,
    COUNT(*) as count,
    SUM(totalAmount) as total_amount,
    SUM(paidAmount) as paid_amount,
    SUM(outstandingAmount) as outstanding_amount
FROM payables
GROUP BY status
ORDER BY status;

