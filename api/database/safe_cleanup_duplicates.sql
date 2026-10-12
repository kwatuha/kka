-- Safe Cleanup Script for Duplicate Departments and Wards
-- This script safely removes duplicates by migrating all related data first
-- IMPORTANT: Review the output before running the DELETE statements
-- 
-- DATA THAT WILL BE MIGRATED:
-- Departments:
--   - employee_positions (departmentId)
--   - employees (departmentId)
--   - employee_position_history (previousDepartmentId, newDepartmentId)
--   - budgets (departmentId)
--
-- Wards:
--   - beds (wardId)
--   - ward_transfers (fromWardId, toWardId)
--   - inpatient_admissions (wardId) - if table exists
--
-- Strategy: Keep the first active record (or first record if none active)
-- All related data will be migrated to the kept record before deactivation

USE kiplombe_hmis;

-- ============================================
-- PART 1: IDENTIFY DUPLICATES
-- ============================================

SELECT '=== STEP 1: IDENTIFYING DUPLICATE DEPARTMENTS ===' AS Report;

SELECT 
    departmentName,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(departmentId ORDER BY departmentId) as department_ids,
    GROUP_CONCAT(departmentCode ORDER BY departmentId) as codes,
    GROUP_CONCAT(isActive ORDER BY departmentId) as active_status
FROM departments
GROUP BY departmentName
HAVING COUNT(*) > 1;

SELECT '=== STEP 2: IDENTIFYING DUPLICATE WARDS ===' AS Report;

SELECT 
    wardName,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(wardId ORDER BY wardId) as ward_ids,
    GROUP_CONCAT(wardCode ORDER BY wardId) as codes,
    GROUP_CONCAT(isActive ORDER BY wardId) as active_status
FROM wards
GROUP BY wardName
HAVING COUNT(*) > 1;

-- ============================================
-- PART 2: SHOW DATA THAT WILL BE AFFECTED
-- ============================================

SELECT '=== STEP 3: DATA LINKED TO DUPLICATE DEPARTMENTS ===' AS Report;

SELECT 
    d.departmentName,
    d.departmentId,
    d.isActive,
    (SELECT COUNT(*) FROM employees WHERE departmentId = d.departmentId) as employee_count,
    (SELECT COUNT(*) FROM employee_positions WHERE departmentId = d.departmentId) as position_count,
    (SELECT COUNT(*) FROM budgets WHERE departmentId = d.departmentId) as budget_count
FROM departments d
WHERE EXISTS (
    SELECT 1 FROM departments d2 
    WHERE d2.departmentName = d.departmentName 
    AND d2.departmentId != d.departmentId
)
ORDER BY d.departmentName, d.departmentId;

SELECT '=== STEP 4: DATA LINKED TO DUPLICATE WARDS ===' AS Report;

SELECT 
    w.wardName,
    w.wardId,
    w.isActive,
    (SELECT COUNT(*) FROM beds WHERE wardId = w.wardId) as bed_count,
    (SELECT COUNT(*) FROM ward_transfers WHERE fromWardId = w.wardId OR toWardId = w.wardId) as transfer_count
FROM wards w
WHERE EXISTS (
    SELECT 1 FROM wards w2 
    WHERE w2.wardName = w.wardName 
    AND w2.wardId != w.wardId
)
ORDER BY w.wardName, w.wardId;

-- ============================================
-- PART 3: CREATE TEMPORARY TABLES FOR MIGRATION MAPPING
-- ============================================

CREATE TEMPORARY TABLE IF NOT EXISTS dept_migration_map (
    old_department_id INT,
    new_department_id INT,
    department_name VARCHAR(200),
    PRIMARY KEY (old_department_id)
);

CREATE TEMPORARY TABLE IF NOT EXISTS ward_migration_map (
    old_ward_id INT,
    new_ward_id INT,
    ward_name VARCHAR(200),
    PRIMARY KEY (old_ward_id)
);

-- ============================================
-- PART 4: POPULATE DEPARTMENT MIGRATION MAP
-- ============================================

SELECT '=== STEP 5: CREATING DEPARTMENT MIGRATION MAP ===' AS Report;

-- For each duplicate department, keep the first active one (or first one if none active)
INSERT INTO dept_migration_map (old_department_id, new_department_id, department_name)
SELECT 
    d1.departmentId as old_department_id,
    COALESCE(
        -- Try to find the first active department
        (SELECT MIN(d2.departmentId) 
         FROM departments d2 
         WHERE d2.departmentName = d1.departmentName 
         AND d2.isActive = TRUE),
        -- If no active, use the first one by ID
        (SELECT MIN(d2.departmentId) 
         FROM departments d2 
         WHERE d2.departmentName = d1.departmentName)
    ) as new_department_id,
    d1.departmentName
