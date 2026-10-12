-- Fix mojibake temperature unit (Ã‚Â°C → °C) in critical vitals config
UPDATE critical_vital_ranges
SET unit = CONCAT(CHAR(0xC2, 0xB0 USING utf8mb4), 'C'),
    updatedAt = NOW()
WHERE vitalParameter = 'temperature'
  AND (
    unit IS NULL
    OR unit <> CONCAT(CHAR(0xC2, 0xB0 USING utf8mb4), 'C')
    OR unit LIKE '%Ã%'
    OR unit LIKE '%Â%'
  );

-- Same repair if lab critical ranges were corrupted the same way
UPDATE lab_critical_value_ranges
SET unit = CONCAT(CHAR(0xC2, 0xB0 USING utf8mb4), 'C'),
    updatedAt = NOW()
WHERE unit LIKE '%Ã%°%C%'
   OR unit LIKE '%Â°C%'
   OR unit = 'Ã‚Â°C';
