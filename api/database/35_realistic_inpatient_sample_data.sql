-- ============================================
-- REALISTIC INPATIENT SAMPLE DATA
-- ============================================
-- This script creates realistic, detailed sample data for a few patients
-- with proper medical scenarios, timelines, and clinical documentation

-- Set variables
SET @today = CURDATE();
SET @yesterday = DATE_SUB(@today, INTERVAL 1 DAY);
SET @two_days_ago = DATE_SUB(@today, INTERVAL 2 DAY);
SET @three_days_ago = DATE_SUB(@today, INTERVAL 3 DAY);
SET @five_days_ago = DATE_SUB(@today, INTERVAL 5 DAY);

-- Get users
SET @doctor1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1);
SET @doctor2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1 OFFSET 1);
SET @nurse1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1);
SET @nurse2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1 OFFSET 1);

SET @doctor1 = COALESCE(@doctor1, (SELECT userId FROM users LIMIT 1));
SET @doctor2 = COALESCE(@doctor2, @doctor1);
SET @nurse1 = COALESCE(@nurse1, @doctor1);
SET @nurse2 = COALESCE(@nurse2, @nurse1);

-- Get first 3 patients
SET @patient1 = (SELECT patientId FROM patients LIMIT 1);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);

-- Get available beds
SET @bed1 = (SELECT bedId FROM beds WHERE status = 'available' OR status = 'occupied' LIMIT 1);
SET @bed2 = (SELECT bedId FROM beds WHERE status = 'available' OR status = 'occupied' LIMIT 1 OFFSET 1);
SET @bed3 = (SELECT bedId FROM beds WHERE status = 'available' OR status = 'occupied' LIMIT 1 OFFSET 2);

SET @bed1 = COALESCE(@bed1, (SELECT bedId FROM beds LIMIT 1));
SET @bed2 = COALESCE(@bed2, (SELECT bedId FROM beds LIMIT 1 OFFSET 1));
SET @bed3 = COALESCE(@bed3, (SELECT bedId FROM beds LIMIT 1 OFFSET 2));

-- ============================================
-- PATIENT 1: 65-year-old with Pneumonia
-- ============================================
-- Admission (only if doesn't exist)
INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
SELECT
    CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) + 1 FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%')), 5, '0')),
    @patient1,
    @bed1,
    @three_days_ago + INTERVAL 14 HOUR,
    @doctor1,
    'Community-Acquired Pneumonia',
    'Patient presented with 5-day history of productive cough, fever (38.5°C), and shortness of breath. Chest X-ray shows right lower lobe consolidation. Oxygen saturation 88% on room air.',
    @today + INTERVAL 2 DAY,
    'admitted',
    'Patient admitted for IV antibiotics and oxygen therapy. Monitor respiratory status closely.',
    @doctor1
WHERE NOT EXISTS (SELECT 1 FROM admissions WHERE patientId = @patient1 AND status = 'admitted');

SET @admission1 = (SELECT admissionId FROM admissions WHERE patientId = @patient1 AND status = 'admitted' ORDER BY admissionDate DESC LIMIT 1);

UPDATE beds SET status = 'occupied' WHERE bedId = @bed1 AND @admission1 IS NOT NULL;

-- Doctor Reviews for Patient 1
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate)
VALUES
(@admission1, @three_days_ago + INTERVAL 15 HOUR, @doctor1, 'morning_round',
 'Patient reports persistent cough but feels slightly better. Appetite improving. No chest pain.',
 'Vital signs: BP 135/85, HR 88, RR 20, Temp 37.8°C, SpO2 92% on 2L O2. Chest: Decreased air entry right lower lobe, few crepitations. Heart sounds regular.',
 'Pneumonia responding to treatment. Oxygen requirements decreasing.',
 'Continue IV Ceftriaxone 1g BD. Continue O2 at 2L/min. Monitor SpO2. Consider switching to oral antibiotics if condition continues to improve.',
 'Good progress', @three_days_ago + INTERVAL 39 HOUR),

