-- ============================================
-- CLEANUP: Unique insurance providers by name only
-- ============================================
-- Keeps one provider per distinct provider name (case-insensitive).
-- Keeps the row with the smallest providerId (oldest). Updates all FKs then deletes duplicates.
-- Run after backup. Safe to run multiple times (idempotent once clean).

-- Step 1: Keep one provider per name (case-insensitive), the one with min(providerId)
DROP TEMPORARY TABLE IF EXISTS providers_to_keep;
CREATE TEMPORARY TABLE providers_to_keep AS
SELECT
    MIN(providerId) AS providerId,
    LOWER(TRIM(providerName)) AS name_key,
    MAX(providerName) AS providerName
FROM insurance_providers
GROUP BY LOWER(TRIM(providerName));

-- Step 2: List provider IDs to delete (same name as a keeper but not the keeper)
DROP TEMPORARY TABLE IF EXISTS providers_to_delete;
CREATE TEMPORARY TABLE providers_to_delete AS
SELECT ip.providerId
FROM insurance_providers ip
INNER JOIN providers_to_keep ptk ON LOWER(TRIM(ip.providerName)) = ptk.name_key
WHERE ip.providerId != ptk.providerId;

-- Step 3: Update patient_insurance: point to keeper for same provider name
UPDATE patient_insurance pi
INNER JOIN providers_to_delete ptd ON pi.providerId = ptd.providerId
INNER JOIN insurance_providers ip_dup ON ip_dup.providerId = ptd.providerId
INNER JOIN providers_to_keep ptk ON LOWER(TRIM(ip_dup.providerName)) = ptk.name_key
SET pi.providerId = ptk.providerId;

-- Step 4: Update claim_requirement_templates
UPDATE claim_requirement_templates crt
INNER JOIN providers_to_delete ptd ON crt.providerId = ptd.providerId
INNER JOIN insurance_providers ip_dup ON ip_dup.providerId = ptd.providerId
INNER JOIN providers_to_keep ptk ON LOWER(TRIM(ip_dup.providerName)) = ptk.name_key
SET crt.providerId = ptk.providerId;

-- Step 5: Update insurance_packages
UPDATE insurance_packages ipkg
INNER JOIN providers_to_delete ptd ON ipkg.providerId = ptd.providerId
INNER JOIN insurance_providers ip_dup ON ip_dup.providerId = ptd.providerId
INNER JOIN providers_to_keep ptk ON LOWER(TRIM(ip_dup.providerName)) = ptk.name_key
SET ipkg.providerId = ptk.providerId;

-- Step 6: Delete duplicate providers
DELETE ip FROM insurance_providers ip
INNER JOIN providers_to_delete ptd ON ip.providerId = ptd.providerId;

-- Step 7: Drop temp tables
DROP TEMPORARY TABLE IF EXISTS providers_to_keep;
DROP TEMPORARY TABLE IF EXISTS providers_to_delete;

-- Optional: Prevent future duplicates by adding a unique index on provider name.
-- Uncomment only after verifying no duplicates remain (e.g. run 26_find_duplicate_providers.sql by name).
-- ALTER TABLE insurance_providers ADD UNIQUE INDEX idx_unique_provider_name (providerName);
