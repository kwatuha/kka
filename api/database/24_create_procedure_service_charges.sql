-- Create service charges for all existing procedures
-- This script creates service_charges entries with chargeType = 'Procedure'
-- and links them back to the procedures table

-- Step 1: Insert service charges for procedures that don't have a chargeId yet
INSERT INTO service_charges (chargeCode, name, category, cost, status, chargeType, duration)
SELECT
    p.procedureCode,
    p.procedureName,
    p.category,
    p.cost,
    CASE WHEN p.isActive = 1 THEN 'Active' ELSE 'Inactive' END,
    'Procedure',
    p.duration
FROM procedures p
WHERE p.chargeId IS NULL
  AND p.isActive = 1
  AND p.procedureCode IS NOT NULL
  AND p.procedureCode != ''
  AND NOT EXISTS (
    SELECT 1 FROM service_charges sc
    WHERE sc.chargeCode = p.procedureCode
  );

-- Step 2: Update existing service charges to have chargeType = 'Procedure' if they match procedure codes
UPDATE service_charges sc
INNER JOIN procedures p ON sc.chargeCode = p.procedureCode
SET sc.chargeType = 'Procedure',
    sc.name = p.procedureName,
    sc.cost = p.cost,
    sc.category = p.category,
    sc.duration = p.duration,
    sc.status = CASE WHEN p.isActive = 1 THEN 'Active' ELSE 'Inactive' END
WHERE sc.chargeType != 'Procedure'
  AND p.isActive = 1;

-- Step 3: Update procedures to link them to their service charges
UPDATE procedures p
INNER JOIN service_charges sc ON sc.chargeCode = p.procedureCode
    AND sc.chargeType = 'Procedure'
SET p.chargeId = sc.chargeId
WHERE p.chargeId IS NULL;
