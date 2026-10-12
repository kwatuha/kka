-- Sample Data for Procedures and Consumables
-- This populates the dropdowns in the Patient Encounter Form

-- ============================================
-- PROCEDURES SAMPLE DATA
-- ============================================

INSERT INTO procedures (procedureCode, procedureName, category, description, duration, cost, isActive) VALUES
-- General Procedures
('GEN-CONS', 'General Consultation', 'General', 'Standard medical consultation', 30, 2000.00, TRUE),
('PHY-EXAM', 'Physical Examination', 'General', 'Comprehensive physical examination', 45, 3000.00, TRUE),
('VIT-CHK', 'Vital Signs Check', 'General', 'Blood pressure, temperature, pulse check', 15, 500.00, TRUE),

-- Dental Procedures
('TOO-EXT', 'Tooth Extraction', 'Dental', 'Simple tooth extraction', 30, 5000.00, TRUE),
('TOO-FIL', 'Tooth Filling', 'Dental', 'Dental cavity filling', 45, 4000.00, TRUE),
('TOO-CLN', 'Teeth Cleaning', 'Dental', 'Professional dental cleaning', 60, 3000.00, TRUE),
('ROO-CAN', 'Root Canal', 'Dental', 'Root canal treatment', 90, 15000.00, TRUE),

-- Surgical Procedures
('MIN-SUR', 'Minor Surgery', 'Surgery', 'Minor surgical procedure', 60, 10000.00, TRUE),
('WOU-SUT', 'Wound Suturing', 'Surgery', 'Wound closure with sutures', 30, 5000.00, TRUE),
('BIO-PSY', 'Biopsy', 'Surgery', 'Tissue sample collection', 45, 8000.00, TRUE),

-- Diagnostic Procedures
('ECG', 'Electrocardiogram (ECG)', 'Cardiology', 'Heart rhythm and electrical activity test', 30, 3000.00, TRUE),
('ECHO', 'Echocardiogram', 'Cardiology', 'Ultrasound of the heart', 45, 8000.00, TRUE),
('ULS-ABD', 'Abdominal Ultrasound', 'Radiology', 'Ultrasound scan of abdomen', 30, 5000.00, TRUE),
('ULS-PEL', 'Pelvic Ultrasound', 'Radiology', 'Ultrasound scan of pelvis', 30, 5000.00, TRUE),

-- Maternity Procedures
('ANT-CHK', 'Antenatal Checkup', 'Maternity', 'Pregnancy checkup and monitoring', 30, 2500.00, TRUE),
('ULS-PRE', 'Pregnancy Ultrasound', 'Maternity', 'Ultrasound for pregnancy monitoring', 30, 4000.00, TRUE),
('DEL-NOR', 'Normal Delivery', 'Maternity', 'Vaginal delivery assistance', 120, 25000.00, TRUE),

-- Emergency Procedures
('IV-INS', 'IV Insertion', 'Emergency', 'Intravenous line insertion', 15, 2000.00, TRUE),
('CAT-INS', 'Catheter Insertion', 'Emergency', 'Urinary catheter insertion', 20, 3000.00, TRUE),
('NEB-TRT', 'Nebulization Treatment', 'Emergency', 'Respiratory nebulization therapy', 30, 2500.00, TRUE),

-- Other Procedures
('DRS-CHG', 'Dressing Change', 'General', 'Wound dressing change', 15, 1000.00, TRUE),
('INJ-ADM', 'Injection Administration', 'General', 'Intramuscular or subcutaneous injection', 10, 500.00, TRUE),
('BLOOD-DR', 'Blood Draw', 'Laboratory', 'Blood sample collection', 10, 1000.00, TRUE)
ON DUPLICATE KEY UPDATE procedureName=VALUES(procedureName);

-- ============================================
-- CONSUMABLES SAMPLE DATA (Service Charges with chargeType='Consumable')
-- ============================================

INSERT INTO service_charges (chargeCode, name, category, department, cost, chargeType, unit, description, status) VALUES
-- Medical Supplies
('GLOV-SUR', 'Surgical Gloves', 'Medical Supplies', 'General', 2500.00, 'Consumable', 'per box', 'Sterile surgical gloves (100 pieces per box)', 'Active'),
('GLOV-EXM', 'Examination Gloves', 'Medical Supplies', 'General', 1500.00, 'Consumable', 'per box', 'Disposable examination gloves (100 pieces per box)', 'Active'),
('MASK-SUR', 'Surgical Masks', 'Medical Supplies', 'General', 2000.00, 'Consumable', 'per pack', 'Surgical face masks (50 pieces per pack)', 'Active'),
('MASK-N95', 'N95 Masks', 'Medical Supplies', 'General', 5000.00, 'Consumable', 'per pack', 'N95 respirator masks (20 pieces per pack)', 'Active'),

