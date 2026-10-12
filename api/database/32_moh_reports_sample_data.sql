-- ============================================
-- MOH Reports Sample Data
-- ============================================
-- This script generates sample data for all MOH reports:
-- MOH 717 (Workload), MOH 731+ (Key Populations), MOH 705 (Morbidity),
-- MOH 711 (Immunization), MOH 708 (MCH), MOH 730 (Facility Info)
--
-- Data spans the last 3 months to allow testing different reporting periods

-- Set variables for date ranges (last 3 months)
SET @start_date_3_months_ago = DATE_SUB(CURDATE(), INTERVAL 3 MONTH);
SET @start_date_2_months_ago = DATE_SUB(CURDATE(), INTERVAL 2 MONTH);
SET @start_date_1_month_ago = DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
SET @end_date = CURDATE();

-- ============================================
-- MOH 717 - WORKLOAD DATA
-- ============================================
-- Outpatients: Create queue entries for outpatient visits
-- Inpatients: Create admissions
-- Deliveries: Create delivery records
-- Surgeries: Create procedure records
-- Lab Tests: Create lab test orders
-- Radiology: Create radiology exam orders
-- Pharmacy: Create prescriptions

-- Get some existing patients and users
SET @doctor1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1);
SET @doctor2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1 OFFSET 1);
SET @nurse1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1);
SET @patient1 = (SELECT patientId FROM patients LIMIT 1);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);

-- If no doctors/nurses exist, use first user
SET @doctor1 = COALESCE(@doctor1, (SELECT userId FROM users LIMIT 1));
SET @doctor2 = COALESCE(@doctor2, @doctor1);
SET @nurse1 = COALESCE(@nurse1, @doctor1);

-- ============================================
-- 1. OUTPATIENT VISITS (Queue entries for consultation)
-- ============================================
-- Create 150 outpatient visits over the last 3 months
INSERT INTO queue_entries (patientId, ticketNumber, servicePoint, priority, status, arrivalTime, notes, createdBy)
SELECT
    p.patientId,
    CONCAT('CON-', LPAD((@row_num := @row_num + 1), 3, '0')) as ticketNumber,
    'consultation' as servicePoint,
    CASE WHEN RAND() < 0.1 THEN 'urgent' WHEN RAND() < 0.2 THEN 'emergency' ELSE 'normal' END as priority,
    'completed' as status,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as arrivalTime,
    'Outpatient consultation' as notes,
    @doctor1 as createdBy
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) d
CROSS JOIN (SELECT @row_num := 0) r
WHERE p.voided = 0
LIMIT 150;

-- ============================================
-- 2. INPATIENT ADMISSIONS
-- ============================================
-- Create 45 inpatient admissions over the last 3 months
-- First, get available beds
SET @bed1 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1);
SET @bed2 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 1);
SET @bed3 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 2);
SET @bed1 = COALESCE(@bed1, (SELECT bedId FROM beds LIMIT 1));
SET @bed2 = COALESCE(@bed2, @bed1);
SET @bed3 = COALESCE(@bed3, @bed1);

-- Get max admission number to avoid duplicates
SET @max_adm_num = COALESCE((SELECT CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED) FROM admissions WHERE admissionNumber LIKE CONCAT('ADM-', YEAR(CURDATE()), '-%') ORDER BY admissionNumber DESC LIMIT 1), 0);
SET @row_number = 0;

INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionReason, admissionDiagnosis, status, createdAt, createdBy)
SELECT
    CONCAT('ADM-', YEAR(CURDATE()), '-', LPAD((@max_adm_num := @max_adm_num + 1), 5, '0')) as admissionNumber,
    p.patientId,
    CASE
        WHEN (@row_number % 3) = 0 THEN @bed1
        WHEN (@row_number % 3) = 1 THEN @bed2
        ELSE @bed3
    END as bedId,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as admissionDate,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as admittingDoctorId,
    CASE
        WHEN RAND() < 0.2 THEN 'Pneumonia'
        WHEN RAND() < 0.4 THEN 'Malaria'
        WHEN RAND() < 0.6 THEN 'Surgical procedure'
        WHEN RAND() < 0.8 THEN 'Diabetes management'
        ELSE 'Other medical condition'
    END as admissionReason,
    CASE
        WHEN RAND() < 0.2 THEN 'Pneumonia'
        WHEN RAND() < 0.4 THEN 'Malaria'
        WHEN RAND() < 0.6 THEN 'Surgical procedure'
        WHEN RAND() < 0.8 THEN 'Diabetes management'
        ELSE 'Other medical condition'
    END as admissionDiagnosis,
    CASE WHEN RAND() < 0.7 THEN 'discharged' ELSE 'admitted' END as status,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as createdAt,
    @doctor1 as createdBy
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3
) d
CROSS JOIN (SELECT @row_number := 0) r
WHERE p.voided = 0
LIMIT 45;

