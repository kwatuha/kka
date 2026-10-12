-- ============================================
-- Add 'waived' status to invoices table
-- ============================================
-- This migration adds 'waived' as a valid status for invoices
-- when bills are fully waived through the bill waiver system

-- Modify the status ENUM to include 'waived'
ALTER TABLE invoices
MODIFY COLUMN status ENUM('draft', 'pending', 'partial', 'paid', 'waived', 'cancelled') DEFAULT 'pending';

-- Update existing invoices that have approved full waivers to 'waived' status
UPDATE invoices i
INNER JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId
SET i.status = 'waived'
WHERE bw.status = 'approved'
  AND bw.isFullWaiver = 1
  AND i.balance <= 0;


