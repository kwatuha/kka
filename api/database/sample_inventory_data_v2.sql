-- Sample Inventory Data for Analytics - Version 2
-- Using direct itemIds after items are created

-- First, let's get the itemIds we need (we'll use a stored procedure approach)
-- Add transactions for items with codes INV-000100 to INV-000119

-- October 2025 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000100', itemId, 'receipt', '2025-10-05', 500, 'purchase', 1, 'Bulk order' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000101', itemId, 'receipt', '2025-10-08', 1000, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000102', itemId, 'receipt', '2025-10-10', 800, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000103', itemId, 'issue', '2025-10-15', -50, 'use', 1, 'Surgical department' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000104', itemId, 'issue', '2025-10-18', -200, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000105', itemId, 'receipt', '2025-10-20', 100, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000106', itemId, 'issue', '2025-10-22', -150, 'use', 1, 'Vaccination clinic' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000107', itemId, 'receipt', '2025-10-25', 600, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1;

INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000108', itemId, 'adjustment', '2025-10-28', -10, 'correction', 1, 'Inventory count correction' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1;

-- November 2025 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000109', itemId, 'receipt', '2025-11-02', 300, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000110', itemId, 'receipt', '2025-11-05', 200, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1
UNION ALL SELECT 'TXN-000111', itemId, 'issue', '2025-11-08', -350, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000112', itemId, 'issue', '2025-11-10', -200, 'use', 1, 'Emergency department' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000113', itemId, 'issue', '2025-11-12', -100, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000114', itemId, 'issue', '2025-11-15', -25, 'use', 1, 'COVID ward' FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000115', itemId, 'receipt', '2025-11-18', 10, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000106' LIMIT 1
UNION ALL SELECT 'TXN-000116', itemId, 'receipt', '2025-11-20', 15, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000107' LIMIT 1
UNION ALL SELECT 'TXN-000117', itemId, 'issue', '2025-11-22', -75, 'use', 1, 'Surgical department' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000118', itemId, 'receipt', '2025-11-25', 50, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1
UNION ALL SELECT 'TXN-000119', itemId, 'adjustment', '2025-11-30', 5, 'correction', 1, 'Found extra stock' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1;

-- December 2025 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000120', itemId, 'receipt', '2025-12-01', 400, 'purchase', 1, 'Year-end stock up' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000121', itemId, 'receipt', '2025-12-03', 800, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000122', itemId, 'receipt', '2025-12-05', 600, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000123', itemId, 'receipt', '2025-12-08', 500, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000124', itemId, 'receipt', '2025-12-10', 75, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000125', itemId, 'receipt', '2025-12-12', 150, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1
UNION ALL SELECT 'TXN-000126', itemId, 'issue', '2025-12-15', -100, 'use', 1, 'Surgical department' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000127', itemId, 'issue', '2025-12-18', -400, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000128', itemId, 'issue', '2025-12-20', -250, 'use', 1, 'Vaccination clinic' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000129', itemId, 'issue', '2025-12-22', -150, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000130', itemId, 'issue', '2025-12-24', -30, 'use', 1, 'General use' FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1
UNION ALL SELECT 'TXN-000131', itemId, 'receipt', '2025-12-28', 40, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1
UNION ALL SELECT 'TXN-000132', itemId, 'wastage', '2025-12-05', -20, 'damage', 1, 'Damaged during transport' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000133', itemId, 'expiry', '2025-12-10', -15, 'expiry', 1, 'Expired items removed' FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1;

-- January 2026 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000134', itemId, 'receipt', '2026-01-02', 350, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000135', itemId, 'receipt', '2026-01-04', 700, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000136', itemId, 'receipt', '2026-01-06', 500, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000137', itemId, 'receipt', '2026-01-08', 400, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000138', itemId, 'receipt', '2026-01-10', 50, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000139', itemId, 'receipt', '2026-01-12', 100, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1
UNION ALL SELECT 'TXN-000140', itemId, 'issue', '2026-01-15', -80, 'use', 1, 'Surgical department' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000141', itemId, 'issue', '2026-01-18', -300, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000142', itemId, 'issue', '2026-01-20', -180, 'use', 1, 'Emergency department' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000143', itemId, 'issue', '2026-01-22', -120, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000144', itemId, 'issue', '2026-01-24', -15, 'use', 1, 'COVID ward' FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000145', itemId, 'issue', '2026-01-26', -25, 'use', 1, 'General use' FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1
UNION ALL SELECT 'TXN-000146', itemId, 'issue', '2026-01-28', -20, 'use', 1, 'Cleaning staff' FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1
UNION ALL SELECT 'TXN-000147', itemId, 'receipt', '2026-01-30', 600, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1
UNION ALL SELECT 'TXN-000148', itemId, 'return', '2026-01-05', 10, 'return', 1, 'Returned from department' FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1;