-- ============================================
-- 3. DELIVERIES (Maternity)
-- ============================================
-- Note: Deliveries require maternity_admissions to exist first
-- If you have maternity admissions, uncomment and run this section separately
-- For now, we'll skip deliveries and focus on other MOH report data
-- Deliveries will be counted from existing maternity_admissions records

-- ============================================
-- 4. SURGICAL PROCEDURES
-- ============================================
-- Create 30 surgical procedures over the last 3 months
INSERT INTO patient_procedures (patientId, procedureName, procedureDate, performedBy, notes)
SELECT
    p.patientId,
    CASE
        WHEN RAND() < 0.2 THEN 'Appendectomy'
        WHEN RAND() < 0.4 THEN 'Hernia Repair'
        WHEN RAND() < 0.6 THEN 'Cataract Surgery'
        WHEN RAND() < 0.8 THEN 'Minor Surgery'
        ELSE 'Other Surgical Procedure'
    END as procedureName,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as procedureDate,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as performedBy,
    'Surgical procedure completed successfully' as notes
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3
) d
WHERE p.voided = 0
LIMIT 30;

-- ============================================
-- 5. LABORATORY TESTS
-- ============================================
-- Create 200 lab test orders over the last 3 months
-- Get max lab order number to avoid duplicates
SET @max_lab_num = COALESCE((SELECT CAST(SUBSTRING_INDEX(orderNumber, '-', -1) AS UNSIGNED) FROM lab_test_orders WHERE orderNumber LIKE 'LAB-%' ORDER BY CAST(SUBSTRING_INDEX(orderNumber, '-', -1) AS UNSIGNED) DESC LIMIT 1), 0);

INSERT INTO lab_test_orders (orderNumber, patientId, orderedBy, orderDate, priority, status, clinicalIndication)
SELECT
    CONCAT('LAB-', LPAD((@max_lab_num := @max_lab_num + 1), 6, '0')) as orderNumber,
    p.patientId,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as orderedBy,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as orderDate,
    CASE WHEN RAND() < 0.1 THEN 'stat' WHEN RAND() < 0.3 THEN 'urgent' ELSE 'routine' END as priority,
    CASE WHEN RAND() < 0.7 THEN 'completed' WHEN RAND() < 0.9 THEN 'in_progress' ELSE 'pending' END as status,
    CASE
        WHEN RAND() < 0.2 THEN 'Malaria screening'
        WHEN RAND() < 0.4 THEN 'Complete blood count'
        WHEN RAND() < 0.6 THEN 'Blood glucose'
        WHEN RAND() < 0.8 THEN 'HIV test'
        ELSE 'Routine checkup'
    END as clinicalIndication
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) d
WHERE p.voided = 0
LIMIT 200;

-- Add lab test items for each order
INSERT INTO lab_test_order_items (orderId, testTypeId, status, notes)
SELECT
    lo.orderId,
    ltt.testTypeId,
    CASE WHEN lo.status = 'completed' THEN 'completed' WHEN lo.status = 'in_progress' THEN 'in_progress' ELSE 'pending' END as status,
    'Test ordered' as notes
FROM lab_test_orders lo
CROSS JOIN lab_test_types ltt
WHERE lo.orderDate >= @start_date_3_months_ago
  AND ltt.isActive = 1
  AND RAND() < 0.3 -- Each order has 30% chance of having each test type
LIMIT 300;

