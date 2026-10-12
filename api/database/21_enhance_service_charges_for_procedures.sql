-- Enhance service_charges to support Procedures and Orders/Consumables
-- Add chargeType field to categorize charges

ALTER TABLE service_charges 
ADD COLUMN chargeType ENUM('Service', 'Procedure', 'Consumable', 'Medication', 'Other') DEFAULT 'Service' AFTER chargeCode,
ADD COLUMN duration INT NULL COMMENT 'Duration in minutes (for procedures)' AFTER cost,
ADD COLUMN unit VARCHAR(50) NULL COMMENT 'Unit of measurement (for consumables: e.g., "per item", "per box", "per pack")' AFTER duration;

-- Update existing procedures to link with service_charges
-- This allows procedures to use the unified billing system
ALTER TABLE procedures
ADD COLUMN chargeId INT NULL AFTER cost,
ADD FOREIGN KEY (chargeId) REFERENCES service_charges(chargeId) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_charge_type ON service_charges(chargeType);
CREATE INDEX idx_procedure_charge ON procedures(chargeId);







