-- Sample Inventory Data for Analytics
-- This script adds realistic sample data for inventory analytics

-- Add more inventory items (using higher itemCodes to avoid conflicts)
INSERT IGNORE INTO inventory_items (itemCode, name, category, unit, quantity, reorderLevel, unitPrice, supplier, expiryDate, location, description, status, createdBy) VALUES
('INV-000100', 'Surgical Gloves (Medium)', 'Medical Supplies', 'Box of 100', 1250, 500, 8.50, 'MediSupply Ltd', '2025-06-15', 'Main Storage A1', 'Latex-free surgical gloves, medium size', 'Active', 1),
('INV-000101', 'Paracetamol 500mg', 'Pharmaceuticals', 'Tablet', 3500, 1000, 2.75, 'PharmaCorp', '2024-11-30', 'Pharmacy Storage B2', 'Pain relief medication', 'Active', 1),
('INV-000102', 'Disposable Syringes 5ml', 'Medical Supplies', 'Box of 100', 3200, 1000, 1.25, 'MediSupply Ltd', '2025-08-22', 'Main Storage A2', 'Sterile disposable syringes', 'Active', 1),
('INV-000103', 'Amoxicillin 250mg', 'Pharmaceuticals', 'Capsule', 1800, 500, 5.50, 'PharmaCorp', '2024-09-18', 'Pharmacy Storage B1', 'Antibiotic medication', 'Active', 1),
('INV-000104', 'N95 Respirator Masks', 'Personal Protective Equipment', 'Box of 50', 450, 200, 45.00, 'SafetyGear Inc', '2026-12-31', 'PPE Storage C1', 'N95 filtering facepiece respirators', 'Active', 1),
('INV-000105', 'Surgical Masks', 'Personal Protective Equipment', 'Box of 100', 800, 300, 12.00, 'SafetyGear Inc', '2026-10-15', 'PPE Storage C1', '3-ply surgical face masks', 'Active', 1),
('INV-000106', 'Blood Pressure Monitor', 'Equipment', 'Unit', 25, 10, 150.00, 'MedEquip Solutions', NULL, 'Equipment Storage D1', 'Digital blood pressure monitor', 'Active', 1),
('INV-000107', 'Stethoscope', 'Equipment', 'Unit', 45, 15, 85.00, 'MedEquip Solutions', NULL, 'Equipment Storage D1', 'Dual-head stethoscope', 'Active', 1),
('INV-000108', 'Hand Sanitizer 500ml', 'Cleaning Supplies', 'Bottle', 200, 50, 8.00, 'CleanPro Ltd', '2025-03-20', 'Cleaning Storage E1', 'Alcohol-based hand sanitizer', 'Active', 1),
('INV-000109', 'Disinfectant Wipes', 'Cleaning Supplies', 'Pack of 100', 150, 40, 15.00, 'CleanPro Ltd', '2025-05-10', 'Cleaning Storage E1', 'Antibacterial surface wipes', 'Active', 1),
('INV-000110', 'Ibuprofen 400mg', 'Pharmaceuticals', 'Tablet', 2200, 800, 3.25, 'PharmaCorp', '2024-12-15', 'Pharmacy Storage B2', 'Anti-inflammatory medication', 'Active', 1),
('INV-000111', 'Gauze Pads 10cm x 10cm', 'Medical Supplies', 'Box of 100', 1800, 600, 4.50, 'MediSupply Ltd', '2026-08-30', 'Main Storage A1', 'Sterile gauze pads', 'Active', 1),
('INV-000112', 'Medical Tape', 'Medical Supplies', 'Roll', 500, 150, 2.00, 'MediSupply Ltd', '2026-11-25', 'Main Storage A1', 'Hypoallergenic medical tape', 'Active', 1),
('INV-000113', 'Thermometer Digital', 'Equipment', 'Unit', 30, 10, 25.00, 'MedEquip Solutions', NULL, 'Equipment Storage D1', 'Digital oral/rectal thermometer', 'Active', 1),
('INV-000114', 'Cotton Swabs', 'Medical Supplies', 'Box of 500', 1200, 400, 3.50, 'MediSupply Ltd', '2026-09-15', 'Main Storage A1', 'Sterile cotton swabs', 'Active', 1),
('INV-000115', 'Alcohol Swabs', 'Medical Supplies', 'Box of 200', 900, 300, 4.00, 'MediSupply Ltd', '2026-10-20', 'Main Storage A1', 'Pre-saturated alcohol swabs', 'Active', 1),
('INV-000116', 'Oxygen Mask', 'Medical Supplies', 'Unit', 80, 25, 12.50, 'MedEquip Solutions', '2027-01-10', 'Main Storage A1', 'Disposable oxygen mask', 'Active', 1),
('INV-000117', 'IV Catheter 18G', 'Medical Supplies', 'Box of 50', 600, 200, 18.00, 'MediSupply Ltd', '2026-11-30', 'Main Storage A1', 'Intravenous catheter', 'Active', 1),
('INV-000118', 'Aspirin 100mg', 'Pharmaceuticals', 'Tablet', 2800, 1000, 1.50, 'PharmaCorp', '2025-08-25', 'Pharmacy Storage B2', 'Cardiovascular medication', 'Active', 1),
('INV-000119', 'Metformin 500mg', 'Pharmaceuticals', 'Tablet', 1900, 600, 2.25, 'PharmaCorp', '2025-07-15', 'Pharmacy Storage B2', 'Diabetes medication', 'Active', 1);