-- ============================================
-- 6. RADIOLOGY EXAMINATIONS
-- ============================================
-- Create 80 radiology exam orders over the last 3 months
-- Get a radiology exam type
SET @exam_type1 = (SELECT examTypeId FROM radiology_exam_types WHERE isActive = 1 LIMIT 1);
SET @exam_type1 = COALESCE(@exam_type1, 1);
-- Get max radiology order number to avoid duplicates
SET @max_rad_num = COALESCE((SELECT CAST(SUBSTRING_INDEX(orderNumber, '-', -1) AS UNSIGNED) FROM radiology_exam_orders WHERE orderNumber LIKE 'RAD-%' ORDER BY CAST(SUBSTRING_INDEX(orderNumber, '-', -1) AS UNSIGNED) DESC LIMIT 1), 0);

INSERT INTO radiology_exam_orders (orderNumber, patientId, orderedBy, orderDate, examTypeId, bodyPart, priority, status, clinicalIndication)
SELECT
    CONCAT('RAD-', LPAD((@max_rad_num := @max_rad_num + 1), 6, '0')) as orderNumber,
    p.patientId,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as orderedBy,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as orderDate,
    @exam_type1 as examTypeId,
    CASE
        WHEN RAND() < 0.3 THEN 'Chest'
        WHEN RAND() < 0.6 THEN 'Abdomen'
        WHEN RAND() < 0.8 THEN 'Head'
        ELSE 'Other'
    END as bodyPart,
    CASE WHEN RAND() < 0.1 THEN 'stat' WHEN RAND() < 0.3 THEN 'urgent' ELSE 'routine' END as priority,
    CASE WHEN RAND() < 0.6 THEN 'completed' WHEN RAND() < 0.8 THEN 'in_progress' ELSE 'pending' END as status,
    CASE
        WHEN RAND() < 0.3 THEN 'Chest X-ray'
        WHEN RAND() < 0.6 THEN 'Abdominal X-ray'
        WHEN RAND() < 0.8 THEN 'Ultrasound'
        ELSE 'Other imaging'
    END as clinicalIndication
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
) d
CROSS JOIN (SELECT @row_rad := 0) r
WHERE p.voided = 0
LIMIT 80;

-- ============================================
-- 7. PHARMACY PRESCRIPTIONS
-- ============================================
-- Create 180 prescriptions over the last 3 months
-- Get max prescription number to avoid duplicates
SET @max_presc_num = COALESCE((SELECT CAST(SUBSTRING_INDEX(prescriptionNumber, '-', -1) AS UNSIGNED) FROM prescriptions WHERE prescriptionNumber LIKE 'PRESC-%' ORDER BY CAST(SUBSTRING_INDEX(prescriptionNumber, '-', -1) AS UNSIGNED) DESC LIMIT 1), 0);

INSERT INTO prescriptions (prescriptionNumber, patientId, doctorId, prescriptionDate, status, notes, createdBy)
SELECT
    CONCAT('PRESC-', LPAD((@max_presc_num := @max_presc_num + 1), 6, '0')) as prescriptionNumber,
    p.patientId,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as doctorId,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as prescriptionDate,
    CASE WHEN RAND() < 0.7 THEN 'dispensed' WHEN RAND() < 0.9 THEN 'pending' ELSE 'cancelled' END as status,
    'Prescription for patient treatment' as notes,
    @doctor1 as createdBy
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) d
CROSS JOIN (SELECT @row_presc := 0) r
WHERE p.voided = 0
LIMIT 180;

-- ============================================
-- MOH 705 - MORBIDITY DATA
-- ============================================
-- Add diagnosis data to medical records for morbidity tracking
-- Update existing medical records with common diagnoses
UPDATE medical_records
SET diagnosis = CASE
    WHEN RAND() < 0.15 THEN 'Malaria'
    WHEN RAND() < 0.30 THEN 'Upper Respiratory Tract Infection'
    WHEN RAND() < 0.45 THEN 'Acute Diarrhea'
    WHEN RAND() < 0.55 THEN 'Dermatitis'
    WHEN RAND() < 0.65 THEN 'Conjunctivitis'
    WHEN RAND() < 0.75 THEN 'Trauma/Injury'
    ELSE 'Other Condition'
END
WHERE visitDate >= @start_date_3_months_ago
  AND (diagnosis IS NULL OR diagnosis = '');