(@admission1, @two_days_ago + INTERVAL 9 HOUR, @doctor1, 'morning_round',
 'Patient feeling much better. Cough less frequent. Able to walk short distances without dyspnea.',
 'Vital signs: BP 130/80, HR 82, RR 18, Temp 37.2°C, SpO2 94% on room air. Chest: Air entry improved bilaterally, minimal crepitations.',
 'Significant improvement. Patient ready for step-down care.',
 'Switch to oral Amoxicillin-Clavulanate 625mg TDS. Discontinue oxygen. Continue monitoring. Plan discharge in 2 days if condition remains stable.',
 'Excellent response to treatment', @two_days_ago + INTERVAL 33 HOUR),

(@admission1, @yesterday + INTERVAL 10 HOUR, @doctor1, 'morning_round',
 'Patient reports feeling well. Minimal cough. No fever. Appetite normal.',
 'Vital signs: BP 128/78, HR 78, RR 16, Temp 36.8°C, SpO2 96% on room air. Chest: Clear bilaterally.',
 'Patient recovered. Ready for discharge.',
 'Complete course of oral antibiotics. Discharge tomorrow with follow-up in 1 week. Provide discharge medications and instructions.',
 'Patient ready for discharge', @today + INTERVAL 10 HOUR);

-- Nursing Care for Patient 1
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes)
VALUES
(@admission1, @three_days_ago + INTERVAL 6 HOUR, @nurse1, 'observation', 'morning', TRUE,
 'Patient appears comfortable. Oxygen mask in place. Slight dyspnea on exertion.',
 'Recorded vital signs. Administered IV antibiotics. Positioned patient in semi-Fowler position. Provided oxygen therapy.',
 'Patient cooperative. Tolerated interventions well.',
 NULL, 'Routine morning care'),

(@admission1, @three_days_ago + INTERVAL 14 HOUR, @nurse2, 'medication', 'afternoon', TRUE,
 'Patient resting. Oxygen saturation stable. Cough productive with yellow sputum.',
 'Administered IV Ceftriaxone. Provided nebulization. Encouraged deep breathing exercises.',
 'Patient responded well to nebulization. Sputum production increased.',
 NULL, 'Medications given as prescribed'),

(@admission1, @three_days_ago + INTERVAL 22 HOUR, @nurse1, 'observation', 'night', TRUE,
 'Patient sleeping comfortably. Oxygen saturation maintained above 90%.',
 'Night round completed. Vital signs stable. Patient positioned comfortably.',
 'Patient sleeping well.',
 NULL, 'Quiet night'),

(@admission1, @two_days_ago + INTERVAL 6 HOUR, @nurse1, 'observation', 'morning', TRUE,
 'Patient looks better. More alert. Oxygen requirements decreased.',
 'Recorded vital signs. Administered medications. Assisted with morning care.',
 'Patient more active. Participating in care.',
 NULL, 'Improvement noted'),

(@admission1, @yesterday + INTERVAL 14 HOUR, @nurse2, 'observation', 'afternoon', TRUE,
 'Patient ambulating in room. No oxygen required. Appetite good.',
 'Discontinued oxygen therapy. Administered oral medications. Encouraged ambulation.',
 'Patient very happy to be off oxygen. Walking without difficulty.',
 NULL, 'Significant improvement');

-- Vitals Schedule for Patient 1
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
VALUES (@admission1, CURDATE(), '06:00:00', '12:00:00', '18:00:00', '00:00:00', '4x', TRUE, 'Standard monitoring')
ON DUPLICATE KEY UPDATE isActive = 1;

