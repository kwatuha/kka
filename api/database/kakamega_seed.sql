-- Kakamega County HMIS bootstrap seed
-- Safe to re-run (uses WHERE NOT EXISTS / ON DUPLICATE patterns).

-- Main facility for county testing
INSERT INTO branches (
  branchCode, branchName, isMainBranch, isActive, notes,
  address, postalAddress, phone, email, logoUrl, letterheadTitle, receiptFooter
)
SELECT
  'KAK-CRH',
  'Kakamega County General Teaching & Referral Hospital',
  1,
  1,
  'Level 5 county referral hospital — primary Kakamega County HMIS facility',
  'Kisumu-Kakamega Road, Kakamega',
  'P.O. Box 15-50100, Kakamega',
  '0720 295739',
  'wpgh15@yahoo.com',
  '/kakamega-facility-logo.svg',
  'Kakamega County General Teaching & Referral Hospital',
  'Thank you for choosing Kakamega County General Teaching & Referral Hospital. Open 24 hours.'
WHERE NOT EXISTS (
  SELECT 1 FROM branches WHERE branchCode = 'KAK-CRH'
);

-- If an old MAIN placeholder exists and KAK-CRH was just inserted, keep KAK-CRH as main
UPDATE branches
SET isMainBranch = CASE WHEN branchCode = 'KAK-CRH' THEN 1 ELSE 0 END
WHERE branchCode IN ('MAIN', 'KAK-CRH');

UPDATE branches
SET
  branchName = 'Kakamega County General Teaching & Referral Hospital',
  letterheadTitle = 'Kakamega County General Teaching & Referral Hospital',
  address = 'Kisumu-Kakamega Road, Kakamega',
  postalAddress = 'P.O. Box 15-50100, Kakamega',
  phone = '0720 295739',
  email = 'wpgh15@yahoo.com',
  logoUrl = '/kakamega-facility-logo.svg',
  receiptFooter = 'Thank you for choosing Kakamega County General Teaching & Referral Hospital. Open 24 hours.',
  notes = 'Level 5 county referral hospital - primary Kakamega County HMIS facility'
WHERE branchCode = 'KAK-CRH';

-- Satellite sub-county hospitals for multi-facility demo / reporting
INSERT INTO branches (branchCode, branchName, isMainBranch, isActive, notes, address, postalAddress, phone, email)
SELECT 'KAK-MAT', 'Matungu Sub-County Hospital', 0, 1,
  'Level 4 sub-county hospital - outpatient, maternity, and basic inpatient services for Matungu catchment',
  'Matungu Town, Matungu Sub-County, Kakamega', 'P.O. Box 120, Matungu', '0718 109 197', 'matungu@kakamega.hmis'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE branchCode IN ('KAK-MAT', 'BR-001'));

INSERT INTO branches (branchCode, branchName, isMainBranch, isActive, notes, address, postalAddress, phone, email)
SELECT 'KAK-MAL', 'Malava Sub-County Hospital', 0, 1,
  'Level 4 sub-county hospital - primary care hub for Malava and surrounding wards',
  'Malava Town, Malava Sub-County, Kakamega', 'P.O. Box 45, Malava', '0717 189 187', 'malava@kakamega.hmis'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE branchCode IN ('KAK-MAL', 'BR-002'));

INSERT INTO branches (branchCode, branchName, isMainBranch, isActive, notes, address, postalAddress, phone, email)
SELECT 'KAK-BTR', 'Butere Sub-County Hospital', 0, 1,
  'Level 4 sub-county hospital - serves Butere, Marama, and rural outreach clinics',
  'Butere Town, Butere Sub-County, Kakamega', 'P.O. Box 88, Butere', '0720 000 003', 'butere@kakamega.hmis'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE branchCode IN ('KAK-BTR', 'BR-003'));

-- Point default admin at Kakamega branding
UPDATE users
SET email = 'admin@kakamega.hmis',
    firstName = 'Kakamega',
    lastName = 'Administrator',
    department = 'County ICT'
WHERE username = 'admin';

-- Ensure admin can access all branches
SET @kak_branch_id := (
  SELECT branchId FROM branches
  WHERE branchCode = 'KAK-CRH' OR isMainBranch = 1
  ORDER BY CASE WHEN branchCode = 'KAK-CRH' THEN 0 ELSE 1 END, branchId
  LIMIT 1
);

INSERT INTO user_branch_assignments (userId, branchId, isDefault, canAccessAllBranches, isActive)
SELECT u.userId, @kak_branch_id, 1, 1, 1
FROM users u
WHERE u.username = 'admin'
  AND @kak_branch_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_assignments uba
    WHERE uba.userId = u.userId AND uba.branchId = @kak_branch_id
  );
