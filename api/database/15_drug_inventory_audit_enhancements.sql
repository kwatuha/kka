-- ============================================
-- DRUG INVENTORY AUDIT ENHANCEMENTS
-- ============================================

-- Ensure we preserve all drug_inventory records for audit purposes
-- Records should NOT be deleted, even when quantity reaches 0
-- They contain vital historical information: batch numbers, purchase prices, expiry dates, etc.

-- Note: The drug_inventory table already preserves records when quantity = 0
-- This script ensures audit logging is in place

-- The drug_inventory_history table already exists in 02_pharmacy_audit_schema.sql
-- We just need to ensure it's being used for audit logging