-- Vital Signs for Patient 1
INSERT INTO vital_signs (patientId, admissionId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, recordedBy, notes)
VALUES
(@patient1, @admission1, @three_days_ago + INTERVAL 6 HOUR, 140, 90, 95, 22, 38.5, 88, 3, 'admission', @nurse1, 'Initial vitals on admission'),
(@patient1, @admission1, @three_days_ago + INTERVAL 12 HOUR, 138, 88, 92, 21, 38.2, 90, 2, 'admission', @nurse2, 'After oxygen therapy'),
(@patient1, @admission1, @three_days_ago + INTERVAL 18 HOUR, 135, 85, 88, 20, 37.8, 92, 2, 'admission', @nurse1, 'Evening vitals'),
(@patient1, @admission1, @two_days_ago + INTERVAL 6 HOUR, 135, 85, 88, 20, 37.8, 92, 1, 'admission', @nurse1, 'Morning vitals - improving'),
(@patient1, @admission1, @two_days_ago + INTERVAL 12 HOUR, 132, 82, 85, 19, 37.5, 94, 1, 'admission', @nurse2, 'Afternoon vitals'),
(@patient1, @admission1, @two_days_ago + INTERVAL 18 HOUR, 130, 80, 82, 18, 37.2, 94, 0, 'admission', @nurse1, 'Evening vitals - oxygen discontinued'),
(@patient1, @admission1, @yesterday + INTERVAL 6 HOUR, 130, 80, 82, 18, 37.2, 96, 0, 'admission', @nurse1, 'Morning vitals - stable'),
(@patient1, @admission1, @yesterday + INTERVAL 12 HOUR, 128, 78, 78, 16, 36.8, 96, 0, 'admission', @nurse2, 'Afternoon vitals - normal'),
(@patient1, @admission1, @yesterday + INTERVAL 18 HOUR, 128, 78, 78, 16, 36.8, 96, 0, 'admission', @nurse1, 'Evening vitals - ready for discharge');

-- ============================================
-- PATIENT 2: 45-year-old with Hypertension Crisis
-- ============================================
INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
SELECT
    CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) + 1 FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%')), 5, '0')),
    @patient2,
    @bed2,
    @two_days_ago + INTERVAL 10 HOUR,
    @doctor2,
    'Hypertensive Urgency',
    'Patient presented with severe headache, BP 210/120 mmHg. Known hypertensive on irregular medications. No end-organ damage. Admitted for BP control and medication adjustment.',
    @today + INTERVAL 1 DAY,
    'admitted',
    'Monitor BP closely. Start on IV antihypertensives. Titrate to target BP < 140/90.',
    @doctor2
WHERE NOT EXISTS (SELECT 1 FROM admissions WHERE patientId = @patient2 AND status = 'admitted');

SET @admission2 = (SELECT admissionId FROM admissions WHERE patientId = @patient2 AND status = 'admitted' ORDER BY admissionDate DESC LIMIT 1);

UPDATE beds SET status = 'occupied' WHERE bedId = @bed2 AND @admission2 IS NOT NULL;

-- Doctor Reviews for Patient 2
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate)
VALUES
(@admission2, @two_days_ago + INTERVAL 11 HOUR, @doctor2, 'morning_round',
 'Patient reports severe headache has improved. Still feels slightly dizzy. No chest pain or visual disturbances.',
 'Vital signs: BP 180/110, HR 92, RR 18, Temp 36.8°C, SpO2 98%. Neurological exam: Alert, oriented. No focal deficits. Fundoscopy: Grade 1 hypertensive retinopathy.',
 'Hypertensive urgency responding to treatment. BP trending down.',
 'Continue IV Labetalol infusion. Monitor BP every 2 hours. Start oral Amlodipine 10mg OD. Consider discharge once BP stable on oral medications.',
 'Good response to IV antihypertensives', @two_days_ago + INTERVAL 35 HOUR),

(@admission2, @yesterday + INTERVAL 9 HOUR, @doctor2, 'morning_round',
 'Patient feeling much better. Headache resolved. No dizziness. BP well controlled.',
 'Vital signs: BP 145/95, HR 78, RR 16, Temp 36.6°C, SpO2 98%. Neurological exam: Normal.',
 'BP controlled. Patient stable on oral medications.',
 'Discontinue IV Labetalol. Continue oral Amlodipine 10mg OD and add Hydrochlorothiazide 12.5mg OD. Monitor BP. Plan discharge tomorrow if BP remains controlled.',
 'Excellent response', @today + INTERVAL 9 HOUR);

-- Nursing Care for Patient 2
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes)
VALUES
(@admission2, @two_days_ago + INTERVAL 6 HOUR, @nurse1, 'observation', 'morning', TRUE,
 'Patient alert but appears anxious. Complaining of severe headache. BP very high.',
 'Recorded vital signs. Started IV Labetalol infusion. Positioned patient comfortably. Provided reassurance.',
 'Patient calmer after reassurance. Headache improving.',
 NULL, 'Initial assessment and care'),