-- Get the itemIds we just created (or existing ones)
SET @gloves_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000100' LIMIT 1);
SET @paracetamol_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000101' LIMIT 1);
SET @syringes_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000102' LIMIT 1);
SET @amoxicillin_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000103' LIMIT 1);
SET @n95_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000104' LIMIT 1);
SET @surgical_masks_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000105' LIMIT 1);
SET @bp_monitor_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000106' LIMIT 1);
SET @stethoscope_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000107' LIMIT 1);
SET @sanitizer_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000108' LIMIT 1);
SET @wipes_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000109' LIMIT 1);
SET @ibuprofen_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000110' LIMIT 1);
SET @gauze_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000111' LIMIT 1);
SET @tape_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000112' LIMIT 1);
SET @thermometer_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000113' LIMIT 1);
SET @cotton_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000114' LIMIT 1);
SET @alcohol_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000115' LIMIT 1);
SET @oxygen_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000116' LIMIT 1);
SET @iv_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000117' LIMIT 1);
SET @aspirin_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000118' LIMIT 1);
SET @metformin_id = (SELECT itemId FROM inventory_items WHERE itemCode = 'INV-000119' LIMIT 1);

-- Add transactions for the past 6 months (October 2025 - March 2026)
-- October 2025 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000100', @gloves_id, 'receipt', '2025-10-05', 500, 'purchase', 1, 'Bulk order'),
('TXN-000101', @paracetamol_id, 'receipt', '2025-10-08', 1000, 'purchase', 1, NULL),
('TXN-000102', @syringes_id, 'receipt', '2025-10-10', 800, 'purchase', 1, NULL),
('TXN-000103', @gloves_id, 'issue', '2025-10-15', -50, 'use', 1, 'Surgical department'),
('TXN-000104', @paracetamol_id, 'issue', '2025-10-18', -200, 'use', 1, 'Pharmacy dispensed'),
('TXN-000105', @n95_id, 'receipt', '2025-10-20', 100, 'purchase', 1, NULL),
('TXN-000106', @syringes_id, 'issue', '2025-10-22', -150, 'use', 1, 'Vaccination clinic'),
('TXN-000107', @amoxicillin_id, 'receipt', '2025-10-25', 600, 'purchase', 1, NULL),
('TXN-000108', @gloves_id, 'adjustment', '2025-10-28', -10, 'correction', 1, 'Inventory count correction');

