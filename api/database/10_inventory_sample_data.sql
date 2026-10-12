-- Comprehensive Inventory Sample Data
USE kiplombe_hmis;

-- Insert inventory categories (if table exists)
INSERT IGNORE INTO inventory_categories (categoryName, description) VALUES
('Medical Supplies', 'General medical supplies and consumables'),
('Pharmaceuticals', 'Medications and pharmaceutical products'),
('Equipment', 'Medical equipment and devices'),
('PPE', 'Personal Protective Equipment'),
('Furniture', 'Hospital furniture and fixtures'),
('Hygiene Products', 'Hygiene and sanitation products');

-- Insert comprehensive sample inventory items
INSERT IGNORE INTO inventory_items (itemCode, name, category, unit, quantity, reorderLevel, unitPrice, supplier, expiryDate, location, description, status, createdBy) VALUES
-- Medical Supplies
('SG-M-001', 'Surgical Gloves (Medium)', 'Medical Supplies', 'Box', 1250, 500, 8.50, 'Medequip Supplies Ltd', '2025-06-15', 'Main Storage A1', 'Surgical gloves medium size, box of 100', 'Active', 1),
('DS-5ML-003', 'Disposable Syringes 5ml', 'Medical Supplies', 'Box', 3200, 1000, 1.25, 'Medequip Supplies Ltd', '2025-08-22', 'Main Storage A2', 'Disposable syringes 5ml, box of 100', 'Active', 1),
('OM-001-009', 'Oxygen Masks', 'Medical Supplies', 'Unit', 120, 100, 12.25, 'Medequip Supplies Ltd', '2025-05-20', 'Main Storage A4', 'Oxygen delivery masks', 'Active', 1),
('GAUZE-001', 'Gauze Pads 4x4', 'Medical Supplies', 'Box', 450, 200, 15.00, 'Medequip Supplies Ltd', '2026-03-10', 'Main Storage A2', 'Sterile gauze pads 4x4 inches, box of 100', 'Active', 1),
('BANDAGE-001', 'Elastic Bandages', 'Medical Supplies', 'Roll', 180, 80, 5.50, 'Medequip Supplies Ltd', '2026-05-15', 'Main Storage A2', 'Elastic bandages 6 inches wide', 'Active', 1),

-- Pharmaceuticals
('MED-P500-002', 'Paracetamol 500mg', 'Pharmaceuticals', 'Tablet', 350, 400, 2.75, 'Pharma Distributors', '2024-11-30', 'Pharmacy Storage B2', 'Paracetamol tablets 500mg, box of 100', 'Active', 1),
('MED-A250-004', 'Amoxicillin 250mg', 'Pharmaceuticals', 'Capsule', 180, 200, 5.50, 'Pharma Distributors', '2024-09-18', 'Pharmacy Storage B1', 'Amoxicillin capsules 250mg, box of 50', 'Active', 1),
('MED-INS-007', 'Insulin Vials', 'Pharmaceuticals', 'Vial', 85, 50, 32.50, 'Pharma Distributors', '2024-07-15', 'Cold Storage D1', 'Insulin vials 100 units/ml, 10ml vial', 'Active', 1),
('MED-IBU-011', 'Ibuprofen 400mg', 'Pharmaceuticals', 'Tablet', 420, 300, 3.25, 'Pharma Distributors', '2025-01-20', 'Pharmacy Storage B2', 'Ibuprofen tablets 400mg, box of 100', 'Active', 1),
('MED-ASP-012', 'Aspirin 75mg', 'Pharmaceuticals', 'Tablet', 600, 400, 1.50, 'Pharma Distributors', '2025-08-30', 'Pharmacy Storage B1', 'Aspirin tablets 75mg, box of 100', 'Active', 1),

