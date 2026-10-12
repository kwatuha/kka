-- Archive imported Kiplombe patients and seed a small Kakamega UAT test cohort.
-- Only patients with smsNotificationsEnabled = 1 receive transactional SMS.

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'patients'
  AND COLUMN_NAME = 'smsNotificationsEnabled';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE patients ADD COLUMN smsNotificationsEnabled BOOLEAN NOT NULL DEFAULT TRUE AFTER voided',
    'SELECT "Column smsNotificationsEnabled already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Close open queue tickets so legacy patients are not called from service points.
UPDATE queue_entries
SET status = 'cancelled',
    notes = CONCAT(COALESCE(notes, ''), ' [Archived pre-Kakamega go-live]')
WHERE status IN ('waiting', 'called', 'serving');

-- Archive every existing patient and strip contact details (PII safety).
UPDATE patients
SET voided = 1,
    smsNotificationsEnabled = 0,
    phone = NULL,
    nextOfKinPhone = NULL,
    email = NULL,
    medicalHistory = CONCAT(
      COALESCE(medicalHistory, ''),
      IF(medicalHistory IS NULL OR medicalHistory = '', '', ' '),
      '[Archived: imported record — not for live Kakamega use]'
    )
WHERE patientNumber NOT LIKE 'KAK-TEST-%'
  AND (voided = 0 OR phone IS NOT NULL OR nextOfKinPhone IS NOT NULL OR email IS NOT NULL);

SET @crh := (SELECT branchId FROM branches WHERE branchCode = 'KAK-CRH' LIMIT 1);
SET @mat := (SELECT branchId FROM branches WHERE branchCode = 'KAK-MAT' LIMIT 1);
SET @mal := (SELECT branchId FROM branches WHERE branchCode = 'KAK-MAL' LIMIT 1);
SET @btr := (SELECT branchId FROM branches WHERE branchCode = 'KAK-BTR' LIMIT 1);
SET @main_branch := COALESCE(@crh, (SELECT branchId FROM branches WHERE isMainBranch = 1 ORDER BY branchId LIMIT 1));

-- Five named UAT patients — all use the designated tester mobile for SMS verification.
INSERT INTO patients (
  registeredBranchId, patientNumber, firstName, lastName, dateOfBirth, gender, patientType,
  phone, county, address, medicalHistory, createdBy, voided, smsNotificationsEnabled
)
SELECT @main_branch, 'KAK-TEST-001', 'Wanjala', 'Ochieng', '1988-04-12', 'Male', 'paying',
  '0718109196', 'Kakamega', 'Kakamega Town', '[KAKAMEGA-UAT] County referral test patient', 1, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE patientNumber = 'KAK-TEST-001');

INSERT INTO patients (
  registeredBranchId, patientNumber, firstName, lastName, dateOfBirth, gender, patientType,
  phone, county, address, medicalHistory, createdBy, voided, smsNotificationsEnabled
)
SELECT @mat, 'KAK-TEST-002', 'Grace', 'Nafula', '1992-08-03', 'Female', 'paying',
  '0718109196', 'Kakamega', 'Matungu', '[KAKAMEGA-UAT] Matungu sub-county test patient', 1, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE patientNumber = 'KAK-TEST-002');

INSERT INTO patients (
  registeredBranchId, patientNumber, firstName, lastName, dateOfBirth, gender, patientType,
  phone, county, address, medicalHistory, createdBy, voided, smsNotificationsEnabled
)
SELECT @mal, 'KAK-TEST-003', 'Peter', 'Wekesa', '1985-11-20', 'Male', 'paying',
  '0718109196', 'Kakamega', 'Malava', '[KAKAMEGA-UAT] Malava sub-county test patient', 1, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE patientNumber = 'KAK-TEST-003');

INSERT INTO patients (
  registeredBranchId, patientNumber, firstName, lastName, dateOfBirth, gender, patientType,
  phone, county, address, medicalHistory, createdBy, voided, smsNotificationsEnabled
)
SELECT @btr, 'KAK-TEST-004', 'Mary', 'Akinyi', '1990-01-15', 'Female', 'paying',
  '0718109196', 'Kakamega', 'Butere', '[KAKAMEGA-UAT] Butere sub-county test patient', 1, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE patientNumber = 'KAK-TEST-004');

INSERT INTO patients (
  registeredBranchId, patientNumber, firstName, lastName, dateOfBirth, gender, patientType,
  phone, county, address, medicalHistory, createdBy, voided, smsNotificationsEnabled
)
SELECT @main_branch, 'KAK-TEST-005', 'James', 'Otieno', '1979-06-30', 'Male', 'paying',
  '0718109196', 'Kakamega', 'Kakamega Town', '[KAKAMEGA-UAT] Payment and lab SMS test patient', 1, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE patientNumber = 'KAK-TEST-005');

-- Ensure UAT patients stay SMS-eligible if migration is re-run after manual edits.
UPDATE patients
SET voided = 0,
    smsNotificationsEnabled = 1,
    phone = '0718109196',
    nextOfKinPhone = NULL,
    email = NULL
WHERE patientNumber IN ('KAK-TEST-001', 'KAK-TEST-002', 'KAK-TEST-003', 'KAK-TEST-004', 'KAK-TEST-005');
