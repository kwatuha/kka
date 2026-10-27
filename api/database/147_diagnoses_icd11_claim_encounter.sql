-- ICD-11 codes for national eClaims (HMIS catalog is ICD-10; map via icd11Code).
-- Safe to re-run: skips if column already exists.

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diagnoses' AND COLUMN_NAME = 'icd11Code'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE diagnoses ADD COLUMN icd11Code VARCHAR(32) NULL AFTER icd10Code, ADD INDEX idx_diagnoses_icd11 (icd11Code)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed a few common OP mappings (extend via Admin / SQL as DHA validates interventions).
UPDATE diagnoses SET icd11Code = 'ca07.0' WHERE icd10Code = 'J06.9' AND (icd11Code IS NULL OR icd11Code = '');
UPDATE diagnoses SET icd11Code = 'ca07.0' WHERE icd10Code = 'J00' AND (icd11Code IS NULL OR icd11Code = '');
UPDATE diagnoses SET icd11Code = '1A00' WHERE icd10Code = 'B54' AND (icd11Code IS NULL OR icd11Code = '');
UPDATE diagnoses SET icd11Code = '5A11' WHERE icd10Code = 'E11.9' AND (icd11Code IS NULL OR icd11Code = '');
UPDATE diagnoses SET icd11Code = 'BA00' WHERE icd10Code = 'I10' AND (icd11Code IS NULL OR icd11Code = '');
