-- ============================================
-- REALISTIC INPATIENT PATIENTS SAMPLE DATA
-- ============================================
-- This script creates 3-5 realistic patients with comprehensive inpatient data
-- Each patient has a complete story: admission, reviews, nursing notes, vitals, etc.

-- Get existing users
SET @doctor1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1);
SET @doctor2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Doctor') LIMIT 1 OFFSET 1);
SET @nurse1 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1);
SET @nurse2 = (SELECT userId FROM users WHERE roleId = (SELECT roleId FROM roles WHERE roleName = 'Nurse') LIMIT 1 OFFSET 1);

SET @doctor1 = COALESCE(@doctor1, (SELECT userId FROM users LIMIT 1));
SET @doctor2 = COALESCE(@doctor2, @doctor1);
SET @nurse1 = COALESCE(@nurse1, @doctor1);
SET @nurse2 = COALESCE(@nurse2, @nurse1);

-- Get available beds
SET @bed1 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1);
SET @bed2 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 1);
SET @bed3 = (SELECT bedId FROM beds WHERE status = 'available' LIMIT 1 OFFSET 2);

SET @bed1 = COALESCE(@bed1, (SELECT bedId FROM beds LIMIT 1));
SET @bed2 = COALESCE(@bed2, (SELECT bedId FROM beds LIMIT 1 OFFSET 1));
SET @bed3 = COALESCE(@bed3, (SELECT bedId FROM beds LIMIT 1 OFFSET 2));

-- Get patients (use existing or create new ones)
SET @patient1 = (SELECT patientId FROM patients LIMIT 1);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);

-- ============================================
-- PATIENT 1: Sarah Mwangi - Pneumonia Case
-- ============================================
SET @adm1_num = CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) + 1 FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%')), 5, '0'));

INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
VALUES (
    @adm1_num,
    @patient1,
    @bed1,
    DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 14 HOUR,  -- 3 days ago at 2 PM
    @doctor1,
    'Community-Acquired Pneumonia',
    'Severe respiratory distress, fever, productive cough. O2 saturation 88% on room air.',
    DATE_ADD(CURDATE(), INTERVAL 2 DAY),
    'admitted',
    'Patient presented with 5-day history of cough, fever, and shortness of breath. Chest X-ray shows right lower lobe consolidation.',
    @doctor1
);

SET @adm1_id = LAST_INSERT_ID();

-- Update bed status
UPDATE beds SET status = 'occupied' WHERE bedId = @bed1;

-- Doctor Reviews for Patient 1
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate) VALUES
(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 16 HOUR, @doctor1, 'consultation',
 'Patient reports severe shortness of breath, productive cough with yellow sputum, fever, and chest pain. Unable to complete sentences.',
 'Temp 38.5°C, BP 140/90, HR 110, RR 28, SpO2 88% on room air. Decreased breath sounds in right lower lobe. Chest X-ray shows consolidation.',
 'Community-acquired pneumonia, likely bacterial. Moderate to severe. Requires IV antibiotics and oxygen support.',
 'Start IV Ceftriaxone 1g BD and Azithromycin 500mg OD. Oxygen via nasal cannula 2-4L/min. Monitor O2 saturation. Chest physiotherapy. Repeat CXR in 48 hours.',
 'Admission for IV antibiotics and monitoring', DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 8 HOUR),

(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 8 HOUR, @doctor1, 'morning_round',
 'Patient reports improvement in breathing. Cough persists but less severe. Fever has reduced.',
 'Temp 37.2°C, BP 130/85, HR 95, RR 22, SpO2 94% on 2L O2. Breath sounds improved but still some crepitations in right lower lobe.',
 'Pneumonia responding to treatment. Clinical improvement noted.',
 'Continue current antibiotics. Reduce O2 to 1-2L/min if SpO2 remains >92%. Encourage deep breathing exercises. Consider switching to oral antibiotics if improvement continues.',
 'Good progress', DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 8 HOUR),

(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 8 HOUR, @doctor1, 'morning_round',
 'Patient feels much better. Minimal cough. No fever. Can walk short distances without significant breathlessness.',
 'Temp 36.8°C, BP 125/80, HR 85, RR 18, SpO2 96% on room air. Clear breath sounds bilaterally. CXR shows significant improvement.',
 'Pneumonia resolving well. Patient ready for discharge planning.',
 'Switch to oral Amoxicillin-Clavulanate 625mg TDS. Discontinue oxygen. Plan discharge tomorrow if condition remains stable. Provide discharge medications and follow-up instructions.',
 'Excellent recovery', CURDATE() + INTERVAL 8 HOUR);