FROM departments d1
WHERE EXISTS (
    SELECT 1 FROM departments d2 
    WHERE d2.departmentName = d1.departmentName 
    AND d2.departmentId < d1.departmentId
)
AND d1.departmentId != COALESCE(
    (SELECT MIN(d2.departmentId) 
     FROM departments d2 
     WHERE d2.departmentName = d1.departmentName 
     AND d2.isActive = TRUE),
    (SELECT MIN(d2.departmentId) 
     FROM departments d2 
     WHERE d2.departmentName = d1.departmentName)
);

SELECT CONCAT('Created migration map for ', COUNT(*), ' duplicate departments') AS Result
FROM dept_migration_map;

-- ============================================
-- PART 5: MIGRATE DATA LINKED TO DEPARTMENTS
-- ============================================

SELECT '=== STEP 6: MIGRATING EMPLOYEE POSITIONS ===' AS Report;

UPDATE employee_positions ep
INNER JOIN dept_migration_map dmm ON ep.departmentId = dmm.old_department_id
SET ep.departmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' employee positions') AS Result;

SELECT '=== STEP 7: MIGRATING EMPLOYEES ===' AS Report;

UPDATE employees e
INNER JOIN dept_migration_map dmm ON e.departmentId = dmm.old_department_id
SET e.departmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' employees') AS Result;

SELECT '=== STEP 8: MIGRATING EMPLOYEE POSITION HISTORY (PREVIOUS) ===' AS Report;

UPDATE employee_position_history eph
INNER JOIN dept_migration_map dmm ON eph.previousDepartmentId = dmm.old_department_id
SET eph.previousDepartmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' previous department references') AS Result;

SELECT '=== STEP 9: MIGRATING EMPLOYEE POSITION HISTORY (NEW) ===' AS Report;

UPDATE employee_position_history eph
INNER JOIN dept_migration_map dmm ON eph.newDepartmentId = dmm.old_department_id
SET eph.newDepartmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' new department references') AS Result;

SELECT '=== STEP 10: MIGRATING BUDGETS ===' AS Report;

UPDATE budgets b
INNER JOIN dept_migration_map dmm ON b.departmentId = dmm.old_department_id
SET b.departmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' budgets') AS Result;

-- ============================================
-- PART 6: POPULATE WARD MIGRATION MAP
-- ============================================

SELECT '=== STEP 11: CREATING WARD MIGRATION MAP ===' AS Report;

INSERT INTO ward_migration_map (old_ward_id, new_ward_id, ward_name)
SELECT 
    w1.wardId as old_ward_id,
    COALESCE(
        -- Try to find the first active ward
        (SELECT MIN(w2.wardId) 
         FROM wards w2 
         WHERE w2.wardName = w1.wardName 
         AND w2.isActive = TRUE),
        -- If no active, use the first one by ID
        (SELECT MIN(w2.wardId) 
         FROM wards w2 
         WHERE w2.wardName = w1.wardName)
    ) as new_ward_id,
    w1.wardName
FROM wards w1
WHERE EXISTS (
    SELECT 1 FROM wards w2 
    WHERE w2.wardName = w1.wardName 
    AND w2.wardId < w1.wardId
)
AND w1.wardId != COALESCE(
    (SELECT MIN(w2.wardId) 
     FROM wards w2 
     WHERE w2.wardName = w1.wardName 
     AND w2.isActive = TRUE),
    (SELECT MIN(w2.wardId) 
     FROM wards w2 
     WHERE w2.wardName = w1.wardName)
);

SELECT CONCAT('Created migration map for ', COUNT(*), ' duplicate wards') AS Result
FROM ward_migration_map;

-- ============================================
-- PART 7: MIGRATE DATA LINKED TO WARDS
-- ============================================

SELECT '=== STEP 12: MIGRATING BEDS ===' AS Report;

-- Show beds that will be migrated
SELECT 
    wmm.ward_name,
    wmm.old_ward_id,
    wmm.new_ward_id,
    COUNT(b.bedId) as beds_to_migrate
FROM ward_migration_map wmm
LEFT JOIN beds b ON b.wardId = wmm.old_ward_id
GROUP BY wmm.ward_name, wmm.old_ward_id, wmm.new_ward_id;

-- Migrate beds
UPDATE beds b
INNER JOIN ward_migration_map wmm ON b.wardId = wmm.old_ward_id
SET b.wardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' beds') AS Result;

SELECT '=== STEP 13: MIGRATING WARD TRANSFERS (FROM WARD) ===' AS Report;

UPDATE ward_transfers wt
INNER JOIN ward_migration_map wmm ON wt.fromWardId = wmm.old_ward_id
SET wt.fromWardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' from ward references') AS Result;

