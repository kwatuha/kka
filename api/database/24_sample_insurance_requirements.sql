-- ============================================
-- SAMPLE INSURANCE CLAIM REQUIREMENTS
-- ============================================
-- This file contains sample requirements for common Kenyan insurance providers
-- Run this after creating insurance providers in your system

-- Note: Adjust provider IDs and codes based on your actual insurance_providers table
-- You can find provider IDs by running: SELECT providerId, providerCode, providerName FROM insurance_providers;

-- ============================================
-- SHA (Social Health Authority) Requirements
-- ============================================
SET @sha_provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'SHA' OR providerName LIKE '%SHA%' OR providerName LIKE '%Social Health%' LIMIT 1);

-- Create SHA template if provider exists
INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
SELECT
    @sha_provider_id,
    'SHA Standard Claim Requirements',
    'Standard checklist of requirements for submitting SHA insurance claims',
    TRUE,
    TRUE,
    NULL
WHERE @sha_provider_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM claim_requirement_templates WHERE providerId = @sha_provider_id AND isActive = 1);

SET @sha_template_id = (SELECT templateId FROM claim_requirement_templates WHERE providerId = @sha_provider_id AND isActive = 1 LIMIT 1);

-- SHA Requirements
INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-DOC-001', 'Completed Claim Form', 'Original completed SHA claim form with all required fields filled', 'document', TRUE, 1, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-DOC-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-DOC-002', 'Medical Report', 'Detailed medical report from attending physician with diagnosis and treatment plan', 'document', TRUE, 2, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-DOC-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-DOC-003', 'Laboratory Results', 'All relevant laboratory test results and reports', 'document', TRUE, 3, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-DOC-003');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-DOC-004', 'Prescription Records', 'Copy of prescriptions and medication records with dosages', 'document', TRUE, 4, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-DOC-004');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-DOC-005', 'Invoice/Bill', 'Original invoice or bill for services rendered with itemized charges', 'document', TRUE, 5, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-DOC-005');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-INFO-001', 'Patient Identification', 'Valid patient ID number and insurance card copy', 'information', TRUE, 6, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-INFO-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-INFO-002', 'Member Details', 'Complete member information including membership number and policy details', 'information', TRUE, 7, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-INFO-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-INFO-003', 'Diagnosis Codes', 'ICD-10 diagnosis codes for all conditions treated', 'information', TRUE, 8, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-INFO-003');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @sha_template_id, 'SHA-VER-001', 'Coverage Verification', 'Verification that service is covered under patient plan', 'verification', TRUE, 9, TRUE
WHERE @sha_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @sha_template_id AND requirementCode = 'SHA-VER-001');

-- ============================================
-- NHIF (National Hospital Insurance Fund) Requirements
-- ============================================
SET @nhif_provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'NHIF' OR providerName LIKE '%NHIF%' OR providerName LIKE '%National Hospital%' LIMIT 1);

INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
SELECT
    @nhif_provider_id,
    'NHIF Standard Claim Requirements',
    'Standard checklist of requirements for submitting NHIF insurance claims',
    TRUE,
    TRUE,
    NULL
WHERE @nhif_provider_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM claim_requirement_templates WHERE providerId = @nhif_provider_id AND isActive = 1);

SET @nhif_template_id = (SELECT templateId FROM claim_requirement_templates WHERE providerId = @nhif_provider_id AND isActive = 1 LIMIT 1);

-- NHIF Requirements
INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-DOC-001', 'NHIF Claim Form', 'Completed NHIF claim form (Form 1) with all sections filled', 'document', TRUE, 1, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-DOC-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-DOC-002', 'Medical Report', 'Comprehensive medical report signed by attending physician', 'document', TRUE, 2, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-DOC-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-DOC-003', 'NHIF Card Copy', 'Clear copy of valid NHIF membership card (front and back)', 'document', TRUE, 3, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-DOC-003');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-DOC-004', 'National ID Copy', 'Copy of patient national ID or birth certificate', 'document', TRUE, 4, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-DOC-004');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-DOC-005', 'Invoice/Receipt', 'Original invoice or receipt for services rendered', 'document', TRUE, 5, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-DOC-005');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-INFO-001', 'Member Number', 'Valid NHIF member number and contribution status', 'information', TRUE, 6, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-INFO-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-INFO-002', 'Service Dates', 'Accurate dates of service provision (admission and discharge if applicable)', 'information', TRUE, 7, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-INFO-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @nhif_template_id, 'NHIF-VER-001', 'Provider Accreditation', 'Verification of facility accreditation with NHIF', 'verification', TRUE, 8, TRUE
WHERE @nhif_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @nhif_template_id AND requirementCode = 'NHIF-VER-001');

-- ============================================
-- AAR Insurance Requirements
-- ============================================
SET @aar_provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'AAR' OR providerName LIKE '%AAR%' LIMIT 1);

INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
SELECT
    @aar_provider_id,
    'AAR Standard Claim Requirements',
    'Standard checklist of requirements for submitting AAR insurance claims',
    TRUE,
    TRUE,
    NULL
WHERE @aar_provider_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM claim_requirement_templates WHERE providerId = @aar_provider_id AND isActive = 1);

SET @aar_template_id = (SELECT templateId FROM claim_requirement_templates WHERE providerId = @aar_provider_id AND isActive = 1 LIMIT 1);