-- Nursing Care Notes for Patient 1
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes) VALUES
(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 14 HOUR, @nurse1, 'assessment', 'afternoon', TRUE,
 'Patient arrived via ambulance. Appears anxious, tachypneic, using accessory muscles. Skin pale, diaphoretic.',
 'Admitted patient, placed on cardiac monitor and oxygen. Started IV line. Administered first dose of IV antibiotics. Positioned patient in semi-Fowler position.',
 'Patient cooperative but visibly distressed. Oxygen therapy providing some relief.',
 'Monitor closely for respiratory distress. Ensure oxygen delivery system functioning properly.',
 'Initial admission assessment completed'),

(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 22 HOUR, @nurse2, 'observation', 'night', TRUE,
 'Patient sleeping intermittently. Awakens with coughing spells. Oxygen saturation stable on 2L O2.',
 'Administered scheduled medications. Performed chest physiotherapy. Encouraged deep breathing exercises.',
 'Patient tolerating treatment. Sleep disturbed by cough.',
 'Continue monitoring respiratory status. Ensure adequate hydration.',
 'Night shift monitoring'),

(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 6 HOUR, @nurse1, 'medication', 'morning', TRUE,
 'Patient appears more comfortable. Color improved. Less respiratory distress.',
 'Administered morning medications. Performed chest physiotherapy. Assisted with morning care.',
 'Patient more alert and responsive. Participating in care.',
 'Continue current care plan. Monitor for improvement.',
 'Morning care provided'),

(@adm1_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 14 HOUR, @nurse1, 'observation', 'afternoon', TRUE,
 'Patient ambulating in room. Minimal cough. Appears well-rested.',
 'Discontinued oxygen as per doctor orders. Patient on room air. Administered medications. Educated on discharge planning.',
 'Patient very pleased with progress. Asking about discharge date.',
 'No concerns. Patient ready for discharge.',
 'Patient doing well');

-- Vitals Schedule for Patient 1
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
VALUES (@adm1_id, CURDATE(), '06:00:00', '12:00:00', '18:00:00', '00:00:00', '4x', TRUE, 'Standard monitoring');

-- Vital Signs for Patient 1
INSERT INTO vital_signs (patientId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, triageId, admissionId, recordedBy, notes) VALUES
(@patient1, DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 14 HOUR, 140, 90, 110, 28, 38.5, 88, 6, 'admission', NULL, @adm1_id, @nurse1, 'Initial vitals - febrile, tachypneic'),
(@patient1, DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 18 HOUR, 135, 88, 105, 26, 38.2, 90, 5, 'admission', NULL, @adm1_id, @nurse1, 'After oxygen and first antibiotic dose'),
(@patient1, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 6 HOUR, 130, 85, 95, 22, 37.2, 94, 3, 'admission', NULL, @adm1_id, @nurse1, 'Morning vitals - improving'),
(@patient1, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 12 HOUR, 128, 82, 90, 20, 37.0, 95, 2, 'admission', NULL, @adm1_id, @nurse1, 'Noon vitals'),
(@patient1, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 6 HOUR, 125, 80, 85, 18, 36.8, 96, 1, 'admission', NULL, @adm1_id, @nurse1, 'Morning vitals - off oxygen'),
(@patient1, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 12 HOUR, 122, 78, 82, 18, 36.6, 97, 0, 'admission', NULL, @adm1_id, @nurse1, 'Noon vitals - stable'),
(@patient1, CURDATE() + INTERVAL 6 HOUR, 120, 75, 80, 16, 36.5, 98, 0, 'admission', NULL, @adm1_id, @nurse1, 'Current vitals - normal');

-- ============================================
-- PATIENT 2: John Kamau - Post-Operative Appendectomy
-- ============================================
SET @adm2_num = CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) + 1 FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%')), 5, '0'));

INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
VALUES (
    @adm2_num,
    @patient2,
    @bed2,
    DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 10 HOUR,  -- Yesterday at 10 AM
    @doctor2,
    'Post-Operative Appendectomy',
    'Post-operative monitoring following emergency appendectomy. Laparoscopic procedure completed successfully.',
    DATE_ADD(CURDATE(), INTERVAL 1 DAY),
    'admitted',
    'Emergency appendectomy performed for acute appendicitis. Procedure uncomplicated. Patient recovering well.',
    @doctor2
);

SET @adm2_id = LAST_INSERT_ID();

UPDATE beds SET status = 'occupied' WHERE bedId = @bed2;

-- Doctor Reviews for Patient 2
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate) VALUES
(@adm2_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 12 HOUR, @doctor2, 'consultation',
 'Patient reports moderate pain at surgical site, rated 6/10. Some nausea post-anesthesia. No vomiting.',
 'Temp 37.1°C, BP 125/80, HR 88, RR 18. Abdomen soft, surgical site clean and dry. Minimal tenderness. Bowel sounds present.',
 'Post-operative day 0. Recovering well from appendectomy. Pain controlled with IV analgesia.',
 'Continue IV fluids. IV Paracetamol 1g QID and IV Tramadol 50mg PRN for pain. Start clear fluids. Monitor for signs of infection. Encourage early ambulation.',
 'Post-op day 0 review', DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 20 HOUR),

(@adm2_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 20 HOUR, @doctor2, 'evening_round',
 'Patient reports pain improved to 3/10. Tolerated clear fluids. Passed flatus. No nausea.',
 'Temp 36.9°C, BP 120/75, HR 82, RR 16. Abdomen soft, non-tender. Surgical site intact. Patient ambulated to bathroom.',
 'Excellent post-operative recovery. No complications.',
 'Advance to soft diet. Continue pain medications. Discontinue IV fluids if tolerating oral intake well. Plan discharge tomorrow if continues to improve.',
 'Evening review - doing well', CURDATE() + INTERVAL 8 HOUR),

(@adm2_id, CURDATE() + INTERVAL 8 HOUR, @doctor2, 'morning_round',
 'Patient feels well. Minimal pain (1/10). Good appetite. Bowel movements normal.',
 'Temp 36.7°C, BP 118/72, HR 78, RR 16. Surgical site healing well, no signs of infection. Patient fully ambulatory.',
 'Ready for discharge. Wound healing well. No complications.',
 'Discharge today. Prescribe oral Paracetamol 1g QID and Ibuprofen 400mg TDS for pain. Remove sutures in 7 days. Follow-up in surgical clinic in 2 weeks. Advise to avoid heavy lifting for 4 weeks.',
 'Discharge planning');

-- Nursing Care Notes for Patient 2
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes) VALUES
(@adm2_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 10 HOUR, @nurse2, 'assessment', 'morning', TRUE,
 'Patient arrived from recovery room. Alert and oriented. Surgical site dressing clean and dry.',
 'Received patient from PACU. Connected to IV fluids. Administered first dose of pain medication. Positioned comfortably.',
 'Patient cooperative. Pain controlled with medication.',
 'Monitor surgical site for bleeding or infection. Encourage early mobilization.',
 'Post-operative admission'),

(@adm2_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 14 HOUR, @nurse1, 'medication', 'afternoon', TRUE,
 'Patient resting comfortably. Pain well controlled. Tolerating clear fluids.',
 'Administered scheduled pain medications. Assisted patient to ambulate. Changed surgical dressing.',
 'Patient ambulated well. Minimal discomfort.',
 'Continue monitoring. Encourage increased activity.',
 'Afternoon care'),

(@adm2_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 22 HOUR, @nurse2, 'observation', 'night', TRUE,
 'Patient sleeping well. Awakened for medications. No complaints of severe pain.',
 'Administered night medications. Checked surgical site - clean and dry. Patient voided normally.',
 'Restful night. No complications.',
 'Continue routine monitoring.',
 'Night shift - stable'),

(@adm2_id, CURDATE() + INTERVAL 6 HOUR, @nurse1, 'procedure', 'morning', TRUE,
 'Patient ready for discharge. Surgical site healing well. Fully ambulatory.',
 'Removed IV line. Provided discharge education. Reviewed wound care instructions.',
 'Patient understands discharge instructions. Eager to go home.',
 'No concerns. Ready for discharge.',
 'Discharge preparation');