-- Create additional medical records with specific diagnoses
INSERT INTO medical_records (patientId, visitDate, visitType, department, chiefComplaint, diagnosis, doctorId, createdBy)
SELECT
    p.patientId,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as visitDate,
    'Outpatient' as visitType,
    'General Medicine' as department,
    CASE
        WHEN RAND() < 0.15 THEN 'Fever and chills'
        WHEN RAND() < 0.30 THEN 'Cough and difficulty breathing'
        WHEN RAND() < 0.45 THEN 'Diarrhea and dehydration'
        WHEN RAND() < 0.55 THEN 'Skin rash'
        WHEN RAND() < 0.65 THEN 'Eye redness and discharge'
        WHEN RAND() < 0.75 THEN 'Pain from injury'
        ELSE 'General complaint'
    END as chiefComplaint,
    CASE
        WHEN RAND() < 0.15 THEN 'Malaria'
        WHEN RAND() < 0.30 THEN 'Upper Respiratory Tract Infection'
        WHEN RAND() < 0.45 THEN 'Acute Diarrhea'
        WHEN RAND() < 0.55 THEN 'Dermatitis'
        WHEN RAND() < 0.65 THEN 'Conjunctivitis'
        WHEN RAND() < 0.75 THEN 'Trauma/Injury'
        ELSE 'Other Condition'
    END as diagnosis,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as doctorId,
    @doctor1 as createdBy
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) d
WHERE p.voided = 0
LIMIT 200;

-- ============================================
-- MOH 708 - MATERNAL & CHILD HEALTH DATA
-- ============================================
-- Antenatal visits are already in maternity_admissions
-- Deliveries are already created above
-- Create postnatal visits (only if deliveries exist)
-- Note: Postnatal visits require deliveries, which require maternity_admissions
SET @delivery_count = (SELECT COUNT(*) FROM deliveries WHERE deliveryDate >= @start_date_3_months_ago);

