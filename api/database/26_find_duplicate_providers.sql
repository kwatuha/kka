-- ============================================
-- FIND DUPLICATE INSURANCE PROVIDERS
-- ============================================
-- This script helps identify duplicate providers before cleanup
-- Run this first to see what duplicates exist

-- Find duplicates by provider name
SELECT
    'Duplicates by Name' as check_type,
    providerName,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(providerId ORDER BY providerId) as provider_ids,
    GROUP_CONCAT(providerCode ORDER BY providerId) as provider_codes,
    GROUP_CONCAT(isActive ORDER BY providerId) as active_statuses,
    GROUP_CONCAT(createdAt ORDER BY providerId) as created_dates
FROM insurance_providers
GROUP BY providerName
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, providerName;

-- Find duplicates by provider code
SELECT
    'Duplicates by Code' as check_type,
    providerCode,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(providerId ORDER BY providerId) as provider_ids,
    GROUP_CONCAT(providerName ORDER BY providerId) as provider_names,
    GROUP_CONCAT(isActive ORDER BY providerId) as active_statuses,
    GROUP_CONCAT(createdAt ORDER BY providerId) as created_dates
FROM insurance_providers
WHERE providerCode IS NOT NULL AND providerCode != ''
GROUP BY providerCode
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, providerCode;

-- Find duplicates by both name and code (exact matches)
SELECT
    'Exact Duplicates' as check_type,
    providerName,
    providerCode,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(providerId ORDER BY providerId) as provider_ids,
    GROUP_CONCAT(isActive ORDER BY providerId) as active_statuses,
    GROUP_CONCAT(createdAt ORDER BY providerId) as created_dates
FROM insurance_providers
GROUP BY providerName, providerCode
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, providerName, providerCode;

-- Show all provider details for manual review
SELECT
    providerId,
    providerCode,
    providerName,
    isActive,
    createdAt,
    updatedAt,
    (SELECT COUNT(*) FROM patient_insurance WHERE providerId = ip.providerId) as patient_count,
    (SELECT COUNT(*) FROM insurance_claims ic
     INNER JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
     WHERE pi.providerId = ip.providerId) as claim_count
FROM insurance_providers ip
ORDER BY providerName, providerCode, providerId;






