-- ============================================
-- INPATIENT MANAGEMENT SAMPLE DATA
-- ============================================
-- This script creates sample data for testing the Inpatient Management component:
-- - Active admissions
-- - Doctor reviews/rounds
-- - Nursing care notes
-- - Vitals schedules (4x daily)
-- - Vital signs records
-- - Links existing procedures, labs, prescriptions to admissions

-- Set variables for date ranges
SET @today = CURDATE();
SET @yesterday = DATE_SUB(@today, INTERVAL 1 DAY);
SET @two_days_ago = DATE_SUB(@today, INTERVAL 2 DAY);
SET @three_days_ago = DATE_SUB(@today, INTERVAL 3 DAY);
SET @one_week_ago = DATE_SUB(@today, INTERVAL 7 DAY);

-- Get some existing data
SET @doctor1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1);
SET @doctor2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1 OFFSET 1);
SET @nurse1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1);
SET @nurse2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1 OFFSET 1);

-- If no doctors/nurses exist, use first user
SET @doctor1 = COALESCE(@doctor1, (SELECT userId FROM users LIMIT 1));
SET @doctor2 = COALESCE(@doctor2, @doctor1);
SET @nurse1 = COALESCE(@nurse1, @doctor1);
SET @nurse2 = COALESCE(@nurse2, @nurse1);

-- Get some patients
SET @patient1 = (SELECT patientId FROM patients LIMIT 1);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);
SET @patient4 = (SELECT patientId FROM patients LIMIT 1 OFFSET 3);

-- Get available beds
SET @bed1 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1);
SET @bed2 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 1);
SET @bed3 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 2);
SET @bed4 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 3);

-- If no available beds, get any beds
SET @bed1 = COALESCE(@bed1, (SELECT bedId FROM beds LIMIT 1));
SET @bed2 = COALESCE(@bed2, (SELECT bedId FROM beds LIMIT 1 OFFSET 1));
SET @bed3 = COALESCE(@bed3, (SELECT bedId FROM beds LIMIT 1 OFFSET 2));
SET @bed4 = COALESCE(@bed4, (SELECT bedId FROM beds LIMIT 1 OFFSET 3));

-- ============================================
-- 1. CREATE ADMISSIONS (if they don't exist)
-- ============================================
-- Check if we have any active admissions, if not create some
SET @admission_count = (SELECT COUNT(*) FROM admissions WHERE status = 'admitted');

-- Create admissions if needed
INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
SELECT
    CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((@row_num := @row_num + 1), 5, '0')) as admissionNumber,
    p.patientId,
    b.bedId,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 7) DAY) as admissionDate,
    @doctor1 as admittingDoctorId,
    CASE
        WHEN RAND() < 0.25 THEN 'Pneumonia'
        WHEN RAND() < 0.5 THEN 'Hypertension'
        WHEN RAND() < 0.75 THEN 'Diabetes Mellitus Type 2'
        ELSE 'Acute Gastroenteritis'
    END as admissionDiagnosis,
    CASE
        WHEN RAND() < 0.5 THEN 'Severe symptoms requiring monitoring'
        ELSE 'Post-operative care'
    END as admissionReason,
    DATE_ADD(CURDATE(), INTERVAL FLOOR(3 + RAND() * 5) DAY) as expectedDischargeDate,
    'admitted' as status,
    'Sample admission for testing inpatient management' as notes,
    @doctor1 as createdBy
