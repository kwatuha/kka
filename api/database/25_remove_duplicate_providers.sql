-- ============================================
-- REMOVE DUPLICATE INSURANCE PROVIDERS
-- ============================================
-- This script identifies and removes duplicate insurance providers
-- It keeps the oldest record (lowest providerId) and removes newer duplicates

-- Step 1: Identify duplicates
-- This query shows all duplicate providers grouped by name or code
SELECT
    providerName,
    providerCode,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(providerId ORDER BY providerId) as provider_ids
FROM insurance_providers
GROUP BY providerName, providerCode
HAVING COUNT(*) > 1;

-- Step 2: Create a temporary table to store IDs to keep (oldest record)
CREATE TEMPORARY TABLE IF NOT EXISTS providers_to_keep AS
SELECT
    MIN(providerId) as providerId,
    providerName,
    providerCode
FROM insurance_providers
GROUP BY providerName, providerCode;

-- Step 3: Find duplicate IDs to delete (all except the one to keep)
CREATE TEMPORARY TABLE IF NOT EXISTS providers_to_delete AS
SELECT ip.providerId
FROM insurance_providers ip
LEFT JOIN providers_to_keep ptk ON ip.providerId = ptk.providerId
WHERE ptk.providerId IS NULL
AND EXISTS (
    SELECT 1
    FROM insurance_providers ip2
    WHERE (ip2.providerName = ip.providerName OR ip2.providerCode = ip.providerCode)
    AND ip2.providerId < ip.providerId
);

-- Step 4: Before deleting, check what will be deleted (for safety)
SELECT
    ip.providerId,
    ip.providerCode,
    ip.providerName,
    ip.isActive,
    ip.createdAt
FROM insurance_providers ip
INNER JOIN providers_to_delete ptd ON ip.providerId = ptd.providerId
ORDER BY ip.providerName, ip.providerCode, ip.providerId;

-- Step 5: Update foreign key references before deleting
-- Update patient_insurance to point to the kept provider
UPDATE patient_insurance pi
INNER JOIN providers_to_delete ptd ON pi.providerId = ptd.providerId
INNER JOIN providers_to_keep ptk ON (
    (SELECT providerName FROM insurance_providers WHERE providerId = ptd.providerId) = ptk.providerName
    OR (SELECT providerCode FROM insurance_providers WHERE providerId = ptd.providerId) = ptk.providerCode
)
SET pi.providerId = ptk.providerId
WHERE EXISTS (
    SELECT 1 FROM providers_to_delete WHERE providerId = pi.providerId
);

-- Update insurance_claims to point to the kept provider (via patient_insurance)
-- This is handled by the patient_insurance update above

-- Update claim_requirement_templates to point to the kept provider
UPDATE claim_requirement_templates crt
INNER JOIN providers_to_delete ptd ON crt.providerId = ptd.providerId
INNER JOIN providers_to_keep ptk ON (
    (SELECT providerName FROM insurance_providers WHERE providerId = ptd.providerId) = ptk.providerName
    OR (SELECT providerCode FROM insurance_providers WHERE providerId = ptd.providerId) = ptk.providerCode
)
SET crt.providerId = ptk.providerId
WHERE EXISTS (
    SELECT 1 FROM providers_to_delete WHERE providerId = crt.providerId
);

-- Update insurance_packages to point to the kept provider
UPDATE insurance_packages ipkg
INNER JOIN providers_to_delete ptd ON ipkg.providerId = ptd.providerId
INNER JOIN providers_to_keep ptk ON (
    (SELECT providerName FROM insurance_providers WHERE providerId = ptd.providerId) = ptk.providerName
    OR (SELECT providerCode FROM insurance_providers WHERE providerId = ptd.providerId) = ptk.providerCode
)
SET ipkg.providerId = ptk.providerId
WHERE EXISTS (
    SELECT 1 FROM providers_to_delete WHERE providerId = ipkg.providerId
);

-- Step 6: Delete duplicate providers
-- WARNING: This will permanently delete duplicate records
-- Make sure to backup your database before running this!
DELETE ip FROM insurance_providers ip
INNER JOIN providers_to_delete ptd ON ip.providerId = ptd.providerId;

-- Step 7: Verify duplicates are removed
SELECT
    providerName,
    providerCode,
    COUNT(*) as count
FROM insurance_providers
GROUP BY providerName, providerCode
HAVING COUNT(*) > 1;

-- Step 8: Clean up temporary tables
DROP TEMPORARY TABLE IF EXISTS providers_to_keep;
DROP TEMPORARY TABLE IF EXISTS providers_to_delete;

-- ============================================
-- ALTERNATIVE: Safer approach - Mark duplicates as inactive instead of deleting
-- ============================================
-- If you prefer to keep the records but mark them as inactive:

/*
-- Mark duplicates as inactive (keeping the oldest active)
UPDATE insurance_providers ip
INNER JOIN (
    SELECT
        providerName,
        providerCode,
        MIN(providerId) as keep_id
    FROM insurance_providers
    WHERE isActive = 1
    GROUP BY providerName, providerCode
    HAVING COUNT(*) > 1
) duplicates ON (
    (ip.providerName = duplicates.providerName OR ip.providerCode = duplicates.providerCode)
    AND ip.providerId != duplicates.keep_id
)
SET ip.isActive = 0;
*/

-- ============================================
-- PREVENT FUTURE DUPLICATES
-- ============================================
-- Add unique constraint on providerCode (if not already exists)
-- Note: This will fail if there are still duplicates, so run the cleanup first

-- ALTER TABLE insurance_providers ADD UNIQUE INDEX idx_unique_provider_code (providerCode);
-- ALTER TABLE insurance_providers ADD UNIQUE INDEX idx_unique_provider_name (providerName);





