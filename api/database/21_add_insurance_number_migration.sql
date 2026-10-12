-- Migration: Add insuranceNumber column to patients table
-- Date: 2024
-- Description: Adds insuranceNumber field to store the patient's insurance policy/member number

-- Add insuranceNumber column if it doesn't exist
ALTER TABLE patients
ADD COLUMN insuranceNumber VARCHAR(100)
AFTER insuranceCompanyId;









