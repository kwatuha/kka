-- Ensure lab_test_orders.status includes awaiting_payment (required for invoice-before-lab workflow).
-- Safe to run if 43_lab_awaiting_payment_status.sql was already applied.
ALTER TABLE lab_test_orders
MODIFY COLUMN status ENUM(
  'awaiting_payment',
  'pending',
  'sample_collected',
  'in_progress',
  'completed',
  'cancelled'
) DEFAULT 'pending';