-- November 2025 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000109', @gloves_id, 'receipt', '2025-11-02', 300, 'purchase', 1, NULL),
('TXN-000110', @surgical_masks_id, 'receipt', '2025-11-05', 200, 'purchase', 1, NULL),
('TXN-000111', @paracetamol_id, 'issue', '2025-11-08', -350, 'use', 1, 'Pharmacy dispensed'),
('TXN-000112', @syringes_id, 'issue', '2025-11-10', -200, 'use', 1, 'Emergency department'),
('TXN-000113', @amoxicillin_id, 'issue', '2025-11-12', -100, 'use', 1, 'Pharmacy dispensed'),
('TXN-000114', @n95_id, 'issue', '2025-11-15', -25, 'use', 1, 'COVID ward'),
('TXN-000115', @bp_monitor_id, 'receipt', '2025-11-18', 10, 'purchase', 1, NULL),
('TXN-000116', @stethoscope_id, 'receipt', '2025-11-20', 15, 'purchase', 1, NULL),
('TXN-000117', @gloves_id, 'issue', '2025-11-22', -75, 'use', 1, 'Surgical department'),
('TXN-000118', @sanitizer_id, 'receipt', '2025-11-25', 50, 'purchase', 1, NULL),
('TXN-000119', @paracetamol_id, 'adjustment', '2025-11-30', 5, 'correction', 1, 'Found extra stock');

-- December 2025 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000120', @gloves_id, 'receipt', '2025-12-01', 400, 'purchase', 1, 'Year-end stock up'),
('TXN-000121', @paracetamol_id, 'receipt', '2025-12-03', 800, 'purchase', 1, NULL),
('TXN-000122', @syringes_id, 'receipt', '2025-12-05', 600, 'purchase', 1, NULL),
('TXN-000123', @amoxicillin_id, 'receipt', '2025-12-08', 500, 'purchase', 1, NULL),
('TXN-000124', @n95_id, 'receipt', '2025-12-10', 75, 'purchase', 1, NULL),
('TXN-000125', @surgical_masks_id, 'receipt', '2025-12-12', 150, 'purchase', 1, NULL),
('TXN-000126', @gloves_id, 'issue', '2025-12-15', -100, 'use', 1, 'Surgical department'),
('TXN-000127', @paracetamol_id, 'issue', '2025-12-18', -400, 'use', 1, 'Pharmacy dispensed'),
('TXN-000128', @syringes_id, 'issue', '2025-12-20', -250, 'use', 1, 'Vaccination clinic'),
('TXN-000129', @amoxicillin_id, 'issue', '2025-12-22', -150, 'use', 1, 'Pharmacy dispensed'),
('TXN-000130', @sanitizer_id, 'issue', '2025-12-24', -30, 'use', 1, 'General use'),
('TXN-000131', @wipes_id, 'receipt', '2025-12-28', 40, 'purchase', 1, NULL),
('TXN-000132', @syringes_id, 'wastage', '2025-12-05', -20, 'damage', 1, 'Damaged during transport'),
('TXN-000133', @amoxicillin_id, 'expiry', '2025-12-10', -15, 'expiry', 1, 'Expired items removed');

