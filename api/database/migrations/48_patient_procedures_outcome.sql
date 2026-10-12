-- Outcome text for completed procedures (distinct from general notes / complications)
ALTER TABLE patient_procedures
  ADD COLUMN procedureOutcome TEXT NULL
  COMMENT 'Summary of procedure outcome / completion'
  AFTER complications;
