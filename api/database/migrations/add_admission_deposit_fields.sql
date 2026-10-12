ALTER TABLE admissions
ADD COLUMN depositAmount DECIMAL(15, 2) NULL AFTER expectedDischargeDate,
ADD COLUMN depositInvoiceId INT NULL AFTER depositAmount,
ADD COLUMN depositRequired TINYINT(1) NOT NULL DEFAULT 0 AFTER depositInvoiceId,
ADD INDEX idx_deposit_invoice (depositInvoiceId),
ADD CONSTRAINT fk_admissions_deposit_invoice
  FOREIGN KEY (depositInvoiceId) REFERENCES invoices(invoiceId) ON DELETE SET NULL;