-- January 2026 transactions (adding to existing)
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000134', @gloves_id, 'receipt', '2026-01-02', 350, 'purchase', 1, NULL),
('TXN-000135', @paracetamol_id, 'receipt', '2026-01-04', 700, 'purchase', 1, NULL),
('TXN-000136', @syringes_id, 'receipt', '2026-01-06', 500, 'purchase', 1, NULL),
('TXN-000137', @amoxicillin_id, 'receipt', '2026-01-08', 400, 'purchase', 1, NULL),
('TXN-000138', @n95_id, 'receipt', '2026-01-10', 50, 'purchase', 1, NULL),
('TXN-000139', @surgical_masks_id, 'receipt', '2026-01-12', 100, 'purchase', 1, NULL),
('TXN-000140', @gloves_id, 'issue', '2026-01-15', -80, 'use', 1, 'Surgical department'),
('TXN-000141', @paracetamol_id, 'issue', '2026-01-18', -300, 'use', 1, 'Pharmacy dispensed'),
('TXN-000142', @syringes_id, 'issue', '2026-01-20', -180, 'use', 1, 'Emergency department'),
('TXN-000143', @amoxicillin_id, 'issue', '2026-01-22', -120, 'use', 1, 'Pharmacy dispensed'),
('TXN-000144', @n95_id, 'issue', '2026-01-24', -15, 'use', 1, 'COVID ward'),
('TXN-000145', @sanitizer_id, 'issue', '2026-01-26', -25, 'use', 1, 'General use'),
('TXN-000146', @wipes_id, 'issue', '2026-01-28', -20, 'use', 1, 'Cleaning staff'),
('TXN-000147', @ibuprofen_id, 'receipt', '2026-01-30', 600, 'purchase', 1, NULL),
('TXN-000148', @n95_id, 'return', '2026-01-05', 10, 'return', 1, 'Returned from department');

-- February 2026 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000149', @gloves_id, 'receipt', '2026-02-03', 450, 'purchase', 1, NULL),
('TXN-000150', @paracetamol_id, 'receipt', '2026-02-05', 900, 'purchase', 1, NULL),
('TXN-000151', @syringes_id, 'receipt', '2026-02-07', 700, 'purchase', 1, NULL),
('TXN-000152', @amoxicillin_id, 'receipt', '2026-02-09', 550, 'purchase', 1, NULL),
('TXN-000153', @n95_id, 'receipt', '2026-02-11', 60, 'purchase', 1, NULL),
('TXN-000154', @surgical_masks_id, 'receipt', '2026-02-13', 120, 'purchase', 1, NULL),
('TXN-000155', @gloves_id, 'issue', '2026-02-16', -90, 'use', 1, 'Surgical department'),
('TXN-000156', @paracetamol_id, 'issue', '2026-02-18', -450, 'use', 1, 'Pharmacy dispensed'),
('TXN-000157', @syringes_id, 'issue', '2026-02-20', -220, 'use', 1, 'Vaccination clinic'),
('TXN-000158', @amoxicillin_id, 'issue', '2026-02-22', -180, 'use', 1, 'Pharmacy dispensed'),
('TXN-000159', @n95_id, 'issue', '2026-02-24', -20, 'use', 1, 'COVID ward'),
('TXN-000160', @sanitizer_id, 'issue', '2026-02-26', -35, 'use', 1, 'General use'),
('TXN-000161', @wipes_id, 'issue', '2026-02-28', -25, 'use', 1, 'Cleaning staff'),
('TXN-000162', @ibuprofen_id, 'issue', '2026-02-28', -150, 'use', 1, 'Pharmacy dispensed'),
('TXN-000163', @surgical_masks_id, 'wastage', '2026-02-10', -30, 'damage', 1, 'Water damage');

