-- Comprehensive Cleanup Script for Duplicate Departments and Wards
-- This script safely removes duplicates by migrating all related data first
-- IMPORTANT: Review the output before running the DELETE statements

USE kiplombe_hmis;

-- ============================================
-- PART 1: IDENTIFY DUPLICATES
-- ============================================

SELECT '=== DUPLICATE DEPARTMENTS ===' AS Report;

SELECT 
    departmentName,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(departmentId ORDER BY departmentId) as department_ids,
    GROUP_CONCAT(departmentCode ORDER BY departmentId) as codes,
    GROUP_CONCAT(isActive ORDER BY departmentId) as active_status
FROM departments
GROUP BY departmentName
HAVING COUNT(*) > 1;

SELECT '=== DUPLICATE WARDS ===' AS Report;

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
-- PART 2: CREATE TEMPORARY TABLES FOR MIGRATION MAPPING
-- ============================================

-- Create temporary table for department migration mapping
CREATE TEMPORARY TABLE IF NOT EXISTS dept_migration_map (
    old_department_id INT,
    new_department_id INT,
    department_name VARCHAR(200),
    PRIMARY KEY (old_department_id)
);

-- Create temporary table for ward migration mapping
CREATE TEMPORARY TABLE IF NOT EXISTS ward_migration_map (
    old_ward_id INT,
    new_ward_id INT,
    ward_name VARCHAR(200),
    PRIMARY KEY (old_ward_id)
);

-- ============================================
-- PART 3: POPULATE DEPARTMENT MIGRATION MAP
-- ============================================

-- For each duplicate department name, keep the first active one (or first one if none active)
-- Strategy: Keep the department with the lowest ID that is active, or lowest ID if none are active
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

-- ============================================
-- PART 4: MIGRATE DATA LINKED TO DEPARTMENTS
-- ============================================

SELECT '=== MIGRATING EMPLOYEE POSITIONS ===' AS Report;

-- Migrate employee_positions
UPDATE employee_positions ep
INNER JOIN dept_migration_map dmm ON ep.departmentId = dmm.old_department_id
SET ep.departmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' employee positions') AS Result;

SELECT '=== MIGRATING EMPLOYEES ===' AS Report;

-- Migrate employees
UPDATE employees e
INNER JOIN dept_migration_map dmm ON e.departmentId = dmm.old_department_id
SET e.departmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' employees') AS Result;

SELECT '=== MIGRATING EMPLOYEE POSITION HISTORY (PREVIOUS) ===' AS Report;

-- Migrate employee_position_history - previousDepartmentId
UPDATE employee_position_history eph
INNER JOIN dept_migration_map dmm ON eph.previousDepartmentId = dmm.old_department_id
SET eph.previousDepartmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' previous department references') AS Result;

SELECT '=== MIGRATING EMPLOYEE POSITION HISTORY (NEW) ===' AS Report;

-- Migrate employee_position_history - newDepartmentId
UPDATE employee_position_history eph
INNER JOIN dept_migration_map dmm ON eph.newDepartmentId = dmm.old_department_id
SET eph.newDepartmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' new department references') AS Result;

SELECT '=== MIGRATING BUDGETS ===' AS Report;

-- Migrate budgets
UPDATE budgets b
INNER JOIN dept_migration_map dmm ON b.departmentId = dmm.old_department_id
SET b.departmentId = dmm.new_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' budgets') AS Result;

-- ============================================
-- PART 5: POPULATE WARD MIGRATION MAP
-- ============================================

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

-- ============================================
-- PART 6: MIGRATE DATA LINKED TO WARDS
-- ============================================

SELECT '=== MIGRATING BEDS ===' AS Report;

-- Migrate beds (need to handle carefully - beds reference wards)
-- First, check if there are beds in duplicate wards
SELECT 
    wmm.ward_name,
    COUNT(b.bedId) as beds_to_migrate
FROM ward_migration_map wmm
LEFT JOIN beds b ON b.wardId = wmm.old_ward_id
GROUP BY wmm.ward_name, wmm.old_ward_id;

-- Migrate beds
UPDATE beds b
INNER JOIN ward_migration_map wmm ON b.wardId = wmm.old_ward_id
SET b.wardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' beds') AS Result;

SELECT '=== MIGRATING WARD TRANSFERS (FROM WARD) ===' AS Report;

