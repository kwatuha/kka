-- Add paymentReference to invoices (used when recording M-Pesa / batch receipts)
ALTER TABLE invoices
  ADD COLUMN paymentReference VARCHAR(100) NULL DEFAULT NULL AFTER paymentMethod;
