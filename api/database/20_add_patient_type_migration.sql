-- Migration: Add patientType and insuranceCompanyId columns to patients table
-- Date: 2024
-- Description: Adds patientType field to indicate if patient is paying or using insurance
--              and insuranceCompanyId to link to insurance_providers table

-- Add patientType column if it doesn't exist
ALTER TABLE patients
ADD COLUMN patientType ENUM('paying', 'insurance') DEFAULT 'paying'
AFTER gender;

-- Update existing patients to 'paying' if they have no patientType set
UPDATE patients
SET patientType = 'paying'
WHERE patientType IS NULL;

-- Add insuranceCompanyId column if it doesn't exist
ALTER TABLE patients
ADD COLUMN insuranceCompanyId INT
AFTER patientType;

-- Add foreign key constraint (will fail silently if it already exists)
-- Note: Run this manually if needed, as MySQL doesn't support conditional constraint creation
-- ALTER TABLE patients
-- ADD CONSTRAINT patients_ibfk_insurance
-- FOREIGN KEY (insuranceCompanyId) REFERENCES insurance_providers(providerId) ON DELETE SET NULL;