SELECT '=== STEP 14: MIGRATING WARD TRANSFERS (TO WARD) ===' AS Report;

UPDATE ward_transfers wt
INNER JOIN ward_migration_map wmm ON wt.toWardId = wmm.old_ward_id
SET wt.toWardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' to ward references') AS Result;

SELECT '=== STEP 15: CHECKING INPATIENT_ADMISSIONS TABLE ===' AS Report;

-- Check if inpatient_admissions table exists and has wardId column
SET @table_exists = (
    SELECT COUNT(*) FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'inpatient_admissions'
);

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'inpatient_admissions' 
    AND COLUMN_NAME = 'wardId'
);

-- Migrate inpatient_admissions if both table and column exist
-- Using prepared statement to avoid errors if table doesn't exist
SET @sql = IF(
    @table_exists > 0 AND @column_exists > 0,
    'UPDATE inpatient_admissions ia INNER JOIN ward_migration_map wmm ON ia.wardId = wmm.old_ward_id SET ia.wardId = wmm.new_ward_id WHERE wmm.old_ward_id IS NOT NULL',
    'SELECT 0 as skipped'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
SET @migrated_count = IF(@table_exists > 0 AND @column_exists > 0, ROW_COUNT(), 0);
DEALLOCATE PREPARE stmt;

SELECT CONCAT('Checked inpatient_admissions. Migrated ', @migrated_count, ' records (if table exists)') AS Result;

-- ============================================
-- PART 8: DEACTIVATE DUPLICATE DEPARTMENTS
-- ============================================

SELECT '=== STEP 16: DEACTIVATING DUPLICATE DEPARTMENTS ===' AS Report;

UPDATE departments d
INNER JOIN dept_migration_map dmm ON d.departmentId = dmm.old_department_id
SET d.isActive = FALSE
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Deactivated ', ROW_COUNT(), ' duplicate departments') AS Result;

-- ============================================
-- PART 9: DEACTIVATE DUPLICATE WARDS
-- ============================================

SELECT '=== STEP 17: DEACTIVATING DUPLICATE WARDS ===' AS Report;

UPDATE wards w
INNER JOIN ward_migration_map wmm ON w.wardId = wmm.old_ward_id
SET w.isActive = FALSE
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Deactivated ', ROW_COUNT(), ' duplicate wards') AS Result;

-- ============================================
-- PART 10: VERIFICATION REPORT
-- ============================================

SELECT '=== STEP 18: VERIFICATION - REMAINING ACTIVE DEPARTMENTS ===' AS Report;

SELECT 
    departmentId,
    departmentCode,
    departmentName,
    description,
    location,
    isActive,
    (SELECT COUNT(*) FROM employees WHERE departmentId = d.departmentId) as employee_count,
    (SELECT COUNT(*) FROM employee_positions WHERE departmentId = d.departmentId) as position_count,
    (SELECT COUNT(*) FROM budgets WHERE departmentId = d.departmentId) as budget_count
FROM departments d
WHERE d.isActive = TRUE
ORDER BY departmentName;

SELECT '=== STEP 19: VERIFICATION - REMAINING ACTIVE WARDS ===' AS Report;

SELECT 
    w.wardId,
    w.wardCode,
    w.wardName,
    w.wardType,
    w.capacity,
    w.location,
    w.isActive,
    (SELECT COUNT(*) FROM beds WHERE wardId = w.wardId) as bed_count,
    (SELECT COUNT(*) FROM beds WHERE wardId = w.wardId AND status = 'occupied') as occupied_beds
FROM wards w
WHERE w.isActive = TRUE
ORDER BY w.wardName;

-- ============================================
-- PART 11: SUMMARY
-- ============================================

SELECT '=== CLEANUP SUMMARY ===' AS Report;

SELECT 
    (SELECT COUNT(*) FROM dept_migration_map) as departments_deactivated,
    (SELECT COUNT(*) FROM ward_migration_map) as wards_deactivated,
    (SELECT COUNT(*) FROM departments WHERE isActive = TRUE) as active_departments,
    (SELECT COUNT(*) FROM wards WHERE isActive = TRUE) as active_wards;

-- ============================================
-- CLEANUP TEMPORARY TABLES
-- ============================================

DROP TEMPORARY TABLE IF EXISTS dept_migration_map;
DROP TEMPORARY TABLE IF EXISTS ward_migration_map;

SELECT '=== CLEANUP COMPLETE ===' AS Status;
SELECT 'Duplicates have been deactivated. All related data has been migrated.' AS Note;
SELECT 'Review the verification reports above to confirm the cleanup was successful.' AS NextStep;