(@admission2, @two_days_ago + INTERVAL 14 HOUR, @nurse2, 'medication', 'afternoon', TRUE,
 'Patient more comfortable. Headache decreased. BP gradually decreasing.',
 'Monitored BP every 2 hours. Administered oral medications. Continued IV infusion.',
 'Patient responding well. BP trending down.',
 NULL, 'BP monitoring and medication administration'),

(@admission2, @two_days_ago + INTERVAL 22 HOUR, @nurse1, 'observation', 'night', TRUE,
 'Patient sleeping. BP stable. No complaints.',
 'Night round. BP checked. IV infusion running smoothly.',
 'Patient sleeping well.',
 NULL, 'Quiet night'),

(@admission2, @yesterday + INTERVAL 14 HOUR, @nurse2, 'medication', 'afternoon', TRUE,
 'Patient looks well. BP well controlled on oral medications.',
 'Discontinued IV. Administered oral antihypertensives. Educated patient on medication compliance.',
 'Patient understands importance of regular medications.',
 NULL, 'Transitioned to oral medications');

-- Vitals Schedule for Patient 2
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
VALUES (@admission2, CURDATE(), '06:00:00', '12:00:00', '18:00:00', '00:00:00', '4x', TRUE, 'Standard monitoring')
ON DUPLICATE KEY UPDATE isActive = 1;

-- Vital Signs for Patient 2
INSERT INTO vital_signs (patientId, admissionId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, recordedBy, notes)
VALUES
(@patient2, @admission2, @two_days_ago + INTERVAL 6 HOUR, 210, 120, 98, 20, 36.8, 98, 7, 'admission', @nurse1, 'Initial BP - very high'),
(@patient2, @admission2, @two_days_ago + INTERVAL 8 HOUR, 195, 115, 95, 19, 36.8, 98, 6, 'admission', @nurse1, 'After IV Labetalol started'),
(@patient2, @admission2, @two_days_ago + INTERVAL 12 HOUR, 180, 110, 92, 18, 36.7, 98, 4, 'admission', @nurse2, 'BP decreasing'),
(@patient2, @admission2, @two_days_ago + INTERVAL 18 HOUR, 170, 105, 88, 18, 36.6, 98, 2, 'admission', @nurse1, 'BP improving'),
(@patient2, @admission2, @yesterday + INTERVAL 6 HOUR, 160, 100, 85, 17, 36.6, 98, 1, 'admission', @nurse1, 'Morning vitals'),
(@patient2, @admission2, @yesterday + INTERVAL 12 HOUR, 145, 95, 78, 16, 36.6, 98, 0, 'admission', @nurse2, 'BP well controlled'),
(@patient2, @admission2, @yesterday + INTERVAL 18 HOUR, 142, 92, 76, 16, 36.5, 98, 0, 'admission', @nurse1, 'Evening vitals - stable');

-- ============================================
-- PATIENT 3: 28-year-old with Appendicitis (Post-op)
-- ============================================
INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
SELECT
    CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) + 1 FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%')), 5, '0')),
    @patient3,
    @bed3,
    @yesterday + INTERVAL 8 HOUR,
    @doctor1,
    'Acute Appendicitis - Post Appendectomy',
    'Patient underwent laparoscopic appendectomy yesterday. Surgery uneventful. Post-operative recovery in progress.',
    @today + INTERVAL 1 DAY,
    'admitted',
    'Post-operative care. Monitor wound site. Advance diet as tolerated. Plan discharge when tolerating oral intake and ambulating well.',
    @doctor1
WHERE NOT EXISTS (SELECT 1 FROM admissions WHERE patientId = @patient3 AND status = 'admitted');

SET @admission3 = (SELECT admissionId FROM admissions WHERE patientId = @patient3 AND status = 'admitted' ORDER BY admissionDate DESC LIMIT 1);

UPDATE beds SET status = 'occupied' WHERE bedId = @bed3 AND @admission3 IS NOT NULL;