-- Vitals Schedule for Patient 2
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
VALUES (@adm2_id, CURDATE(), '06:00:00', '12:00:00', '18:00:00', '00:00:00', '4x', TRUE, 'Post-operative monitoring');

-- Vital Signs for Patient 2
INSERT INTO vital_signs (patientId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, triageId, admissionId, recordedBy, notes) VALUES
(@patient2, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 10 HOUR, 125, 80, 88, 18, 37.1, 98, 6, 'admission', NULL, @adm2_id, @nurse2, 'Post-op vitals'),
(@patient2, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 12 HOUR, 120, 75, 82, 16, 36.9, 98, 3, 'admission', NULL, @adm2_id, @nurse1, 'Afternoon vitals'),
(@patient2, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 18 HOUR, 118, 72, 80, 16, 36.8, 99, 2, 'admission', NULL, @adm2_id, @nurse2, 'Evening vitals'),
(@patient2, CURDATE() + INTERVAL 6 HOUR, 118, 72, 78, 16, 36.7, 99, 1, 'admission', NULL, @adm2_id, @nurse1, 'Morning vitals - ready for discharge');

-- ============================================
-- PATIENT 3: Mary Wanjiku - Hypertension Management
-- ============================================
SET @adm3_num = CONCAT('IP-', YEAR(CURDATE()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admissionNumber, '-', -1) AS UNSIGNED)), 0) + 1 FROM admissions WHERE admissionNumber LIKE CONCAT('IP-', YEAR(CURDATE()), '-%')), 5, '0'));

INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, admissionReason, expectedDischargeDate, status, notes, createdBy)
VALUES (
    @adm3_num,
    @patient3,
    @bed3,
    DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 16 HOUR,  -- 2 days ago at 4 PM
    @doctor1,
    'Hypertensive Crisis',
    'Severe hypertension (BP 200/120) with headache and dizziness. Requires IV antihypertensive therapy and monitoring.',
    DATE_ADD(CURDATE(), INTERVAL 1 DAY),
    'admitted',
    'Patient presented to emergency with severe hypertension. History of non-compliance with medications. Requires stabilization and medication adjustment.',
    @doctor1
);

SET @adm3_id = LAST_INSERT_ID();

UPDATE beds SET status = 'occupied' WHERE bedId = @bed3;

-- Doctor Reviews for Patient 3
INSERT INTO inpatient_doctor_reviews (admissionId, reviewDate, reviewingDoctorId, reviewType, subjective, objective, assessment, plan, notes, nextReviewDate) VALUES
(@adm3_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 18 HOUR, @doctor1, 'emergency',
 'Patient reports severe headache, dizziness, and blurred vision. Denies chest pain or shortness of breath.',
 'BP 200/120, HR 95, RR 18. Fundoscopy shows grade 2 hypertensive retinopathy. No signs of heart failure. ECG shows LVH but no acute changes.',
 'Hypertensive emergency. Requires urgent BP reduction to prevent end-organ damage.',
 'Start IV Labetalol infusion. Target BP reduction to 160/100 over 2-4 hours. Monitor closely. Once stable, transition to oral medications. Review compliance and adjust medication regimen.',
 'Emergency admission for BP control', DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 8 HOUR),

(@adm3_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 8 HOUR, @doctor1, 'morning_round',
 'Patient reports headache resolved. Feeling much better. No dizziness.',
 'BP 150/95, HR 85, RR 16. BP responding well to treatment. No neurological deficits.',
 'Hypertension controlled. Patient stable.',
 'Discontinue IV Labetalol. Start oral Amlodipine 10mg OD and Lisinopril 10mg OD. Monitor BP 4x daily. Educate on medication compliance and lifestyle modifications.',
 'BP stabilized', CURDATE() + INTERVAL 8 HOUR),

(@adm3_id, CURDATE() + INTERVAL 8 HOUR, @doctor1, 'morning_round',
 'Patient feels well. No symptoms. Understanding importance of medication compliance.',
 'BP 140/88, HR 80, RR 16. BP well controlled on oral medications.',
 'Hypertension well managed. Ready for discharge.',
 'Discharge today. Continue Amlodipine 10mg OD and Lisinopril 10mg OD. Follow-up in 1 week for BP check. Emphasize medication compliance. Low-salt diet. Regular exercise.',
 'Ready for discharge');

