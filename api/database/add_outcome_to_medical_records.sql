-- Migration: Add outcome column to medical_records table
-- Date: 2024
-- Description: Adds outcome field to track patient outcomes in medical records

ALTER TABLE medical_records 
ADD COLUMN outcome TEXT NULL AFTER treatment;


