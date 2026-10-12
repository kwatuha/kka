-- Comprehensive Dashboard Sample Data
-- This script creates sample data to populate the dashboard with meaningful statistics

USE kiplombe_hmis;

-- ============================================
-- 1. ADDITIONAL PATIENTS (if needed)
-- ============================================
INSERT IGNORE INTO patients (patientNumber, firstName, lastName, dateOfBirth, gender, phone, email, address, idNumber, createdAt) VALUES
('PAT-0101', 'John', 'Mwangi', '1985-03-15', 'Male', '+254 712 345 678', 'john.mwangi@email.com', 'Nairobi, Kenya', '12345678', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('PAT-0102', 'Mary', 'Wanjiru', '1990-07-22', 'Female', '+254 723 456 789', 'mary.wanjiru@email.com', 'Nairobi, Kenya', '23456789', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('PAT-0103', 'Peter', 'Ochieng', '1988-11-08', 'Male', '+254 734 567 890', 'peter.ochieng@email.com', 'Nairobi, Kenya', '34567890', NOW()),
('PAT-0104', 'Grace', 'Achieng', '1992-05-30', 'Female', '+254 745 678 901', 'grace.achieng@email.com', 'Nairobi, Kenya', '45678901', NOW()),
('PAT-0105', 'David', 'Kamau', '1987-09-12', 'Male', '+254 756 789 012', 'david.kamau@email.com', 'Nairobi, Kenya', '56789012', NOW());

-- ============================================
-- 2. TODAY'S APPOINTMENTS
-- ============================================
SET @today = CURDATE();
SET @patient1 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient2 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient3 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient4 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient5 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @doctor1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor' LIMIT 1) LIMIT 1);
SET @doctor2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor' LIMIT 1) LIMIT 1 OFFSET 1);

INSERT IGNORE INTO appointments (patientId, doctorId, appointmentDate, appointmentTime, status, reason, notes, createdAt) VALUES
(@patient1, @doctor1, @today, '09:00:00', 'confirmed', 'General consultation', 'Regular checkup', NOW()),
(@patient2, @doctor1, @today, '10:00:00', 'confirmed', 'Follow-up visit', 'Review test results', NOW()),
(@patient3, @doctor2, @today, '11:00:00', 'pending', 'New patient consultation', NULL, NOW()),
(@patient4, @doctor1, @today, '14:00:00', 'confirmed', 'Vaccination', 'Annual flu shot', NOW()),
(@patient5, @doctor2, @today, '15:00:00', 'pending', 'General consultation', NULL, NOW());

-- ============================================
-- 3. QUEUE ENTRIES (Active)
-- ============================================
-- Check if queue_entries table exists and has servicePointId column
SET @has_service_point = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'queue_entries' 
    AND COLUMN_NAME = 'servicePointId'
);

SET @service1 = NULL;
SET @service2 = NULL;

-- Try to get service points if table exists
SET @service1 = IF(@has_service_point > 0, 
    (SELECT servicePointId FROM service_points WHERE servicePointName = 'Consultation' LIMIT 1), 
    NULL);
SET @service2 = IF(@has_service_point > 0,
    (SELECT servicePointId FROM service_points WHERE servicePointName = 'Pharmacy' LIMIT 1),
    NULL);

-- Insert queue entries (using ticketNumber instead of queueNumber, and servicePoint instead of servicePointId)
INSERT IGNORE INTO queue_entries (patientId, ticketNumber, servicePoint, status, priority, notes, arrivalTime, createdAt)
SELECT @patient1, CONCAT('Q', LPAD(1, 4, '0')), 'Consultation', 'waiting', 'normal', NULL, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_entries');

INSERT IGNORE INTO queue_entries (patientId, ticketNumber, servicePoint, status, priority, notes, arrivalTime, createdAt)
SELECT @patient2, CONCAT('Q', LPAD(2, 4, '0')), 'Consultation', 'waiting', 'normal', NULL, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_entries');

INSERT IGNORE INTO queue_entries (patientId, ticketNumber, servicePoint, status, priority, notes, arrivalTime, createdAt)
SELECT @patient3, CONCAT('Q', LPAD(3, 4, '0')), 'Consultation', 'serving', 'normal', NULL, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_entries');

INSERT IGNORE INTO queue_entries (patientId, ticketNumber, servicePoint, status, priority, notes, arrivalTime, createdAt)
SELECT @patient4, CONCAT('Q', LPAD(4, 4, '0')), 'Pharmacy', 'waiting', 'normal', NULL, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_entries');

INSERT IGNORE INTO queue_entries (patientId, ticketNumber, servicePoint, status, priority, notes, arrivalTime, createdAt)
SELECT @patient5, CONCAT('Q', LPAD(5, 4, '0')), 'Pharmacy', 'waiting', 'normal', NULL, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_entries');

-- ============================================
-- 4. INVOICES (Monthly Revenue)
-- ============================================
SET @patient_inv1 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient_inv2 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient_inv3 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient_inv4 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient_inv5 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);

