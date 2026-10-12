-- Map laboratory units to the test types they offer; seed all active labs with full catalog

CREATE TABLE IF NOT EXISTS laboratory_test_offerings (
  offeringId INT AUTO_INCREMENT PRIMARY KEY,
  labId INT NOT NULL,
  testTypeId INT NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lab_test_offering (labId, testTypeId),
  KEY idx_offering_test (testTypeId),
  KEY idx_offering_lab_active (labId, isActive),
  CONSTRAINT fk_offering_lab FOREIGN KEY (labId) REFERENCES laboratories(labId) ON DELETE CASCADE,
  CONSTRAINT fk_offering_test FOREIGN KEY (testTypeId) REFERENCES lab_test_types(testTypeId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every active lab offers every active catalog test (safe default for existing sites)
INSERT INTO laboratory_test_offerings (labId, testTypeId, isActive)
SELECT l.labId, t.testTypeId, 1
FROM laboratories l
CROSS JOIN lab_test_types t
WHERE l.isActive = 1
  AND t.isActive = 1
  AND NOT EXISTS (
    SELECT 1 FROM laboratory_test_offerings o
    WHERE o.labId = l.labId AND o.testTypeId = t.testTypeId
  );