-- Migrate ward_transfers - fromWardId
UPDATE ward_transfers wt
INNER JOIN ward_migration_map wmm ON wt.fromWardId = wmm.old_ward_id
SET wt.fromWardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' from ward references') AS Result;

SELECT '=== MIGRATING WARD TRANSFERS (TO WARD) ===' AS Report;

-- Migrate ward_transfers - toWardId
UPDATE ward_transfers wt
INNER JOIN ward_migration_map wmm ON wt.toWardId = wmm.old_ward_id
SET wt.toWardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' to ward references') AS Result;

-- Check if inpatient_admissions table exists and migrate if it has wardId
SELECT '=== CHECKING INPATIENT_ADMISSIONS TABLE ===' AS Report;

SET @has_inpatient_admissions = (
    SELECT COUNT(*) FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'inpatient_admissions'
    AND TABLE_TYPE = 'BASE TABLE'
);

-- Migrate inpatient_admissions if table exists
UPDATE inpatient_admissions ia
INNER JOIN ward_migration_map wmm ON ia.wardId = wmm.old_ward_id
SET ia.wardId = wmm.new_ward_id
WHERE wmm.old_ward_id IS NOT NULL
AND @has_inpatient_admissions > 0;

SELECT CONCAT('Migrated ', IFNULL(ROW_COUNT(), 0), ' inpatient admissions') AS Result;

-- ============================================
-- PART 7: DEACTIVATE DUPLICATE DEPARTMENTS
-- ============================================

SELECT '=== DEACTIVATING DUPLICATE DEPARTMENTS ===' AS Report;

UPDATE departments d
INNER JOIN dept_migration_map dmm ON d.departmentId = dmm.old_department_id
SET d.isActive = FALSE
WHERE dmm.old_department_id IS NOT NULL;

SELECT CONCAT('Deactivated ', ROW_COUNT(), ' duplicate departments') AS Result;

-- ============================================
-- PART 8: DEACTIVATE DUPLICATE WARDS
-- ============================================

SELECT '=== DEACTIVATING DUPLICATE WARDS ===' AS Report;

UPDATE wards w
INNER JOIN ward_migration_map wmm ON w.wardId = wmm.old_ward_id
SET w.isActive = FALSE
WHERE wmm.old_ward_id IS NOT NULL;

SELECT CONCAT('Deactivated ', ROW_COUNT(), ' duplicate wards') AS Result;

-- ============================================
-- PART 9: VERIFICATION REPORT
-- ============================================

SELECT '=== VERIFICATION: REMAINING ACTIVE DEPARTMENTS ===' AS Report;

SELECT 
    departmentId,
    departmentCode,
    departmentName,
    description,
    location,
    isActive,
    (SELECT COUNT(*) FROM employees WHERE departmentId = d.departmentId) as employee_count,
    (SELECT COUNT(*) FROM employee_positions WHERE departmentId = d.departmentId) as position_count
FROM departments d
WHERE d.isActive = TRUE
ORDER BY departmentName;

SELECT '=== VERIFICATION: REMAINING ACTIVE WARDS ===' AS Report;

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
-- PART 10: OPTIONAL - PERMANENTLY DELETE DUPLICATES
-- ============================================
-- UNCOMMENT THE FOLLOWING IF YOU WANT TO PERMANENTLY DELETE (NOT RECOMMENDED)
-- This will permanently remove duplicate records after migration

/*
SELECT '=== PERMANENTLY DELETING DUPLICATE DEPARTMENTS ===' AS Warning;

DELETE d FROM departments d
INNER JOIN dept_migration_map dmm ON d.departmentId = dmm.old_department_id
WHERE dmm.old_department_id IS NOT NULL;

SELECT '=== PERMANENTLY DELETING DUPLICATE WARDS ===' AS Warning;

DELETE w FROM wards w
INNER JOIN ward_migration_map wmm ON w.wardId = wmm.old_ward_id
WHERE wmm.old_ward_id IS NOT NULL;
*/

-- ============================================
-- CLEANUP TEMPORARY TABLES
-- ============================================

DROP TEMPORARY TABLE IF EXISTS dept_migration_map;
DROP TEMPORARY TABLE IF EXISTS ward_migration_map;

SELECT '=== CLEANUP COMPLETE ===' AS Status;
SELECT 'Review the results above. Duplicates have been deactivated.' AS Note;
SELECT 'To permanently delete, uncomment the DELETE statements at the end of this script.' AS Warning;