-- February 2026 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000149', itemId, 'receipt', '2026-02-03', 450, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000150', itemId, 'receipt', '2026-02-05', 900, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000151', itemId, 'receipt', '2026-02-07', 700, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000152', itemId, 'receipt', '2026-02-09', 550, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000153', itemId, 'receipt', '2026-02-11', 60, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000154', itemId, 'receipt', '2026-02-13', 120, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1
UNION ALL SELECT 'TXN-000155', itemId, 'issue', '2026-02-16', -90, 'use', 1, 'Surgical department' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000156', itemId, 'issue', '2026-02-18', -450, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000157', itemId, 'issue', '2026-02-20', -220, 'use', 1, 'Vaccination clinic' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000158', itemId, 'issue', '2026-02-22', -180, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000159', itemId, 'issue', '2026-02-24', -20, 'use', 1, 'COVID ward' FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000160', itemId, 'issue', '2026-02-26', -35, 'use', 1, 'General use' FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1
UNION ALL SELECT 'TXN-000161', itemId, 'issue', '2026-02-28', -25, 'use', 1, 'Cleaning staff' FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1
UNION ALL SELECT 'TXN-000162', itemId, 'issue', '2026-02-28', -150, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1
UNION ALL SELECT 'TXN-000163', itemId, 'wastage', '2026-02-10', -30, 'damage', 1, 'Water damage' FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1;

-- March 2026 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes)
SELECT 'TXN-000164', itemId, 'receipt', '2026-03-02', 500, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000165', itemId, 'receipt', '2026-03-04', 1000, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000166', itemId, 'receipt', '2026-03-06', 800, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000167', itemId, 'receipt', '2026-03-08', 600, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000168', itemId, 'receipt', '2026-03-10', 70, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000169', itemId, 'receipt', '2026-03-12', 140, 'purchase', 1, NULL FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1
UNION ALL SELECT 'TXN-000170', itemId, 'issue', '2026-03-15', -100, 'use', 1, 'Surgical department' FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1
UNION ALL SELECT 'TXN-000171', itemId, 'issue', '2026-03-18', -500, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1
UNION ALL SELECT 'TXN-000172', itemId, 'issue', '2026-03-20', -250, 'use', 1, 'Emergency department' FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1
UNION ALL SELECT 'TXN-000173', itemId, 'issue', '2026-03-22', -200, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1
UNION ALL SELECT 'TXN-000174', itemId, 'issue', '2026-03-24', -25, 'use', 1, 'COVID ward' FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1
UNION ALL SELECT 'TXN-000175', itemId, 'issue', '2026-03-26', -40, 'use', 1, 'General use' FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1
UNION ALL SELECT 'TXN-000176', itemId, 'issue', '2026-03-28', -30, 'use', 1, 'Cleaning staff' FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1
UNION ALL SELECT 'TXN-000177', itemId, 'issue', '2026-03-30', -200, 'use', 1, 'Pharmacy dispensed' FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1
UNION ALL SELECT 'TXN-000178', itemId, 'expiry', '2026-03-15', -5, 'expiry', 1, 'Expired items removed' FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1
UNION ALL SELECT 'TXN-000179', itemId, 'adjustment', '2026-03-20', -8, 'correction', 1, 'Inventory count correction' FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1;

-- Update inventory item quantities based on all transactions
UPDATE inventory_items i
SET quantity = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM inventory_transactions t
    WHERE t.itemId = i.itemId
)
WHERE EXISTS (
    SELECT 1 FROM inventory_transactions t WHERE t.itemId = i.itemId
);

