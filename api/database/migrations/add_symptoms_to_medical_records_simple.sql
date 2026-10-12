-- ============================================
-- SIMPLE MIGRATION: Add symptoms, historyOfPresentIllness, and physicalExamination columns
-- ============================================
-- This is a simpler version that will work on all MySQL versions
-- If columns already exist, you may get errors - that's okay, just ignore them
-- 
-- Usage: mysql -u username -p database_name < add_symptoms_to_medical_records_simple.sql

ALTER TABLE medical_records
ADD COLUMN symptoms TEXT NULL AFTER chiefComplaint;

ALTER TABLE medical_records
ADD COLUMN historyOfPresentIllness TEXT NULL AFTER symptoms;

ALTER TABLE medical_records
ADD COLUMN physicalExamination TEXT NULL AFTER historyOfPresentIllness;

