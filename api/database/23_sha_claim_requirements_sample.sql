-- ============================================
-- SHA CLAIM REQUIREMENTS SAMPLE DATA
-- ============================================
-- This file contains sample requirements for SHA claims
-- Adjust these requirements based on actual SHA claim submission requirements

-- First, get SHA provider ID (assuming SHA exists)
SET @sha_provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'SHA' LIMIT 1);

-- If SHA doesn't exist, you may need to create it first or adjust the provider ID
-- For now, we'll create a template that can be linked to SHA

-- Create SHA Claim Requirements Template
INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
VALUES (
    @sha_provider_id,
    'SHA Standard Claim Requirements',
    'Standard checklist of requirements for submitting SHA insurance claims',
    TRUE,
    TRUE,
    NULL
);

SET @sha_template_id = LAST_INSERT_ID();

-- Add individual requirements for SHA claims
-- These are example requirements - adjust based on actual SHA requirements

INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
VALUES
-- Document Requirements
(@sha_template_id, 'SHA-DOC-001', 'Completed Claim Form', 'Original completed SHA claim form with all required fields filled', 'document', TRUE, 1, TRUE),
(@sha_template_id, 'SHA-DOC-002', 'Medical Report', 'Detailed medical report from attending physician', 'document', TRUE, 2, TRUE),
(@sha_template_id, 'SHA-DOC-003', 'Laboratory Results', 'All relevant laboratory test results', 'document', TRUE, 3, TRUE),
(@sha_template_id, 'SHA-DOC-004', 'Prescription Records', 'Copy of prescriptions and medication records', 'document', TRUE, 4, TRUE),
(@sha_template_id, 'SHA-DOC-005', 'Invoice/Bill', 'Original invoice or bill for services rendered', 'document', TRUE, 5, TRUE),
(@sha_template_id, 'SHA-DOC-006', 'Receipts', 'Original receipts for all payments made', 'document', TRUE, 6, TRUE),

-- Information Requirements
(@sha_template_id, 'SHA-INFO-001', 'Patient Identification', 'Valid patient ID number and insurance card copy', 'information', TRUE, 7, TRUE),
(@sha_template_id, 'SHA-INFO-002', 'Member Details', 'Complete member information including membership number', 'information', TRUE, 8, TRUE),
(@sha_template_id, 'SHA-INFO-003', 'Service Dates', 'Accurate dates of service provision', 'information', TRUE, 9, TRUE),
(@sha_template_id, 'SHA-INFO-004', 'Diagnosis Codes', 'ICD-10 diagnosis codes for all conditions treated', 'information', TRUE, 10, TRUE),
(@sha_template_id, 'SHA-INFO-005', 'Procedure Codes', 'CPT/HCPCS procedure codes for all services provided', 'information', TRUE, 11, TRUE),

-- Verification Requirements
(@sha_template_id, 'SHA-VER-001', 'Authorization Verification', 'Pre-authorization number if required for the service', 'verification', FALSE, 12, TRUE),
(@sha_template_id, 'SHA-VER-002', 'Coverage Verification', 'Verification that service is covered under patient plan', 'verification', TRUE, 13, TRUE),
(@sha_template_id, 'SHA-VER-003', 'Provider Credentials', 'Verification of provider credentials and network status', 'verification', TRUE, 14, TRUE),

-- Additional Requirements
(@sha_template_id, 'SHA-ADD-001', 'Discharge Summary', 'Discharge summary for inpatient services (if applicable)', 'document', FALSE, 15, TRUE),
(@sha_template_id, 'SHA-ADD-002', 'Referral Letter', 'Referral letter if patient was referred (if applicable)', 'document', FALSE, 16, TRUE),
(@sha_template_id, 'SHA-ADD-003', 'Emergency Documentation', 'Emergency department notes if emergency services (if applicable)', 'document', FALSE, 17, TRUE);

-- Note: Adjust these requirements based on actual SHA claim submission requirements
-- You can add, remove, or modify requirements as needed









