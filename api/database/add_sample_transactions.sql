-- Add sample transactions for analytics
-- First, get the itemIds we created

-- Let's use a Python-like approach but in SQL - we'll insert transactions for items that exist
-- We'll create transactions for items with IDs 84-103 (the new items we just added)

-- October 2025
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000200', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'receipt', '2025-10-05', 500, 'purchase', 1, 'Bulk order'),
('TXN-000201', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'receipt', '2025-10-08', 1000, 'purchase', 1, NULL),
('TXN-000202', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'receipt', '2025-10-10', 800, 'purchase', 1, NULL),
('TXN-000203', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'issue', '2025-10-15', -50, 'use', 1, 'Surgical department'),
('TXN-000204', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'issue', '2025-10-18', -200, 'use', 1, 'Pharmacy dispensed'),
('TXN-000205', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'receipt', '2025-10-20', 100, 'purchase', 1, NULL),
('TXN-000206', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'issue', '2025-10-22', -150, 'use', 1, 'Vaccination clinic'),
('TXN-000207', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'receipt', '2025-10-25', 600, 'purchase', 1, NULL),
('TXN-000208', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'adjustment', '2025-10-28', -10, 'correction', 1, 'Inventory count correction');

-- November 2025
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000209', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'receipt', '2025-11-02', 300, 'purchase', 1, NULL),
('TXN-000210', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1), 'receipt', '2025-11-05', 200, 'purchase', 1, NULL),
('TXN-000211', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'issue', '2025-11-08', -350, 'use', 1, 'Pharmacy dispensed'),
('TXN-000212', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'issue', '2025-11-10', -200, 'use', 1, 'Emergency department'),
('TXN-000213', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'issue', '2025-11-12', -100, 'use', 1, 'Pharmacy dispensed'),
('TXN-000214', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'issue', '2025-11-15', -25, 'use', 1, 'COVID ward'),
('TXN-000215', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000106' LIMIT 1), 'receipt', '2025-11-18', 10, 'purchase', 1, NULL),
('TXN-000216', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000107' LIMIT 1), 'receipt', '2025-11-20', 15, 'purchase', 1, NULL),
('TXN-000217', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'issue', '2025-11-22', -75, 'use', 1, 'Surgical department'),
('TXN-000218', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1), 'receipt', '2025-11-25', 50, 'purchase', 1, NULL),
('TXN-000219', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'adjustment', '2025-11-30', 5, 'correction', 1, 'Found extra stock');

-- December 2025
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000220', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'receipt', '2025-12-01', 400, 'purchase', 1, 'Year-end stock up'),
('TXN-000221', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'receipt', '2025-12-03', 800, 'purchase', 1, NULL),
('TXN-000222', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'receipt', '2025-12-05', 600, 'purchase', 1, NULL),
('TXN-000223', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'receipt', '2025-12-08', 500, 'purchase', 1, NULL),
('TXN-000224', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'receipt', '2025-12-10', 75, 'purchase', 1, NULL),
('TXN-000225', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1), 'receipt', '2025-12-12', 150, 'purchase', 1, NULL),
('TXN-000226', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'issue', '2025-12-15', -100, 'use', 1, 'Surgical department'),
('TXN-000227', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'issue', '2025-12-18', -400, 'use', 1, 'Pharmacy dispensed'),
('TXN-000228', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'issue', '2025-12-20', -250, 'use', 1, 'Vaccination clinic'),
('TXN-000229', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'issue', '2025-12-22', -150, 'use', 1, 'Pharmacy dispensed'),
('TXN-000230', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1), 'issue', '2025-12-24', -30, 'use', 1, 'General use'),
('TXN-000231', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1), 'receipt', '2025-12-28', 40, 'purchase', 1, NULL),
('TXN-000232', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'wastage', '2025-12-05', -20, 'damage', 1, 'Damaged during transport'),
('TXN-000233', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'expiry', '2025-12-10', -15, 'expiry', 1, 'Expired items removed');

-- January 2026
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000234', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'receipt', '2026-01-02', 350, 'purchase', 1, NULL),
('TXN-000235', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'receipt', '2026-01-04', 700, 'purchase', 1, NULL),
('TXN-000236', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'receipt', '2026-01-06', 500, 'purchase', 1, NULL),
('TXN-000237', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'receipt', '2026-01-08', 400, 'purchase', 1, NULL),
('TXN-000238', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'receipt', '2026-01-10', 50, 'purchase', 1, NULL),
('TXN-000239', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1), 'receipt', '2026-01-12', 100, 'purchase', 1, NULL),
('TXN-000240', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'issue', '2026-01-15', -80, 'use', 1, 'Surgical department'),
('TXN-000241', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'issue', '2026-01-18', -300, 'use', 1, 'Pharmacy dispensed'),
('TXN-000242', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'issue', '2026-01-20', -180, 'use', 1, 'Emergency department'),
('TXN-000243', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'issue', '2026-01-22', -120, 'use', 1, 'Pharmacy dispensed'),
('TXN-000244', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'issue', '2026-01-24', -15, 'use', 1, 'COVID ward'),
('TXN-000245', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1), 'issue', '2026-01-26', -25, 'use', 1, 'General use'),
('TXN-000246', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1), 'issue', '2026-01-28', -20, 'use', 1, 'Cleaning staff'),
('TXN-000247', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1), 'receipt', '2026-01-30', 600, 'purchase', 1, NULL),
('TXN-000248', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'return', '2026-01-05', 10, 'return', 1, 'Returned from department');

