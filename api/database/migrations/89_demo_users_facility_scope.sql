-- Scope demo login users to Kakamega General (KAK-CRH) and add a small Matungu set
-- for multi-facility UAT. Password for non-admin demo users: password123
-- Hash: bcrypt rounds=10 for password123

SET @pw_hash := '$2b$10$A3Wd6nNynNmUAMCZUPUkiufP.P3C7AWuG6de1d0QymYEdkXcIvAse';

SET @crh_id := (SELECT branchId FROM branches WHERE branchCode = 'KAK-CRH' AND isActive = 1 LIMIT 1);
SET @mat_id := (SELECT branchId FROM branches WHERE branchCode = 'KAK-MAT' AND isActive = 1 LIMIT 1);

-- Fail soft if branches missing (local fresh DBs without Kakamega seed)
SET @crh_id := IFNULL(@crh_id, (SELECT branchId FROM branches WHERE isMainBranch = 1 AND isActive = 1 ORDER BY branchId LIMIT 1));
SET @mat_id := IFNULL(@mat_id, (SELECT branchId FROM branches WHERE isActive = 1 AND branchId <> @crh_id ORDER BY branchId LIMIT 1));

-- ---------------------------------------------------------------------------
-- Existing demo staff → home facility = Kakamega General (single branch)
-- ---------------------------------------------------------------------------
UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.isActive = 0, uba.isDefault = 0
WHERE u.username IN (
  'doctor1', 'cashier', 'registration', 'pharmacy', 'nurse1', 'receptionist1', 'labtech1'
)
  AND u.voided = 0;

INSERT INTO user_branch_assignments (userId, branchId, isDefault, canAccessAllBranches, isActive)
SELECT u.userId, @crh_id, 1, 0, 1
FROM users u
WHERE u.username IN (
  'doctor1', 'cashier', 'registration', 'pharmacy', 'nurse1', 'receptionist1', 'labtech1'
)
  AND u.voided = 0
  AND @crh_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_assignments x
    WHERE x.userId = u.userId AND x.branchId = @crh_id
  );

UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.isActive = 1, uba.isDefault = 1, uba.canAccessAllBranches = 0
WHERE u.username IN (
  'doctor1', 'cashier', 'registration', 'pharmacy', 'nurse1', 'receptionist1', 'labtech1'
)
  AND u.voided = 0
  AND uba.branchId = @crh_id;

UPDATE users
SET passwordHash = @pw_hash
WHERE username IN (
  'doctor1', 'cashier', 'registration', 'pharmacy', 'nurse1', 'receptionist1', 'labtech1'
)
  AND voided = 0;

-- Admin: keep all-facility access; default home = General
UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.isDefault = 0
WHERE u.username = 'admin' AND u.voided = 0;

UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.isActive = 1, uba.isDefault = 1, uba.canAccessAllBranches = 1
WHERE u.username = 'admin' AND u.voided = 0 AND uba.branchId = @crh_id;

INSERT INTO user_branch_assignments (userId, branchId, isDefault, canAccessAllBranches, isActive)
SELECT u.userId, @crh_id, 1, 1, 1
FROM users u
WHERE u.username = 'admin' AND u.voided = 0 AND @crh_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_assignments x
    WHERE x.userId = u.userId AND x.branchId = @crh_id
  );

UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.canAccessAllBranches = 1, uba.isActive = 1
WHERE u.username = 'admin' AND u.voided = 0;

-- ---------------------------------------------------------------------------
-- Matungu demo staff (subset for multi-facility demos)
-- ---------------------------------------------------------------------------
INSERT INTO users (username, email, passwordHash, firstName, lastName, roleId, department, isActive, voided)
SELECT 'matungu_doctor', 'matungu.doctor@kakamega.demo', @pw_hash, 'Matungu', 'Doctor', 2, 'Clinical', 1, 0
WHERE @mat_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'matungu_doctor');

INSERT INTO users (username, email, passwordHash, firstName, lastName, roleId, department, isActive, voided)
SELECT 'matungu_registration', 'matungu.registration@kakamega.demo', @pw_hash, 'Matungu', 'Registration', 5, 'Registration', 1, 0
WHERE @mat_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'matungu_registration');

INSERT INTO users (username, email, passwordHash, firstName, lastName, roleId, department, isActive, voided)
SELECT 'matungu_cashier', 'matungu.cashier@kakamega.demo', @pw_hash, 'Matungu', 'Cashier', 151, 'Billing', 1, 0
WHERE @mat_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'matungu_cashier');

INSERT INTO users (username, email, passwordHash, firstName, lastName, roleId, department, isActive, voided)
SELECT 'matungu_nurse', 'matungu.nurse@kakamega.demo', @pw_hash, 'Matungu', 'Nurse', 150, 'Triage', 1, 0
WHERE @mat_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'matungu_nurse');

UPDATE users
SET passwordHash = @pw_hash, isActive = 1, voided = 0
WHERE username IN ('matungu_doctor', 'matungu_registration', 'matungu_cashier', 'matungu_nurse');

INSERT INTO user_branch_assignments (userId, branchId, isDefault, canAccessAllBranches, isActive)
SELECT u.userId, @mat_id, 1, 0, 1
FROM users u
WHERE u.username IN ('matungu_doctor', 'matungu_registration', 'matungu_cashier', 'matungu_nurse')
  AND u.voided = 0
  AND @mat_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_assignments x
    WHERE x.userId = u.userId AND x.branchId = @mat_id
  );

UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.isActive = 1, uba.isDefault = 1, uba.canAccessAllBranches = 0
WHERE u.username IN ('matungu_doctor', 'matungu_registration', 'matungu_cashier', 'matungu_nurse')
  AND uba.branchId = @mat_id;

-- Deactivate any non-Matungu assignments for Matungu demo users
UPDATE user_branch_assignments uba
INNER JOIN users u ON u.userId = uba.userId
SET uba.isActive = 0, uba.isDefault = 0
WHERE u.username IN ('matungu_doctor', 'matungu_registration', 'matungu_cashier', 'matungu_nurse')
  AND uba.branchId <> @mat_id;