FROM patients p
CROSS JOIN beds b
CROSS JOIN (SELECT @row_num := (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%'))) r
WHERE p.patientId IN (@patient1, @patient2, @patient3, @patient4)
  AND b.bedId IN (@bed1, @bed2, @bed3, @bed4)
  AND @admission_count < 4
LIMIT 4;

-- Update bed status to occupied for new admissions
UPDATE beds b
INNER JOIN admissions a ON b.bedId = a.bedId
SET b.status = 'occupied'
WHERE a.status = 'admitted'
  AND b.status = 'available';

-- ============================================
-- 2. CREATE DOCTOR REVIEWS
-- ============================================
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate)
SELECT
    a.admissionId,
    DATE_ADD(a.admissionDate, INTERVAL FLOOR(RAND() * DATEDIFF(CURDATE(), a.admissionDate)) DAY) + INTERVAL FLOOR(8 + RAND() * 8) HOUR as reviewDate,
    CASE WHEN RAND() < 0.5 THEN @doctor1 ELSE @doctor2 END as reviewingDoctorId,
    CASE
        WHEN HOUR(DATE_ADD(a.admissionDate, INTERVAL FLOOR(RAND() * DATEDIFF(CURDATE(), a.admissionDate)) DAY) + INTERVAL FLOOR(8 + RAND() * 8) HOUR) < 12 THEN 'morning_round'
        WHEN HOUR(DATE_ADD(a.admissionDate, INTERVAL FLOOR(RAND() * DATEDIFF(CURDATE(), a.admissionDate)) DAY) + INTERVAL FLOOR(8 + RAND() * 8) HOUR) < 18 THEN 'evening_round'
        ELSE 'consultation'
    END as reviewType,
    CONCAT('Patient reports ',
        CASE WHEN RAND() < 0.33 THEN 'improved breathing'
             WHEN RAND() < 0.66 THEN 'reduced pain'
             ELSE 'stable condition'
        END,
        '. No new complaints.') as subjective,
    CONCAT('Vital signs stable. ',
        CASE WHEN RAND() < 0.5 THEN 'Lungs clear bilaterally. Heart sounds regular.'
             ELSE 'Abdomen soft, non-tender. No signs of infection.'
        END) as objective,
    CONCAT('Patient showing ',
        CASE WHEN RAND() < 0.5 THEN 'good progress'
             ELSE 'steady improvement'
        END,
        '. Continue current management.') as assessment,
    CONCAT('Continue current medications. ',
        CASE WHEN RAND() < 0.5 THEN 'Monitor vital signs 4x daily.'
             ELSE 'Consider discharge planning if condition remains stable.'
        END) as plan,
    'Routine review' as notes,
    DATE_ADD(DATE_ADD(a.admissionDate, INTERVAL FLOOR(RAND() * DATEDIFF(CURDATE(), a.admissionDate)) DAY) + INTERVAL FLOOR(8 + RAND() * 8) HOUR, INTERVAL 1 DAY) as nextReviewDate
FROM admissions a
CROSS JOIN (SELECT 1 as n UNION SELECT 2 UNION SELECT 3) days
WHERE a.status = 'admitted'
  AND DATEDIFF(CURDATE(), a.admissionDate) > 0
  AND (SELECT COUNT(*) FROM inpatient_doctor_reviews WHERE admissionId = a.admissionId) < 5
LIMIT 20;

-- ============================================
-- 3. CREATE NURSING CARE NOTES
-- ============================================
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes)
SELECT
    a.admissionId,
    DATE_ADD(
        DATE_ADD(a.admissionDate, INTERVAL FLOOR(RAND() * DATEDIFF(CURDATE(), a.admissionDate)) DAY),
        INTERVAL (CASE
            WHEN RAND() < 0.33 THEN 6
            WHEN RAND() < 0.66 THEN 14
            ELSE 22
        END) HOUR
    ) as careDate,
    CASE WHEN RAND() < 0.5 THEN @nurse1 ELSE @nurse2 END as nurseId,
    CASE
        WHEN RAND() < 0.2 THEN 'assessment'
        WHEN RAND() < 0.4 THEN 'medication'
        WHEN RAND() < 0.6 THEN 'procedure'
        WHEN RAND() < 0.8 THEN 'observation'
        ELSE 'other'
    END as careType,
    CASE
        WHEN RAND() < 0.33 THEN 'morning'
        WHEN RAND() < 0.66 THEN 'afternoon'
        ELSE 'night'
    END as shift,
    CASE WHEN RAND() < 0.7 THEN TRUE ELSE FALSE END as vitalSignsRecorded,
    CONCAT('Patient appears ',
        CASE WHEN RAND() < 0.5 THEN 'comfortable and resting'
             ELSE 'alert and responsive'
        END,
        '. ',
        CASE WHEN RAND() < 0.5 THEN 'Skin color normal.'
             ELSE 'No signs of distress observed.'
        END) as observations,
    CONCAT('Administered medications as prescribed. ',
        CASE WHEN RAND() < 0.5 THEN 'Assisted with activities of daily living.'
             ELSE 'Positioned patient comfortably.'
        END) as interventions,
    CONCAT('Patient ',
        CASE WHEN RAND() < 0.5 THEN 'tolerated care well'
             ELSE 'cooperative with nursing interventions'
        END) as patientResponse,
    CASE WHEN RAND() < 0.2 THEN 'No concerns at this time' ELSE NULL END as concerns,
    'Routine nursing care provided' as notes
FROM admissions a
CROSS JOIN (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) shifts
WHERE a.status = 'admitted'
  AND DATEDIFF(CURDATE(), a.admissionDate) > 0
  AND (SELECT COUNT(*) FROM inpatient_nursing_care WHERE admissionId = a.admissionId) < 15
LIMIT 40;

-- ============================================
-- 4. CREATE VITALS SCHEDULES (4x daily)
-- ============================================
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
SELECT
    a.admissionId,
    CURDATE() as scheduleDate,
    '06:00:00' as scheduledTime1,
    '12:00:00' as scheduledTime2,
    '18:00:00' as scheduledTime3,
    '00:00:00' as scheduledTime4,
    '4x' as frequency,
    TRUE as isActive,
    'Standard 4x daily vital signs monitoring' as notes