SET @sql_postnatal = IF(@delivery_count > 0,
    CONCAT('INSERT INTO postnatal_visits (deliveryId, motherPatientId, visitDate, visitType, findings, nextAppointmentDate, notes)
    SELECT
        d.deliveryId,
        a.patientId as motherPatientId,
        DATE_ADD(d.deliveryDate, INTERVAL FLOOR(7 + RAND() * 14) DAY) as visitDate,
        CASE WHEN RAND() < 0.2 THEN ''day1'' WHEN RAND() < 0.4 THEN ''day3'' WHEN RAND() < 0.6 THEN ''day7'' WHEN RAND() < 0.8 THEN ''week6'' ELSE ''other'' END as visitType,
        ''Mother and baby doing well'' as findings,
        DATE_ADD(d.deliveryDate, INTERVAL FLOOR(28 + RAND() * 7) DAY) as nextAppointmentDate,
        ''Postnatal checkup'' as notes
    FROM deliveries d
    INNER JOIN maternity_admissions ma ON d.maternityAdmissionId = ma.admissionId
    INNER JOIN admissions a ON ma.admissionId = a.admissionId
    WHERE d.deliveryDate >= ''', @start_date_3_months_ago, '''
    LIMIT 20'),
    'SELECT "No deliveries found, skipping postnatal visits" as message');

PREPARE stmt_postnatal FROM @sql_postnatal;
EXECUTE stmt_postnatal;
DEALLOCATE PREPARE stmt_postnatal;

-- Create child health clinic visits (for children under 5)
INSERT INTO medical_records (patientId, visitDate, visitType, department, chiefComplaint, diagnosis, doctorId, createdBy)
SELECT
    p.patientId,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as visitDate,
    'Outpatient' as visitType,
    'Pediatrics' as department,
    'Child health checkup' as chiefComplaint,
    'Well child visit' as diagnosis,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as doctorId,
    @doctor1 as createdBy
FROM patients p
WHERE p.voided = 0
  AND p.dateOfBirth IS NOT NULL
  AND DATEDIFF(CURDATE(), p.dateOfBirth) < 1825 -- Under 5 years
LIMIT 60;

-- ============================================
-- MOH 711 - IMMUNIZATION DATA
-- ============================================
-- Note: This would typically be in a separate immunization table
-- For now, we'll create medical records with immunization notes
INSERT INTO medical_records (patientId, visitDate, visitType, department, chiefComplaint, diagnosis, treatment, notes, doctorId, createdBy)
SELECT
    p.patientId,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as visitDate,
    'Outpatient' as visitType,
    'Immunization' as department,
    'Vaccination' as chiefComplaint,
    'Immunization' as diagnosis,
    CASE
        WHEN RAND() < 0.15 THEN 'BCG'
        WHEN RAND() < 0.30 THEN 'OPV'
        WHEN RAND() < 0.45 THEN 'DPT'
        WHEN RAND() < 0.60 THEN 'Measles'
        WHEN RAND() < 0.70 THEN 'Tetanus Toxoid'
        WHEN RAND() < 0.85 THEN 'Hepatitis B'
        ELSE 'Pentavalent'
    END as treatment,
    'Vaccination administered' as notes,
    @nurse1 as doctorId,
    @nurse1 as createdBy
FROM patients p
WHERE p.voided = 0
  AND p.dateOfBirth IS NOT NULL
  AND DATEDIFF(CURDATE(), p.dateOfBirth) < 1825 -- Under 5 years
LIMIT 120;

-- ============================================
-- MOH 731+ - KEY POPULATIONS DATA
-- ============================================
-- HIV Testing: Create lab test orders for HIV
-- Get max HIV lab order number to avoid duplicates
SET @max_hiv_num = COALESCE((SELECT CAST(SUBSTRING_INDEX(orderNumber, '-', -1) AS UNSIGNED) FROM lab_test_orders WHERE orderNumber LIKE 'LAB-HIV-%' ORDER BY CAST(SUBSTRING_INDEX(orderNumber, '-', -1) AS UNSIGNED) DESC LIMIT 1), 0);

INSERT INTO lab_test_orders (orderNumber, patientId, orderedBy, orderDate, priority, status, clinicalIndication)
SELECT
    CONCAT('LAB-HIV-', LPAD((@max_hiv_num := @max_hiv_num + 1), 6, '0')) as orderNumber,
    p.patientId,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as orderedBy,
    DATE_ADD(@start_date_3_months_ago, INTERVAL FLOOR(RAND() * 90) DAY) as orderDate,
    'routine' as priority,
    CASE WHEN RAND() < 0.8 THEN 'completed' ELSE 'pending' END as status,
    'HIV testing' as clinicalIndication
FROM patients p
CROSS JOIN (
    SELECT 1 as date_seq UNION SELECT 2
) d
CROSS JOIN (SELECT @row_hiv := 0) r
WHERE p.voided = 0
LIMIT 80;

-- Add HIV test items
INSERT INTO lab_test_order_items (orderId, testTypeId, status, notes)
SELECT
    lo.orderId,
    ltt.testTypeId,
    lo.status,
    'HIV test' as notes
FROM lab_test_orders lo
CROSS JOIN lab_test_types ltt
WHERE lo.clinicalIndication = 'HIV testing'
  AND ltt.testName LIKE '%HIV%'
LIMIT 80;

-- ============================================
-- Summary Statistics
-- ============================================
SELECT 'MOH Reports Sample Data Inserted' as Status;
SELECT
    'Outpatient Visits' as Category,
    COUNT(*) as Count
FROM queue_entries
WHERE servicePoint = 'consultation'
  AND arrivalTime >= @start_date_3_months_ago
UNION ALL
SELECT
    'Inpatient Admissions' as Category,
    COUNT(*) as Count
FROM admissions
WHERE admissionDate >= @start_date_3_months_ago
UNION ALL
SELECT
    'Deliveries' as Category,
    COUNT(*) as Count
FROM deliveries
WHERE deliveryDate >= @start_date_3_months_ago
UNION ALL
SELECT
    'Surgical Procedures' as Category,
    COUNT(*) as Count
FROM patient_procedures
WHERE procedureDate >= @start_date_3_months_ago
UNION ALL
SELECT
    'Laboratory Tests' as Category,
    COUNT(*) as Count
FROM lab_test_orders
WHERE orderDate >= @start_date_3_months_ago
UNION ALL
SELECT
    'Radiology Exams' as Category,
    COUNT(*) as Count
FROM radiology_exam_orders
WHERE orderDate >= @start_date_3_months_ago
UNION ALL
SELECT
    'Prescriptions' as Category,
    COUNT(*) as Count
FROM prescriptions
WHERE prescriptionDate >= @start_date_3_months_ago
UNION ALL
SELECT
    'Medical Records' as Category,
    COUNT(*) as Count
FROM medical_records
WHERE visitDate >= @start_date_3_months_ago;

