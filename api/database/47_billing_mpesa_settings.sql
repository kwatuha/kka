-- Configurable M-Pesa Paybill / account reference for hospital adoption (no app redeploy).
-- STK API keys stay in env: CLOUD_SASA_CLIENT_ID, CLOUD_SASA_CLIENT_SECRET, MPESA_CALLBACK_URL.

CREATE TABLE IF NOT EXISTS billing_mpesa_settings (
  settingId TINYINT NOT NULL PRIMARY KEY,
  paybillNumber VARCHAR(16) NOT NULL DEFAULT '1269093',
  accountPrefix VARCHAR(32) NOT NULL DEFAULT 'AZ',
  accountReferenceMode VARCHAR(32) NOT NULL DEFAULT 'prefix_invoice',
  stkEnabled TINYINT(1) NOT NULL DEFAULT 1,
  showPaybillInstructions TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(512) NULL,
  updatedBy INT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO billing_mpesa_settings
  (settingId, paybillNumber, accountPrefix, accountReferenceMode, stkEnabled, showPaybillInstructions)
VALUES (1, '1269093', 'AZ', 'prefix_invoice', 1, 1);

-- STK session audit columns are added at API startup if missing (see mpesaStk.ensureTables).