-- February 2026
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000249', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'receipt', '2026-02-03', 450, 'purchase', 1, NULL),
('TXN-000250', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'receipt', '2026-02-05', 900, 'purchase', 1, NULL),
('TXN-000251', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'receipt', '2026-02-07', 700, 'purchase', 1, NULL),
('TXN-000252', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'receipt', '2026-02-09', 550, 'purchase', 1, NULL),
('TXN-000253', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'receipt', '2026-02-11', 60, 'purchase', 1, NULL),
('TXN-000254', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1), 'receipt', '2026-02-13', 120, 'purchase', 1, NULL),
('TXN-000255', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'issue', '2026-02-16', -90, 'use', 1, 'Surgical department'),
('TXN-000256', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'issue', '2026-02-18', -450, 'use', 1, 'Pharmacy dispensed'),
('TXN-000257', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'issue', '2026-02-20', -220, 'use', 1, 'Vaccination clinic'),
('TXN-000258', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'issue', '2026-02-22', -180, 'use', 1, 'Pharmacy dispensed'),
('TXN-000259', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'issue', '2026-02-24', -20, 'use', 1, 'COVID ward'),
('TXN-000260', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1), 'issue', '2026-02-26', -35, 'use', 1, 'General use'),
('TXN-000261', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1), 'issue', '2026-02-28', -25, 'use', 1, 'Cleaning staff'),
('TXN-000262', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1), 'issue', '2026-02-28', -150, 'use', 1, 'Pharmacy dispensed'),
('TXN-000263', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1), 'wastage', '2026-02-10', -30, 'damage', 1, 'Water damage');

-- March 2026
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000264', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'receipt', '2026-03-02', 500, 'purchase', 1, NULL),
('TXN-000265', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'receipt', '2026-03-04', 1000, 'purchase', 1, NULL),
('TXN-000266', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'receipt', '2026-03-06', 800, 'purchase', 1, NULL),
('TXN-000267', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'receipt', '2026-03-08', 600, 'purchase', 1, NULL),
('TXN-000268', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'receipt', '2026-03-10', 70, 'purchase', 1, NULL),
('TXN-000269', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1), 'receipt', '2026-03-12', 140, 'purchase', 1, NULL),
('TXN-000270', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1), 'issue', '2026-03-15', -100, 'use', 1, 'Surgical department'),
('TXN-000271', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1), 'issue', '2026-03-18', -500, 'use', 1, 'Pharmacy dispensed'),
('TXN-000272', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1), 'issue', '2026-03-20', -250, 'use', 1, 'Emergency department'),
('TXN-000273', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1), 'issue', '2026-03-22', -200, 'use', 1, 'Pharmacy dispensed'),
('TXN-000274', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1), 'issue', '2026-03-24', -25, 'use', 1, 'COVID ward'),
('TXN-000275', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1), 'issue', '2026-03-26', -40, 'use', 1, 'General use'),
('TXN-000276', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1), 'issue', '2026-03-28', -30, 'use', 1, 'Cleaning staff'),
('TXN-000277', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1), 'issue', '2026-03-30', -200, 'use', 1, 'Pharmacy dispensed'),
('TXN-000278', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1), 'expiry', '2026-03-15', -5, 'expiry', 1, 'Expired items removed'),
('TXN-000279', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1), 'adjustment', '2026-03-20', -8, 'correction', 1, 'Inventory count correction');

-- Add transactions for other items
INSERT IGNORE INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000280', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000111' LIMIT 1), 'receipt', '2025-10-12', 400, 'purchase', 1, NULL),
('TXN-000281', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000112' LIMIT 1), 'receipt', '2025-10-15', 200, 'purchase', 1, NULL),
('TXN-000282', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000111' LIMIT 1), 'issue', '2025-11-20', -150, 'use', 1, 'Emergency department'),
('TXN-000283', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000112' LIMIT 1), 'issue', '2025-12-10', -80, 'use', 1, 'General use'),
('TXN-000284', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000113' LIMIT 1), 'receipt', '2025-11-25', 15, 'purchase', 1, NULL),
('TXN-000285', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000113' LIMIT 1), 'issue', '2026-01-15', -5, 'use', 1, 'Outpatient clinic'),
('TXN-000286', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000114' LIMIT 1), 'receipt', '2025-12-05', 300, 'purchase', 1, NULL),
('TXN-000287', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000114' LIMIT 1), 'issue', '2026-02-10', -100, 'use', 1, 'Laboratory'),
('TXN-000288', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000115' LIMIT 1), 'receipt', '2026-01-10', 250, 'purchase', 1, NULL),
('TXN-000289', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000115' LIMIT 1), 'issue', '2026-03-15', -120, 'use', 1, 'General use'),
('TXN-000290', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000116' LIMIT 1), 'receipt', '2025-12-20', 30, 'purchase', 1, NULL),
('TXN-000291', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000116' LIMIT 1), 'issue', '2026-02-25', -10, 'use', 1, 'Emergency department'),
('TXN-000292', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000117' LIMIT 1), 'receipt', '2026-01-20', 200, 'purchase', 1, NULL),
('TXN-000293', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000117' LIMIT 1), 'issue', '2026-03-10', -80, 'use', 1, 'Inpatient ward'),
('TXN-000294', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000118' LIMIT 1), 'receipt', '2025-11-10', 800, 'purchase', 1, NULL),
('TXN-000295', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000118' LIMIT 1), 'issue', '2026-01-25', -300, 'use', 1, 'Pharmacy dispensed'),
('TXN-000296', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000119' LIMIT 1), 'receipt', '2025-12-15', 600, 'purchase', 1, NULL),
('TXN-000297', (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000119' LIMIT 1), 'issue', '2026-02-20', -250, 'use', 1, 'Pharmacy dispensed');

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