-- March 2026 transactions
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000164', @gloves_id, 'receipt', '2026-03-02', 500, 'purchase', 1, NULL),
('TXN-000165', @paracetamol_id, 'receipt', '2026-03-04', 1000, 'purchase', 1, NULL),
('TXN-000166', @syringes_id, 'receipt', '2026-03-06', 800, 'purchase', 1, NULL),
('TXN-000167', @amoxicillin_id, 'receipt', '2026-03-08', 600, 'purchase', 1, NULL),
('TXN-000168', @n95_id, 'receipt', '2026-03-10', 70, 'purchase', 1, NULL),
('TXN-000169', @surgical_masks_id, 'receipt', '2026-03-12', 140, 'purchase', 1, NULL),
('TXN-000170', @gloves_id, 'issue', '2026-03-15', -100, 'use', 1, 'Surgical department'),
('TXN-000171', @paracetamol_id, 'issue', '2026-03-18', -500, 'use', 1, 'Pharmacy dispensed'),
('TXN-000172', @syringes_id, 'issue', '2026-03-20', -250, 'use', 1, 'Emergency department'),
('TXN-000173', @amoxicillin_id, 'issue', '2026-03-22', -200, 'use', 1, 'Pharmacy dispensed'),
('TXN-000174', @n95_id, 'issue', '2026-03-24', -25, 'use', 1, 'COVID ward'),
('TXN-000175', @sanitizer_id, 'issue', '2026-03-26', -40, 'use', 1, 'General use'),
('TXN-000176', @wipes_id, 'issue', '2026-03-28', -30, 'use', 1, 'Cleaning staff'),
('TXN-000177', @ibuprofen_id, 'issue', '2026-03-30', -200, 'use', 1, 'Pharmacy dispensed'),
('TXN-000178', @sanitizer_id, 'expiry', '2026-03-15', -5, 'expiry', 1, 'Expired items removed'),
('TXN-000179', @wipes_id, 'adjustment', '2026-03-20', -8, 'correction', 1, 'Inventory count correction');

-- Add more transactions for other items to create variety
INSERT INTO inventory_transactions (transactionNumber, itemId, transactionType, transactionDate, quantity, reason, performedBy, notes) VALUES
('TXN-000180', @gauze_id, 'receipt', '2025-10-12', 400, 'purchase', 1, NULL),
('TXN-000181', @tape_id, 'receipt', '2025-10-15', 200, 'purchase', 1, NULL),
('TXN-000182', @gauze_id, 'issue', '2025-11-20', -150, 'use', 1, 'Emergency department'),
('TXN-000183', @tape_id, 'issue', '2025-12-10', -80, 'use', 1, 'General use'),
('TXN-000184', @thermometer_id, 'receipt', '2025-11-25', 15, 'purchase', 1, NULL),
('TXN-000185', @thermometer_id, 'issue', '2026-01-15', -5, 'use', 1, 'Outpatient clinic'),
('TXN-000186', @cotton_id, 'receipt', '2025-12-05', 300, 'purchase', 1, NULL),
('TXN-000187', @cotton_id, 'issue', '2026-02-10', -100, 'use', 1, 'Laboratory'),
('TXN-000188', @alcohol_id, 'receipt', '2026-01-10', 250, 'purchase', 1, NULL),
('TXN-000189', @alcohol_id, 'issue', '2026-03-15', -120, 'use', 1, 'General use'),
('TXN-000190', @oxygen_id, 'receipt', '2025-12-20', 30, 'purchase', 1, NULL),
('TXN-000191', @oxygen_id, 'issue', '2026-02-25', -10, 'use', 1, 'Emergency department'),
('TXN-000192', @iv_id, 'receipt', '2026-01-20', 200, 'purchase', 1, NULL),
('TXN-000193', @iv_id, 'issue', '2026-03-10', -80, 'use', 1, 'Inpatient ward'),
('TXN-000194', @aspirin_id, 'receipt', '2025-11-10', 800, 'purchase', 1, NULL),
('TXN-000195', @aspirin_id, 'issue', '2026-01-25', -300, 'use', 1, 'Pharmacy dispensed'),
('TXN-000196', @metformin_id, 'receipt', '2025-12-15', 600, 'purchase', 1, NULL),
('TXN-000197', @metformin_id, 'issue', '2026-02-20', -250, 'use', 1, 'Pharmacy dispensed');

-- Update inventory item quantities based on all transactions
UPDATE inventory_items i
SET quantity = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM inventory_transactions t
    WHERE t.itemId = i.itemId
)
WHERE i.itemId IN (
    SELECT DISTINCT itemId FROM inventory_transactions
);
