-- Cleanup Duplicate Departments
-- This script removes duplicate departments, keeping only the first occurrence

USE kiplombe_hmis;

-- First, identify duplicates
SELECT 
    departmentName,
    COUNT(*) as count,
    GROUP_CONCAT(departmentId ORDER BY departmentId) as ids
FROM departments
GROUP BY departmentName
HAVING COUNT(*) > 1;

-- Deactivate duplicates (keep the first one active)
UPDATE departments d1
INNER JOIN (
    SELECT 
        departmentName,
        MIN(departmentId) as keepId
    FROM departments
    WHERE isActive = TRUE
    GROUP BY departmentName
    HAVING COUNT(*) > 1
) d2 ON d1.departmentName = d2.departmentName
SET d1.isActive = FALSE
WHERE d1.departmentId != d2.keepId
AND d1.isActive = TRUE;

-- Alternative: Delete duplicates completely (uncomment if preferred)
-- DELETE d1 FROM departments d1
-- INNER JOIN (
--     SELECT 
--         departmentName,
--         MIN(departmentId) as keepId
--     FROM departments
--     GROUP BY departmentName
--     HAVING COUNT(*) > 1
-- ) d2 ON d1.departmentName = d2.departmentName
-- WHERE d1.departmentId != d2.keepId;

-- Show remaining active departments
SELECT 
    departmentId,
    departmentCode,
    departmentName,
    description,
    location,
    isActive
FROM departments
WHERE isActive = TRUE
ORDER BY departmentName;