-- AAR Requirements
INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @aar_template_id, 'AAR-DOC-001', 'AAR Claim Form', 'Completed AAR medical claim form', 'document', TRUE, 1, TRUE
WHERE @aar_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @aar_template_id AND requirementCode = 'AAR-DOC-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @aar_template_id, 'AAR-DOC-002', 'Medical Report', 'Detailed medical report with diagnosis and treatment', 'document', TRUE, 2, TRUE
WHERE @aar_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @aar_template_id AND requirementCode = 'AAR-DOC-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @aar_template_id, 'AAR-DOC-003', 'Insurance Card Copy', 'Copy of valid AAR insurance card', 'document', TRUE, 3, TRUE
WHERE @aar_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @aar_template_id AND requirementCode = 'AAR-DOC-003');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @aar_template_id, 'AAR-DOC-004', 'Invoice/Receipt', 'Original invoice or receipt', 'document', TRUE, 4, TRUE
WHERE @aar_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @aar_template_id AND requirementCode = 'AAR-DOC-004');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @aar_template_id, 'AAR-INFO-001', 'Policy Number', 'Valid AAR policy number and member details', 'information', TRUE, 5, TRUE
WHERE @aar_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @aar_template_id AND requirementCode = 'AAR-INFO-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @aar_template_id, 'AAR-VER-001', 'Pre-Authorization', 'Pre-authorization number if required for the service', 'authorization', FALSE, 6, TRUE
WHERE @aar_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @aar_template_id AND requirementCode = 'AAR-VER-001');

-- ============================================
-- CIC Insurance Requirements
-- ============================================
SET @cic_provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'CIC' OR providerName LIKE '%CIC%' OR providerName LIKE '%Cooperative Insurance%' LIMIT 1);

INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
SELECT
    @cic_provider_id,
    'CIC Standard Claim Requirements',
    'Standard checklist of requirements for submitting CIC insurance claims',
    TRUE,
    TRUE,
    NULL
WHERE @cic_provider_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM claim_requirement_templates WHERE providerId = @cic_provider_id AND isActive = 1);

SET @cic_template_id = (SELECT templateId FROM claim_requirement_templates WHERE providerId = @cic_provider_id AND isActive = 1 LIMIT 1);

-- CIC Requirements
INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @cic_template_id, 'CIC-DOC-001', 'CIC Claim Form', 'Completed CIC medical claim form', 'document', TRUE, 1, TRUE
WHERE @cic_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @cic_template_id AND requirementCode = 'CIC-DOC-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @cic_template_id, 'CIC-DOC-002', 'Medical Report', 'Comprehensive medical report', 'document', TRUE, 2, TRUE
WHERE @cic_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @cic_template_id AND requirementCode = 'CIC-DOC-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @cic_template_id, 'CIC-DOC-003', 'Insurance Card', 'Copy of valid CIC insurance card', 'document', TRUE, 3, TRUE
WHERE @cic_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @cic_template_id AND requirementCode = 'CIC-DOC-003');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @cic_template_id, 'CIC-DOC-004', 'Invoice/Receipt', 'Original invoice or receipt', 'document', TRUE, 4, TRUE
WHERE @cic_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @cic_template_id AND requirementCode = 'CIC-DOC-004');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @cic_template_id, 'CIC-INFO-001', 'Policy Details', 'Policy number and member information', 'information', TRUE, 5, TRUE
WHERE @cic_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @cic_template_id AND requirementCode = 'CIC-INFO-001');

-- ============================================
-- Jubilee Insurance Requirements
-- ============================================
SET @jubilee_provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'JUBILEE' OR providerName LIKE '%Jubilee%' LIMIT 1);

INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
SELECT
    @jubilee_provider_id,
    'Jubilee Standard Claim Requirements',
    'Standard checklist of requirements for submitting Jubilee insurance claims',
    TRUE,
    TRUE,
    NULL
WHERE @jubilee_provider_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM claim_requirement_templates WHERE providerId = @jubilee_provider_id AND isActive = 1);

SET @jubilee_template_id = (SELECT templateId FROM claim_requirement_templates WHERE providerId = @jubilee_provider_id AND isActive = 1 LIMIT 1);

-- Jubilee Requirements
INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @jubilee_template_id, 'JUB-DOC-001', 'Jubilee Claim Form', 'Completed Jubilee medical claim form', 'document', TRUE, 1, TRUE
WHERE @jubilee_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @jubilee_template_id AND requirementCode = 'JUB-DOC-001');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @jubilee_template_id, 'JUB-DOC-002', 'Medical Report', 'Detailed medical report', 'document', TRUE, 2, TRUE
WHERE @jubilee_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @jubilee_template_id AND requirementCode = 'JUB-DOC-002');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @jubilee_template_id, 'JUB-DOC-003', 'Insurance Card', 'Copy of valid Jubilee insurance card', 'document', TRUE, 3, TRUE
WHERE @jubilee_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @jubilee_template_id AND requirementCode = 'JUB-DOC-003');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @jubilee_template_id, 'JUB-DOC-004', 'Invoice/Receipt', 'Original invoice or receipt', 'document', TRUE, 4, TRUE
WHERE @jubilee_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @jubilee_template_id AND requirementCode = 'JUB-DOC-004');

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
SELECT @jubilee_template_id, 'JUB-INFO-001', 'Policy Information', 'Policy number and member details', 'information', TRUE, 5, TRUE
WHERE @jubilee_template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM claim_requirements WHERE templateId = @jubilee_template_id AND requirementCode = 'JUB-INFO-001');

-- ============================================
-- Note: This script will only create requirements for providers that exist in your database
-- If a provider doesn't exist, that section will be skipped
-- You can run this script multiple times safely - it uses NOT EXISTS checks to prevent duplicates
-- ============================================