FROM admissions a
WHERE a.status = 'admitted'
  AND NOT EXISTS (
      SELECT 1 FROM inpatient_vitals_schedule
      WHERE admissionId = a.admissionId
      AND scheduleDate = CURDATE()
      AND isActive = 1
  );

-- ============================================
-- 5. CREATE VITAL SIGNS RECORDS
-- ============================================
INSERT INTO vital_signs (patientId, admissionId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, recordedBy, notes)
SELECT
    a.patientId,
    a.admissionId,
    DATE_ADD(
        DATE_ADD(a.admissionDate, INTERVAL FLOOR(RAND() * DATEDIFF(CURDATE(), a.admissionDate)) DAY),
        INTERVAL (CASE
            WHEN RAND() < 0.25 THEN 6
            WHEN RAND() < 0.5 THEN 12
            WHEN RAND() < 0.75 THEN 18
            ELSE 0
        END) HOUR
    ) as recordedDate,
    110 + FLOOR(RAND() * 30) as systolicBP,  -- 110-140
    70 + FLOOR(RAND() * 15) as diastolicBP,   -- 70-85
    65 + FLOOR(RAND() * 20) as heartRate,     -- 65-85
    14 + FLOOR(RAND() * 6) as respiratoryRate, -- 14-20
    36.0 + (RAND() * 1.5) as temperature,     -- 36.0-37.5
    95 + (RAND() * 4) as oxygenSaturation,    -- 95-99
    FLOOR(RAND() * 4) as painScore,           -- 0-3
    'admission' as context,
    CASE WHEN RAND() < 0.5 THEN @nurse1 ELSE @nurse2 END as recordedBy,
    'Routine vital signs check' as notes
FROM admissions a
CROSS JOIN (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) vitals
WHERE a.status = 'admitted'
  AND DATEDIFF(CURDATE(), a.admissionDate) > 0
  AND (SELECT COUNT(*) FROM vital_signs WHERE admissionId = a.admissionId) < 20
LIMIT 50;

-- ============================================
-- 6. LINK EXISTING PROCEDURES TO ADMISSIONS
-- ============================================
UPDATE patient_procedures pp
INNER JOIN admissions a ON pp.patientId = a.patientId
SET pp.admissionId = a.admissionId
WHERE pp.admissionId IS NULL
  AND a.status = 'admitted'
  AND DATE(pp.procedureDate) >= DATE(a.admissionDate)
  AND DATE(pp.procedureDate) <= CURDATE();

-- ============================================
-- 7. LINK EXISTING LAB ORDERS TO ADMISSIONS
-- ============================================
UPDATE lab_test_orders lo
INNER JOIN admissions a ON lo.patientId = a.patientId
SET lo.admissionId = a.admissionId
WHERE lo.admissionId IS NULL
  AND a.status = 'admitted'
  AND DATE(lo.orderDate) >= DATE(a.admissionDate)
  AND DATE(lo.orderDate) <= CURDATE();

-- ============================================
-- 8. LINK EXISTING PRESCRIPTIONS TO ADMISSIONS
-- ============================================
UPDATE prescriptions p
INNER JOIN admissions a ON p.patientId = a.patientId
SET p.admissionId = a.admissionId
WHERE p.admissionId IS NULL
  AND a.status = 'admitted'
  AND DATE(p.prescriptionDate) >= DATE(a.admissionDate)
  AND DATE(p.prescriptionDate) <= CURDATE();

-- ============================================
-- 9. LINK EXISTING MEDICAL RECORDS TO ADMISSIONS
-- ============================================
UPDATE medical_records mr
INNER JOIN admissions a ON mr.patientId = a.patientId
SET mr.admissionId = a.admissionId
WHERE mr.admissionId IS NULL
  AND a.status = 'admitted'
  AND DATE(mr.visitDate) >= DATE(a.admissionDate)
  AND DATE(mr.visitDate) <= CURDATE();

-- ============================================
-- SUMMARY
-- ============================================
SELECT
    'Sample Data Created' as Status,
    (SELECT COUNT(*) FROM admissions WHERE status = 'admitted') as ActiveAdmissions,
    (SELECT COUNT(*) FROM inpatient_doctor_reviews) as DoctorReviews,
    (SELECT COUNT(*) FROM inpatient_nursing_care) as NursingCareNotes,
    (SELECT COUNT(*) FROM inpatient_vitals_schedule WHERE isActive = 1) as VitalsSchedules,
    (SELECT COUNT(*) FROM vital_signs WHERE admissionId IS NOT NULL) as VitalSignsRecords,
    (SELECT COUNT(*) FROM patient_procedures WHERE admissionId IS NOT NULL) as LinkedProcedures,
    (SELECT COUNT(*) FROM lab_test_orders WHERE admissionId IS NOT NULL) as LinkedLabOrders,
    (SELECT COUNT(*) FROM prescriptions WHERE admissionId IS NOT NULL) as LinkedPrescriptions;

