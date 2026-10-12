-- Lab orders: awaiting_payment until invoice is paid, then pending for lab work
ALTER TABLE lab_test_orders
MODIFY COLUMN status ENUM(
  'awaiting_payment',
  'pending',
  'sample_collected',
  'in_progress',
  'completed',
  'cancelled'
) DEFAULT 'pending';
