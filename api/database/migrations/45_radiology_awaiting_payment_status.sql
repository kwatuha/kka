-- Radiology orders: awaiting_payment until invoice is paid, then pending for imaging work
ALTER TABLE radiology_exam_orders
MODIFY COLUMN status ENUM(
  'awaiting_payment',
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
) DEFAULT 'pending';
