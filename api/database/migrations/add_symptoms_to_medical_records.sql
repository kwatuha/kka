-- ============================================
-- MIGRATION: Add symptoms, historyOfPresentIllness, and physicalExamination columns to medical_records
-- ============================================
-- This migration adds the missing columns that are used in the API routes
-- but were not included in the original table definition
-- 
-- Run this migration if your medical_records table doesn't have these columns
-- Usage: mysql -u username -p database_name < add_symptoms_to_medical_records.sql

-- Check if columns exist before adding (MySQL 8.0.19+)
-- For older MySQL versions, you may need to manually check or ignore errors

-- Add symptoms column
SET @dbname = DATABASE();
SET @tablename = "medical_records";
SET @columnname = "symptoms";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TEXT NULL AFTER chiefComplaint")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add historyOfPresentIllness column
SET @columnname = "historyOfPresentIllness";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TEXT NULL AFTER symptoms")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add physicalExamination column
SET @columnname = "physicalExamination";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TEXT NULL AFTER historyOfPresentIllness")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