-- Create invoices for current month
INSERT IGNORE INTO invoices (invoiceNumber, patientId, invoiceDate, dueDate, totalAmount, status, paymentStatus, notes, createdAt) VALUES
(CONCAT('INV-', YEAR(NOW()), '-', LPAD(1, 6, '0')), @patient_inv1, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 5000.00, 'paid', 'paid', 'Consultation and tests', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(CONCAT('INV-', YEAR(NOW()), '-', LPAD(2, 6, '0')), @patient_inv2, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 8500.00, 'paid', 'paid', 'Pharmacy and lab', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(CONCAT('INV-', YEAR(NOW()), '-', LPAD(3, 6, '0')), @patient_inv3, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 12000.00, 'paid', 'paid', 'Full checkup', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(CONCAT('INV-', YEAR(NOW()), '-', LPAD(4, 6, '0')), @patient_inv4, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 3500.00, 'paid', 'paid', 'Consultation only', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(CONCAT('INV-', YEAR(NOW()), '-', LPAD(5, 6, '0')), @patient_inv5, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 15000.00, 'pending', 'pending', 'Surgery consultation', NOW());

-- Add invoice items
SET @inv1 = (SELECT invoiceId FROM invoices WHERE invoiceNumber LIKE CONCAT('INV-', YEAR(NOW()), '-%') ORDER BY invoiceId DESC LIMIT 1 OFFSET 4);
SET @inv2 = (SELECT invoiceId FROM invoices WHERE invoiceNumber LIKE CONCAT('INV-', YEAR(NOW()), '-%') ORDER BY invoiceId DESC LIMIT 1 OFFSET 3);
SET @inv3 = (SELECT invoiceId FROM invoices WHERE invoiceNumber LIKE CONCAT('INV-', YEAR(NOW()), '-%') ORDER BY invoiceId DESC LIMIT 1 OFFSET 2);
SET @inv4 = (SELECT invoiceId FROM invoices WHERE invoiceNumber LIKE CONCAT('INV-', YEAR(NOW()), '-%') ORDER BY invoiceId DESC LIMIT 1 OFFSET 1);
SET @inv5 = (SELECT invoiceId FROM invoices WHERE invoiceNumber LIKE CONCAT('INV-', YEAR(NOW()), '-%') ORDER BY invoiceId DESC LIMIT 1);

SET @charge1 = (SELECT chargeId FROM service_charges LIMIT 1);
SET @charge2 = (SELECT chargeId FROM service_charges LIMIT 1 OFFSET 1);
SET @charge3 = (SELECT chargeId FROM service_charges LIMIT 1 OFFSET 2);

INSERT IGNORE INTO invoice_items (invoiceId, chargeId, description, quantity, unitPrice, totalPrice) VALUES
(@inv1, @charge1, 'General Consultation', 1, 5000.00, 5000.00),
(@inv2, @charge1, 'General Consultation', 1, 5000.00, 5000.00),
(@inv2, @charge2, 'Lab Test', 1, 3500.00, 3500.00),
(@inv3, @charge1, 'General Consultation', 1, 5000.00, 5000.00),
(@inv3, @charge2, 'Lab Test', 2, 3500.00, 7000.00),
(@inv4, @charge1, 'General Consultation', 1, 3500.00, 3500.00),
(@inv5, @charge1, 'Specialist Consultation', 1, 15000.00, 15000.00);

-- ============================================
-- 5. LOW STOCK INVENTORY ITEMS
-- ============================================
-- Update some inventory items to have low stock
UPDATE inventory_items 
SET quantityOnHand = 5, reorderLevel = 10
WHERE itemId IN (
    SELECT itemId FROM (SELECT itemId FROM inventory_items LIMIT 5) AS temp
)
LIMIT 5;

-- ============================================
-- 6. INPATIENT ADMISSIONS
-- ============================================
SET @ward1 = NULL;
SET @bed1 = NULL;
SET @patient_inp1 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);
SET @patient_inp2 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);

-- Only insert if tables exist
SET @ward1 = IF(EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wards'),
    (SELECT wardId FROM wards LIMIT 1), NULL);
SET @bed1 = IF(@ward1 IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'beds'),
    (SELECT bedId FROM beds WHERE wardId = @ward1 LIMIT 1), NULL);

INSERT IGNORE INTO inpatient_admissions (patientId, wardId, bedId, admissionDate, admissionReason, status, notes, createdAt)
SELECT @patient_inp1, @ward1, @bed1, DATE_SUB(NOW(), INTERVAL 3 DAY), 'Post-surgery recovery', 'active', 'Stable condition', DATE_SUB(NOW(), INTERVAL 3 DAY)
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inpatient_admissions')
AND @ward1 IS NOT NULL;

INSERT IGNORE INTO inpatient_admissions (patientId, wardId, bedId, admissionDate, admissionReason, status, notes, createdAt)
SELECT @patient_inp2, @ward1, COALESCE((SELECT bedId FROM beds WHERE wardId = @ward1 LIMIT 1 OFFSET 1), @bed1), DATE_SUB(NOW(), INTERVAL 1 DAY), 'Observation', 'active', 'Monitoring', DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inpatient_admissions')
AND @ward1 IS NOT NULL;

-- ============================================
-- 7. ICU ADMISSIONS
-- ============================================
SET @icu_bed1 = NULL;
SET @patient_icu1 = (SELECT patientId FROM patients ORDER BY RAND() LIMIT 1);

SET @icu_bed1 = IF(EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'icu_beds'),
    (SELECT bedId FROM icu_beds LIMIT 1), NULL);