-- Equipment
('EQ-BPM-005', 'Blood Pressure Monitor', 'Equipment', 'Unit', 25, 10, 85.00, 'MedEquipment Ltd', NULL, 'Equipment Storage C3', 'Digital blood pressure monitor', 'Active', 1),
('EQ-THERM-013', 'Digital Thermometer', 'Equipment', 'Unit', 45, 15, 25.00, 'MedEquipment Ltd', NULL, 'Equipment Storage C3', 'Digital oral/rectal thermometer', 'Active', 1),
('EQ-STETH-014', 'Stethoscope', 'Equipment', 'Unit', 30, 10, 75.00, 'MedEquipment Ltd', NULL, 'Equipment Storage C3', 'Professional dual-head stethoscope', 'Active', 1),
('EQ-OXY-015', 'Pulse Oximeter', 'Equipment', 'Unit', 20, 8, 120.00, 'MedEquipment Ltd', NULL, 'Equipment Storage C3', 'Finger pulse oximeter', 'Active', 1),
('EQ-SCALE-016', 'Digital Scale', 'Equipment', 'Unit', 12, 5, 150.00, 'MedEquipment Ltd', NULL, 'Equipment Storage C3', 'Digital patient scale', 'Active', 1),

-- PPE
('SM-001-006', 'Surgical Masks', 'PPE', 'Box', 5800, 2000, 0.75, 'Safety Supplies Co', '2025-12-01', 'Main Storage A3', 'Disposable surgical masks, box of 50', 'Active', 1),
('PPE-GOWN-017', 'Disposable Gowns', 'PPE', 'Unit', 800, 300, 8.00, 'Safety Supplies Co', '2026-02-28', 'Main Storage A3', 'Disposable isolation gowns', 'Active', 1),
('PPE-FACE-018', 'Face Shields', 'PPE', 'Unit', 150, 50, 12.00, 'Safety Supplies Co', '2026-06-15', 'Main Storage A3', 'Reusable face shields', 'Active', 1),
('PPE-APRON-019', 'Disposable Aprons', 'PPE', 'Unit', 1200, 400, 2.50, 'Safety Supplies Co', '2026-01-10', 'Main Storage A3', 'Disposable plastic aprons', 'Active', 1),

-- Furniture
('FUR-EB-008', 'Examination Beds', 'Furniture', 'Unit', 5, 3, 750.00, 'Hospital Furniture Ltd', NULL, 'Furniture Storage E2', 'Adjustable examination beds', 'Active', 1),
('FUR-CHAIR-020', 'Patient Chairs', 'Furniture', 'Unit', 25, 10, 120.00, 'Hospital Furniture Ltd', NULL, 'Furniture Storage E2', 'Comfortable patient waiting chairs', 'Active', 1),
('FUR-TABLE-021', 'Examination Tables', 'Furniture', 'Unit', 8, 3, 450.00, 'Hospital Furniture Ltd', NULL, 'Furniture Storage E2', 'Medical examination tables', 'Active', 1),

-- Hygiene Products
('HS-500-010', 'Hand Sanitizer 500ml', 'Hygiene Products', 'Bottle', 45, 100, 6.75, 'Hygiene Supplies Inc', '2025-02-28', 'Main Storage A5', 'Alcohol-based hand sanitizer 500ml', 'Active', 1),
('SOAP-022', 'Antibacterial Soap', 'Hygiene Products', 'Bottle', 120, 50, 4.50, 'Hygiene Supplies Inc', '2026-04-15', 'Main Storage A5', 'Liquid antibacterial soap 500ml', 'Active', 1),
('TOWEL-023', 'Paper Towels', 'Hygiene Products', 'Roll', 200, 80, 3.25, 'Hygiene Supplies Inc', NULL, 'Main Storage A5', 'Disposable paper towels', 'Active', 1),
('WIPES-024', 'Disinfectant Wipes', 'Hygiene Products', 'Pack', 180, 60, 5.00, 'Hygiene Supplies Inc', '2025-09-20', 'Main Storage A5', 'Disinfectant wipes, pack of 100', 'Active', 1);

-- Update some items to have low stock status
UPDATE inventory_items 
SET quantity = reorderLevel - 10 
WHERE itemCode IN ('MED-P500-002', 'HS-500-010', 'MED-A250-004');

-- Update some items to have expiring soon dates
UPDATE inventory_items 
SET expiryDate = DATE_ADD(CURDATE(), INTERVAL 60 DAY)
WHERE itemCode IN ('MED-INS-007', 'MED-A250-004');