-- Wound Care
('BAND-GAU', 'Gauze Bandages', 'Wound Care', 'General', 800.00, 'Consumable', 'per pack', 'Sterile gauze bandages (10 pieces per pack)', 'Active'),
('BAND-ADH', 'Adhesive Bandages', 'Wound Care', 'General', 500.00, 'Consumable', 'per pack', 'Adhesive bandages assorted sizes (50 pieces per pack)', 'Active'),
('COT-SWAB', 'Cotton Swabs', 'Wound Care', 'General', 300.00, 'Consumable', 'per pack', 'Sterile cotton swabs (100 pieces per pack)', 'Active'),
('ANT-SEP', 'Antiseptic Solution', 'Wound Care', 'General', 1200.00, 'Consumable', 'per bottle', 'Antiseptic solution 500ml', 'Active'),

-- Syringes and Needles
('SYR-5ML', 'Syringe 5ml', 'Medical Supplies', 'General', 200.00, 'Consumable', 'per piece', 'Disposable syringe 5ml', 'Active'),
('SYR-10ML', 'Syringe 10ml', 'Medical Supplies', 'General', 250.00, 'Consumable', 'per piece', 'Disposable syringe 10ml', 'Active'),
('NDL-21G', 'Needle 21G', 'Medical Supplies', 'General', 100.00, 'Consumable', 'per piece', 'Disposable needle 21 gauge', 'Active'),
('NDL-23G', 'Needle 23G', 'Medical Supplies', 'General', 100.00, 'Consumable', 'per piece', 'Disposable needle 23 gauge', 'Active'),

-- IV Supplies
('IV-SET', 'IV Set', 'Medical Supplies', 'Emergency', 1500.00, 'Consumable', 'per set', 'Complete IV administration set', 'Active'),
('IV-CAN', 'IV Cannula', 'Medical Supplies', 'Emergency', 800.00, 'Consumable', 'per piece', 'IV cannula various sizes', 'Active'),
('IV-FLU', 'IV Fluid Normal Saline', 'Medical Supplies', 'Emergency', 800.00, 'Consumable', 'per bottle', 'Normal saline 500ml', 'Active'),
('IV-FLU-D5', 'IV Fluid Dextrose 5%', 'Medical Supplies', 'Emergency', 800.00, 'Consumable', 'per bottle', 'Dextrose 5% solution 500ml', 'Active'),

-- Laboratory Consumables
('TUB-VAC', 'Vacutainer Tubes', 'Laboratory', 'Laboratory', 500.00, 'Consumable', 'per tube', 'Blood collection vacutainer tubes', 'Active'),
('SWAB-COP', 'Cotton Swabs for Culture', 'Laboratory', 'Laboratory', 400.00, 'Consumable', 'per swab', 'Sterile swabs for culture collection', 'Active'),
('URINE-CUP', 'Urine Collection Cup', 'Laboratory', 'Laboratory', 200.00, 'Consumable', 'per cup', 'Sterile urine collection container', 'Active'),

-- Maternity Supplies
('DEL-KIT', 'Delivery Kit', 'Maternity', 'Maternity', 5000.00, 'Consumable', 'per kit', 'Complete delivery kit with all supplies', 'Active'),
('UMB-CLAMP', 'Umbilical Cord Clamp', 'Maternity', 'Maternity', 300.00, 'Consumable', 'per piece', 'Umbilical cord clamp', 'Active'),

-- Emergency Supplies
('OXY-MASK', 'Oxygen Mask', 'Emergency', 'Emergency', 2000.00, 'Consumable', 'per mask', 'Oxygen delivery mask', 'Active'),
('NEB-KIT', 'Nebulizer Kit', 'Emergency', 'Emergency', 3000.00, 'Consumable', 'per kit', 'Complete nebulizer treatment kit', 'Active'),
('SPLINT', 'Splint Material', 'Emergency', 'Emergency', 1500.00, 'Consumable', 'per piece', 'Emergency splinting material', 'Active'),

-- General Consumables
('THERM-DIG', 'Digital Thermometer', 'Medical Equipment', 'General', 3000.00, 'Consumable', 'per piece', 'Digital thermometer (disposable probe covers included)', 'Active'),
('BP-CUFF', 'Blood Pressure Cuff', 'Medical Equipment', 'General', 5000.00, 'Consumable', 'per cuff', 'Disposable blood pressure cuff', 'Active'),
('STET-SCOPE', 'Stethoscope', 'Medical Equipment', 'General', 8000.00, 'Consumable', 'per piece', 'Medical stethoscope', 'Active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================
-- OPTIONAL: Link some procedures to service charges
-- ============================================

-- Update procedures to link with service charges (if matching charges exist)
-- This is optional - procedures can work without linked charges
-- Note: This is commented out as it requires careful matching
-- UPDATE procedures p
-- INNER JOIN service_charges sc ON sc.name LIKE CONCAT('%', p.procedureName, '%')
-- SET p.chargeId = sc.chargeId
-- WHERE sc.chargeType = 'Procedure' OR sc.chargeType = 'Service';