INSERT IGNORE INTO icu_admissions (patientId, bedId, admissionDate, admissionReason, status, notes, createdAt)
SELECT @patient_icu1, @icu_bed1, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Critical care', 'active', 'Stable, improving', DATE_SUB(NOW(), INTERVAL 2 DAY)
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'icu_admissions')
AND @icu_bed1 IS NOT NULL;

-- ============================================
-- 8. MATERNITY ADMISSIONS
-- ============================================
SET @patient_mat1 = (SELECT patientId FROM patients WHERE gender = 'Female' ORDER BY RAND() LIMIT 1);
SET @patient_mat2 = (SELECT patientId FROM patients WHERE gender = 'Female' ORDER BY RAND() LIMIT 1);

INSERT IGNORE INTO maternity_admissions (patientId, admissionDate, admissionReason, status, notes, createdAt)
SELECT @patient_mat1, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Labor', 'active', 'Active labor', DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maternity_admissions')
AND @patient_mat1 IS NOT NULL;

INSERT IGNORE INTO maternity_admissions (patientId, admissionDate, admissionReason, status, notes, createdAt)
SELECT @patient_mat2, NOW(), 'Antenatal care', 'active', 'Routine check', NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maternity_admissions')
AND @patient_mat2 IS NOT NULL;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
    'Dashboard Sample Data Inserted' AS Status,
    (SELECT COUNT(*) FROM patients) AS TotalPatients,
    (SELECT COUNT(*) FROM appointments WHERE appointmentDate = CURDATE()) AS TodayAppointments,
    (SELECT COUNT(*) FROM queue_entries WHERE status IN ('waiting', 'called', 'serving')) AS ActiveQueue,
    (SELECT COUNT(*) FROM employees WHERE status = 'active') AS ActiveEmployees,
    (SELECT COALESCE(SUM(totalAmount), 0) FROM invoices WHERE MONTH(createdAt) = MONTH(NOW()) AND YEAR(createdAt) = YEAR(NOW()) AND status = 'paid') AS MonthlyRevenue,
    (SELECT COUNT(*) FROM inventory_items WHERE quantityOnHand <= reorderLevel) AS LowStockItems,
    (SELECT COUNT(*) FROM inpatient_admissions WHERE dischargeDate IS NULL) AS Inpatients,
    (SELECT COUNT(*) FROM icu_admissions WHERE dischargeDate IS NULL) AS ICUPatients,
    (SELECT COUNT(*) FROM maternity_admissions WHERE dischargeDate IS NULL) AS MaternityPatients;