-- Doctor Reviews for Patient 3
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate)
VALUES
(@admission3, @yesterday + INTERVAL 9 HOUR, @doctor1, 'morning_round',
 'Patient reports minimal pain at surgical site. Nausea resolved. Passing flatus. No fever.',
 'Vital signs: BP 120/75, HR 72, RR 16, Temp 37.1°C, SpO2 99%. Abdomen: Soft, non-tender. Surgical wounds clean and dry. Bowel sounds present.',
 'Post-operative recovery progressing well.',
 'Advance diet to soft foods. Encourage ambulation. Continue IV antibiotics. Remove IV when tolerating oral intake well. Plan discharge tomorrow if condition remains stable.',
 'Excellent post-op recovery', @today + INTERVAL 9 HOUR);

-- Nursing Care for Patient 3
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes)
VALUES
(@admission3, @yesterday + INTERVAL 6 HOUR, @nurse1, 'observation', 'morning', TRUE,
 'Patient alert and oriented. Surgical site clean. Minimal pain. Nausea present.',
 'Recorded vital signs. Assessed surgical wounds. Administered pain medications and anti-emetics. Assisted with ambulation.',
 'Patient ambulated to bathroom with assistance. Pain controlled.',
 NULL, 'Post-operative care'),

(@admission3, @yesterday + INTERVAL 14 HOUR, @nurse2, 'procedure', 'afternoon', TRUE,
 'Patient more comfortable. Nausea resolved. Passing flatus. Appetite improving.',
 'Advanced diet to clear liquids. Encouraged ambulation. Administered IV antibiotics. Dressed surgical wounds.',
 'Patient tolerating clear liquids. Ambulating well.',
 NULL, 'Diet advanced. Patient progressing well'),

(@admission3, @yesterday + INTERVAL 22 HOUR, @nurse1, 'observation', 'night', TRUE,
 'Patient sleeping comfortably. No complaints. Vital signs stable.',
 'Night round. Checked surgical site. Patient comfortable.',
 'Patient sleeping well.',
 NULL, 'Quiet night'),

(@admission3, @today + INTERVAL 6 HOUR, @nurse1, 'observation', 'morning', TRUE,
 'Patient looks well. Appetite good. Ambulating independently.',
 'Recorded vital signs. Advanced diet to soft foods. Removed IV line. Patient ambulating well.',
 'Patient very happy. Ready for discharge.',
 NULL, 'Patient ready for discharge');

-- Vitals Schedule for Patient 3
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
VALUES (@admission3, CURDATE(), '06:00:00', '12:00:00', '18:00:00', '00:00:00', '4x', TRUE, 'Standard monitoring')
ON DUPLICATE KEY UPDATE isActive = 1;

-- Vital Signs for Patient 3
INSERT INTO vital_signs (patientId, admissionId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, recordedBy, notes)
VALUES
(@patient3, @admission3, @yesterday + INTERVAL 6 HOUR, 125, 80, 85, 18, 37.2, 99, 4, 'admission', @nurse1, 'Post-op morning vitals'),
(@patient3, @admission3, @yesterday + INTERVAL 12 HOUR, 122, 78, 78, 17, 37.1, 99, 3, 'admission', @nurse2, 'Afternoon vitals'),
(@patient3, @admission3, @yesterday + INTERVAL 18 HOUR, 120, 75, 75, 16, 37.0, 99, 2, 'admission', @nurse1, 'Evening vitals'),
(@patient3, @admission3, @today + INTERVAL 6 HOUR, 120, 75, 72, 16, 36.9, 99, 1, 'admission', @nurse1, 'Morning vitals - ready for discharge');

-- ============================================
-- SUMMARY
-- ============================================
SELECT
    'Realistic Sample Data Created' as Status,
    (SELECT COUNT(*) FROM admissions WHERE status = 'admitted') as ActiveAdmissions,
    (SELECT COUNT(*) FROM inpatient_doctor_reviews WHERE admissionId IN (@admission1, @admission2, @admission3)) as DoctorReviews,
    (SELECT COUNT(*) FROM inpatient_nursing_care WHERE admissionId IN (@admission1, @admission2, @admission3)) as NursingCareNotes,
    (SELECT COUNT(*) FROM vital_signs WHERE admissionId IN (@admission1, @admission2, @admission3)) as VitalSignsRecords;

