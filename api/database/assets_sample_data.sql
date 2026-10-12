-- ============================================
-- ASSETS SAMPLE DATA
-- ============================================
-- This script creates sample data for fixed assets
-- Note: If assets already exist, this will use INSERT IGNORE to avoid duplicates

-- Medical Equipment
INSERT IGNORE INTO assets (
    assetCode, assetName, category, assetType, purchaseDate, purchaseCost, 
    currentValue, depreciationMethod, depreciationRate, accumulatedDepreciation,
    location, serialNumber, manufacturer, model, status, notes, createdAt
)
VALUES
    -- Medical Equipment
    ('AST-EQ-001', 'ECG Machine', 'Equipment', 'Medical Equipment', '2022-01-15', 450000.00,
     350000.00, 'Straight-line', 10.00, 100000.00,
     'Cardiology Department', 'ECG-2022-001', 'Philips', 'PageWriter TC70', 'active',
     '12-lead ECG machine for cardiac monitoring', '2022-01-15 10:00:00'),
    
    ('AST-EQ-002', 'Ventilator', 'Equipment', 'Medical Equipment', '2021-06-20', 2500000.00,
     1800000.00, 'Straight-line', 8.00, 700000.00,
     'ICU', 'VENT-2021-001', 'Medtronic', 'PB980', 'active',
     'Critical care ventilator for ICU patients', '2021-06-20 14:30:00'),
    
    ('AST-EQ-003', 'Ultrasound Machine', 'Equipment', 'Medical Equipment', '2023-03-10', 3200000.00,
     2900000.00, 'Straight-line', 10.00, 300000.00,
     'Radiology Department', 'US-2023-001', 'GE Healthcare', 'Voluson E10', 'active',
     '4D ultrasound system for obstetrics and gynecology', '2023-03-10 09:15:00'),
    
    ('AST-EQ-004', 'X-Ray Machine', 'Equipment', 'Medical Equipment', '2020-11-05', 5000000.00,
     3500000.00, 'Straight-line', 10.00, 1500000.00,
     'Radiology Department', 'XRAY-2020-001', 'Siemens', 'Multix Impact', 'active',
     'Digital X-ray system with high-resolution imaging', '2020-11-05 11:00:00'),
    
    ('AST-EQ-005', 'Patient Monitor', 'Equipment', 'Medical Equipment', '2023-08-12', 280000.00,
     250000.00, 'Straight-line', 12.00, 30000.00,
     'Emergency Department', 'MON-2023-001', 'Philips', 'IntelliVue MP70', 'active',
     'Multi-parameter patient monitoring system', '2023-08-12 13:45:00'),
    
    ('AST-EQ-006', 'Anesthesia Machine', 'Equipment', 'Medical Equipment', '2022-05-18', 1800000.00,
     1400000.00, 'Straight-line', 10.00, 400000.00,
     'Operating Theater', 'ANES-2022-001', 'Dräger', 'Primus', 'active',
     'Modern anesthesia delivery system', '2022-05-18 15:20:00'),
    
    ('AST-EQ-007', 'Dialysis Machine', 'Equipment', 'Medical Equipment', '2021-09-22', 3200000.00,
     2200000.00, 'Straight-line', 10.00, 1000000.00,
     'Nephrology Unit', 'DIAL-2021-001', 'Fresenius', '4008S', 'maintenance',
     'Hemodialysis machine - currently under maintenance', '2021-09-22 10:30:00'),
    
    ('AST-EQ-008', 'Defibrillator', 'Equipment', 'Medical Equipment', '2023-11-30', 450000.00,
     420000.00, 'Straight-line', 15.00, 30000.00,
     'Emergency Department', 'DEFIB-2023-001', 'ZOLL', 'X Series', 'active',
     'Automated external defibrillator with CPR feedback', '2023-11-30 16:00:00'),
    
    -- Laboratory Equipment
    ('AST-LAB-001', 'Blood Analyzer', 'Equipment', 'Laboratory Equipment', '2022-07-14', 2200000.00,
     1700000.00, 'Straight-line', 10.00, 500000.00,
     'Laboratory', 'BA-2022-001', 'Abbott', 'CELL-DYN Ruby', 'active',
     'Automated hematology analyzer', '2022-07-14 08:30:00'),
    
    ('AST-LAB-002', 'Chemistry Analyzer', 'Equipment', 'Laboratory Equipment', '2023-02-08', 2800000.00,
     2500000.00, 'Straight-line', 10.00, 300000.00,
     'Laboratory', 'CA-2023-001', 'Roche', 'Cobas 6000', 'active',
     'Clinical chemistry analyzer for blood tests', '2023-02-08 12:15:00'),
    
    ('AST-LAB-003', 'Microscope', 'Equipment', 'Laboratory Equipment', '2021-04-25', 850000.00,
     650000.00, 'Straight-line', 10.00, 200000.00,
     'Laboratory', 'MIC-2021-001', 'Olympus', 'BX53', 'active',
     'Research-grade microscope for pathology', '2021-04-25 14:00:00'),
    
    -- IT Equipment
    ('AST-IT-001', 'Server Rack', 'IT Equipment', 'Server', '2022-03-12', 1200000.00,
     900000.00, 'Straight-line', 20.00, 300000.00,
     'IT Server Room', 'SRV-2022-001', 'Dell', 'PowerEdge R750', 'active',
     'Primary hospital data server', '2022-03-12 10:00:00'),
    
    ('AST-IT-002', 'Network Switch', 'IT Equipment', 'Networking', '2023-06-20', 450000.00,
     380000.00, 'Straight-line', 25.00, 70000.00,
     'IT Server Room', 'NET-2023-001', 'Cisco', 'Catalyst 9300', 'active',
     'Core network switch for hospital network', '2023-06-20 11:30:00'),
    
    -- Furniture
    ('AST-FUR-001', 'Hospital Beds Set (20 units)', 'Furniture', 'Furniture', '2021-08-10', 1500000.00,
     1100000.00, 'Straight-line', 10.00, 400000.00,
     'General Ward', 'BED-2021-001', 'Hill-Rom', 'Centrella', 'active',
     '20 electric hospital beds with safety features', '2021-08-10 09:00:00'),
    
    ('AST-FUR-002', 'Operating Table', 'Furniture', 'Medical Furniture', '2022-09-15', 850000.00,
     650000.00, 'Straight-line', 10.00, 200000.00,
     'Operating Theater', 'OT-2022-001', 'Maquet', 'Alphamaxx', 'active',
     'Hydraulic operating table for surgeries', '2022-09-15 13:45:00'),
    
    ('AST-FUR-003', 'Reception Desk', 'Furniture', 'Office Furniture', '2023-01-20', 320000.00,
     280000.00, 'Straight-line', 10.00, 40000.00,
     'Main Reception', 'REC-2023-001', 'Custom Build', 'Reception Desk Model A', 'active',
     'Custom-built reception counter', '2023-01-20 10:00:00'),
    
    -- Vehicles
    ('AST-VEH-001', 'Ambulance', 'Vehicle', 'Emergency Vehicle', '2021-12-05', 8500000.00,
     5500000.00, 'Straight-line', 15.00, 3000000.00,
     'Ambulance Bay', 'AMB-2021-001', 'Mercedes-Benz', 'Sprinter 316', 'active',
     'Fully equipped ambulance with life support equipment', '2021-12-05 14:00:00'),
    
    ('AST-VEH-002', 'Hospital Van', 'Vehicle', 'Transport Vehicle', '2022-04-18', 3200000.00,
     2200000.00, 'Straight-line', 20.00, 1000000.00,
     'Parking Lot', 'VAN-2022-001', 'Toyota', 'Hiace', 'active',
     'Transport van for hospital operations', '2022-04-18 09:30:00'),
    
    ('AST-VEH-003', 'Maintenance Truck', 'Vehicle', 'Service Vehicle', '2020-08-25', 2800000.00,
     1500000.00, 'Straight-line', 20.00, 1300000.00,
     'Parking Lot', 'TRUCK-2020-001', 'Isuzu', 'NPR', 'disposed',
     'Old maintenance truck - disposed after end of useful life', '2020-08-25 10:00:00'),
    
    -- Building/Infrastructure (sample entries)
    ('AST-BLD-001', 'Main Building Renovation', 'Building', 'Infrastructure', '2020-01-10', 45000000.00,
     35000000.00, 'Straight-line', 2.50, 10000000.00,
     'Main Hospital Building', 'BLD-2020-001', 'Various', 'Building Renovation 2020', 'active',
     'Major renovation and upgrade of main hospital building', '2020-01-10 08:00:00'),
    
    ('AST-BLD-002', 'Parking Structure', 'Building', 'Infrastructure', '2022-11-12', 18000000.00,
     16000000.00, 'Straight-line', 3.00, 2000000.00,
     'Hospital Grounds', 'BLD-2022-001', 'Construction Co.', 'Parking Structure A', 'active',
     'Multi-level parking structure for patients and staff', '2022-11-12 09:00:00');

-- Update disposed asset with disposal information
UPDATE assets 
SET disposedDate = '2024-01-15', disposedValue = 800000.00
WHERE assetCode = 'AST-VEH-003' AND disposedDate IS NULL;

-- Verify the data
SELECT 
    category,
    status,
    COUNT(*) as count,
    SUM(purchaseCost) as total_purchase_cost,
    SUM(currentValue) as total_current_value
FROM assets
GROUP BY category, status
ORDER BY category, status;

SELECT 
    status,
    COUNT(*) as count,
    SUM(purchaseCost) as total_purchase_cost,
    SUM(currentValue) as total_current_value,
    SUM(accumulatedDepreciation) as total_depreciation
FROM assets
GROUP BY status
ORDER BY status;
