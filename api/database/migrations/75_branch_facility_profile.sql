-- Branch / facility profile for letterheads, receipts, and invoices.
-- Each branch can override logo, contact details, and receipt footer text.

DROP PROCEDURE IF EXISTS add_branch_profile_column;
DELIMITER //
CREATE PROCEDURE add_branch_profile_column(
    IN p_column_name VARCHAR(64),
    IN p_column_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'branches'
          AND COLUMN_NAME = p_column_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE branches ADD COLUMN ', p_column_name, ' ', p_column_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL add_branch_profile_column('postalAddress', 'VARCHAR(255) NULL AFTER address');
CALL add_branch_profile_column('website', 'VARCHAR(255) NULL AFTER email');
CALL add_branch_profile_column('logoUrl', 'VARCHAR(500) NULL COMMENT ''Public path or URL for facility logo on documents'' AFTER website');
CALL add_branch_profile_column('letterheadTitle', 'VARCHAR(255) NULL COMMENT ''Display name on receipts and official documents'' AFTER logoUrl');
CALL add_branch_profile_column('receiptHeader', 'TEXT NULL COMMENT ''Optional extra header line on receipts'' AFTER letterheadTitle');
CALL add_branch_profile_column('receiptFooter', 'TEXT NULL COMMENT ''Footer on receipts and invoices'' AFTER receiptHeader');

DROP PROCEDURE IF EXISTS add_branch_profile_column;

-- Kakamega main facility defaults (safe to re-run)
UPDATE branches
SET
  branchName = 'Kakamega County General Teaching & Referral Hospital',
  letterheadTitle = COALESCE(NULLIF(letterheadTitle, ''), 'Kakamega County General Teaching & Referral Hospital'),
  address = COALESCE(NULLIF(address, ''), 'Kisumu-Kakamega Road, Kakamega'),
  postalAddress = COALESCE(NULLIF(postalAddress, ''), 'P.O. Box 15-50100, Kakamega'),
  phone = COALESCE(NULLIF(phone, ''), '0720 295739'),
  email = COALESCE(NULLIF(email, ''), 'wpgh15@yahoo.com'),
  logoUrl = COALESCE(NULLIF(logoUrl, ''), '/kakamega-facility-logo.svg'),
  receiptFooter = COALESCE(
    NULLIF(receiptFooter, ''),
    'Thank you for choosing Kakamega County General Teaching & Referral Hospital. Open 24 hours.'
  ),
  notes = COALESCE(NULLIF(notes, ''), 'Level 5 county referral hospital — primary Kakamega County HMIS facility')
WHERE branchCode = 'KAK-CRH'
   OR (isMainBranch = 1 AND branchName LIKE '%Kakamega%');