-- Nursing Care Notes for Patient 3
INSERT INTO inpatient_nursing_care (admissionId, careDate, nurseId, careType, shift, vitalSignsRecorded, observations, interventions, patientResponse, concerns, notes) VALUES
(@adm3_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 16 HOUR, @nurse1, 'assessment', 'afternoon', TRUE,
 'Patient arrived from emergency department. Appears anxious. Complaining of severe headache.',
 'Admitted patient. Started IV Labetalol infusion. Placed on cardiac monitor. Frequent BP monitoring every 15 minutes initially.',
 'Patient cooperative but worried about condition.',
 'Monitor BP closely. Watch for signs of hypotension or neurological changes.',
 'Emergency admission'),

(@adm3_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 22 HOUR, @nurse2, 'observation', 'night', TRUE,
 'Patient resting. Headache improving. BP gradually decreasing.',
 'Continued IV infusion. Monitored BP every 30 minutes. Administered medications.',
 'Patient more comfortable. BP responding to treatment.',
 'Continue monitoring. Ensure gradual BP reduction.',
 'Night monitoring'),

(@adm3_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 6 HOUR, @nurse1, 'medication', 'morning', TRUE,
 'Patient alert and oriented. BP stable. No complaints.',
 'Discontinued IV. Started oral antihypertensive medications. Provided patient education on hypertension management.',
 'Patient engaged in education. Understanding importance of compliance.',
 'Continue monitoring BP. Reinforce medication compliance.',
 'Transitioned to oral medications'),

(@adm3_id, CURDATE() + INTERVAL 6 HOUR, @nurse1, 'education', 'morning', TRUE,
 'Patient ready for discharge. BP well controlled. Understanding discharge instructions.',
 'Completed discharge education. Reviewed medication schedule. Provided written instructions.',
 'Patient confident about managing condition at home.',
 'No concerns. Patient well-educated.',
 'Discharge preparation');

-- Vitals Schedule for Patient 3
INSERT INTO inpatient_vitals_schedule (admissionId, scheduleDate, scheduledTime1, scheduledTime2, scheduledTime3, scheduledTime4, frequency, isActive, notes)
VALUES (@adm3_id, CURDATE(), '06:00:00', '12:00:00', '18:00:00', '00:00:00', '4x', TRUE, 'Hypertension monitoring');

-- Vital Signs for Patient 3
INSERT INTO vital_signs (patientId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, painScore, context, triageId, admissionId, recordedBy, notes) VALUES
(@patient3, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 16 HOUR, 200, 120, 95, 18, 36.8, 98, 8, 'admission', NULL, @adm3_id, @nurse1, 'Initial BP - hypertensive crisis'),
(@patient3, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 18 HOUR, 180, 110, 92, 18, 36.7, 98, 6, 'admission', NULL, @adm3_id, @nurse1, 'After starting IV Labetalol'),
(@patient3, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 22 HOUR, 165, 100, 88, 16, 36.6, 99, 3, 'admission', NULL, @adm3_id, @nurse2, 'Night vitals - BP improving'),
(@patient3, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 6 HOUR, 150, 95, 85, 16, 36.5, 99, 1, 'admission', NULL, @adm3_id, @nurse1, 'Morning vitals - BP controlled'),
(@patient3, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 12 HOUR, 145, 90, 82, 16, 36.5, 99, 0, 'admission', NULL, @adm3_id, @nurse1, 'Noon vitals'),
(@patient3, CURDATE() + INTERVAL 6 HOUR, 140, 88, 80, 16, 36.5, 99, 0, 'admission', NULL, @adm3_id, @nurse1, 'Current vitals - well controlled');

-- ============================================
-- SUMMARY
-- ============================================
SELECT
    'Realistic Patient Data Created' as Status,
    (SELECT COUNT(*) FROM admissions WHERE admissionId IN (@adm1_id, @adm2_id, @adm3_id)) as Admissions,
    (SELECT COUNT(*) FROM inpatient_doctor_reviews WHERE admissionId IN (@adm1_id, @adm2_id, @adm3_id)) as DoctorReviews,
    (SELECT COUNT(*) FROM inpatient_nursing_care WHERE admissionId IN (@adm1_id, @adm2_id, @adm3_id)) as NursingNotes,
    (SELECT COUNT(*) FROM vital_signs WHERE admissionId IN (@adm1_id, @adm2_id, @adm3_id)) as VitalSigns;

