-- Rename legacy demo branches (Kiplombe, Langas, Elburgon) to Kakamega County
-- sub-county facilities. Keeps KAK-CRH as the sole main referral hospital.

-- Ensure only the county referral hospital is marked main.
UPDATE branches SET isMainBranch = 0 WHERE branchCode IN ('BR-001', 'BR-002', 'BR-003', 'MAIN');
UPDATE branches SET isMainBranch = 1 WHERE branchCode = 'KAK-CRH';

-- Matungu Sub-County Hospital (was Kiplombe Medical Center / BR-001)
UPDATE branches
SET
  branchCode = 'KAK-MAT',
  branchName = 'Matungu Sub-County Hospital',
  address = 'Matungu Town, Matungu Sub-County, Kakamega',
  postalAddress = 'P.O. Box 120, Matungu',
  phone = COALESCE(NULLIF(TRIM(phone), ''), '0718 109 197'),
  email = COALESCE(NULLIF(TRIM(email), ''), 'matungu@kakamega.hmis'),
  notes = 'Level 4 sub-county hospital - outpatient, maternity, and basic inpatient services for Matungu catchment'
WHERE branchCode IN ('BR-001', 'KAK-MAT')
   OR branchName IN ('Kiplombe Medical Center', 'Kiplombe Medical Centre');

-- Malava Sub-County Hospital (was Langas / BR-002)
UPDATE branches
SET
  branchCode = 'KAK-MAL',
  branchName = 'Malava Sub-County Hospital',
  address = 'Malava Town, Malava Sub-County, Kakamega',
  postalAddress = 'P.O. Box 45, Malava',
  phone = COALESCE(NULLIF(TRIM(phone), ''), '0717 189 187'),
  email = COALESCE(NULLIF(TRIM(email), ''), 'malava@kakamega.hmis'),
  notes = 'Level 4 sub-county hospital - primary care hub for Malava and surrounding wards'
WHERE branchCode IN ('BR-002', 'KAK-MAL')
   OR TRIM(branchName) IN ('Langas', 'Langas ');

-- Butere Sub-County Hospital (was Elburgon / BR-003)
UPDATE branches
SET
  branchCode = 'KAK-BTR',
  branchName = 'Butere Sub-County Hospital',
  address = 'Butere Town, Butere Sub-County, Kakamega',
  postalAddress = 'P.O. Box 88, Butere',
  phone = COALESCE(NULLIF(TRIM(phone), ''), '0720 000 003'),
  email = COALESCE(NULLIF(TRIM(email), ''), 'butere@kakamega.hmis'),
  notes = 'Level 4 sub-county hospital - serves Butere, Marama, and rural outreach clinics'
WHERE branchCode IN ('BR-003', 'KAK-BTR')
   OR branchName = 'Elburgon';

-- Refresh service point display names from branch names.
UPDATE service_points sp
INNER JOIN branches b ON sp.branchId = b.branchId
SET sp.pointName = CONCAT(TRIM(b.branchName), ' - ', SUBSTRING_INDEX(sp.pointName, ' - ', -1))
WHERE sp.pointName LIKE '% - %';

-- Align service point codes with new branch codes where legacy BR-00x codes remain.
UPDATE service_points sp
INNER JOIN branches b ON sp.branchId = b.branchId
SET sp.pointCode = CONCAT(b.branchCode, '-', SUBSTRING_INDEX(sp.pointCode, '-', -1))
WHERE sp.pointCode REGEXP '^BR-[0-9]{3}-'
  AND b.branchCode LIKE 'KAK-%';

-- Laboratories
UPDATE laboratories l
INNER JOIN branches b ON l.branchId = b.branchId
SET l.labCode = CONCAT('LAB-', b.branchCode),
    l.labName = CONCAT(TRIM(b.branchName), ' Laboratory')
WHERE b.branchCode IN ('KAK-MAT', 'KAK-MAL', 'KAK-BTR', 'KAK-CRH');

-- Drug stores seeded for demo branches
UPDATE drug_stores ds
INNER JOIN branches b ON ds.branchId = b.branchId
SET ds.storeName = CONCAT(TRIM(b.branchName), ' Dispensary')
WHERE ds.storeName LIKE '%Dispensary%'
  AND b.branchCode IN ('KAK-MAT', 'KAK-MAL', 'KAK-BTR');

UPDATE drug_stores ds
INNER JOIN branches b ON ds.branchId = b.branchId
SET ds.storeName = 'Central Medical Store'
WHERE ds.storeName IN ('Main Store', 'Dispensing Store')
  AND b.branchCode = 'KAK-CRH';

UPDATE drug_stores ds
INNER JOIN branches b ON ds.branchId = b.branchId
SET ds.storeName = CONCAT(TRIM(b.branchName), ' Main Store')
WHERE ds.storeName IN ('Main Store', 'Dispensing Store')
  AND b.branchCode IN ('KAK-MAT', 'KAK-MAL', 'KAK-BTR');

-- Fix notes mojibake on county referral hospital if present.
SET @bad_sep = CONVERT(UNHEX('C3A2E282ACE2809D') USING utf8mb4) COLLATE utf8mb4_unicode_ci;
UPDATE branches
SET notes = REPLACE(notes, @bad_sep, '-')
WHERE notes LIKE CONCAT('%', @bad_sep, '%') COLLATE utf8mb4_unicode_ci;
