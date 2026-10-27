const {
  createQueueEntry,
  checkExistingQueueEntry,
} = require('./queueService');

/** Machine-readable tag in queue_entries.notes for UI filters and badges. */
const LAB_RETURN_NOTE_TAG = '[lab-return]';

function buildLabReturnNotes(orderNumber, progress) {
  const ref = orderNumber ? `Order ${orderNumber}` : 'Lab order';
  const progressBit =
    progress && progress.actionable > 0
      ? ` (${progress.completed}/${progress.actionable} tests)`
      : '';
  return `${LAB_RETURN_NOTE_TAG} Lab results ready — ${ref}${progressBit}. Return for results review.`;
}

async function countOrderItemProgress(executor, orderId) {
  const [countRows] = await executor.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
     FROM lab_test_order_items
     WHERE orderId = ?`,
    [orderId],
  );
  const row = countRows[0] || {};
  return {
    total: Number(row.total) || 0,
    completed: Number(row.completed) || 0,
    cancelled: Number(row.cancelled) || 0,
  };
}

/**
 * When every non-cancelled lab item on an order is completed, return the patient to consultation queue.
 */
async function enqueueConsultationAfterLabOrderComplete(executor, { orderId, userId = null, req = null }) {
  const orderIdNum = Number(orderId);
  if (!Number.isFinite(orderIdNum) || orderIdNum <= 0) {
    return { enqueued: false, reason: 'invalid_order' };
  }

  const [orderRows] = await executor.execute(
    `SELECT lo.orderId, lo.orderNumber, lo.patientId, lo.medicalRecordId, lo.orderedBy, lo.branchId, lo.status
     FROM lab_test_orders lo
     WHERE lo.orderId = ?`,
    [orderIdNum],
  );
  const order = orderRows[0];
  if (!order?.patientId) {
    return { enqueued: false, reason: 'order_not_found' };
  }
  if (order.status === 'awaiting_payment' || order.status === 'cancelled') {
    return { enqueued: false, reason: 'order_not_ready' };
  }

  const progress = await countOrderItemProgress(executor, orderIdNum);
  const actionable = progress.total - progress.cancelled;
  if (actionable <= 0 || progress.completed < actionable) {
    return { enqueued: false, reason: 'pending_results', progress };
  }

  await executor.execute(
    `UPDATE lab_test_orders SET status = 'completed', updatedAt = NOW() WHERE orderId = ?`,
    [orderIdNum],
  );

  let doctorId = order.orderedBy || null;
  if (order.medicalRecordId) {
    const [recRows] = await executor.execute(
      'SELECT doctorId FROM medical_records WHERE recordId = ? LIMIT 1',
      [order.medicalRecordId],
    );
    if (recRows[0]?.doctorId) {
      doctorId = recRows[0].doctorId;
    }
  }

  const notes = buildLabReturnNotes(order.orderNumber, {
    completed: progress.completed,
    actionable,
  });
  const branchId = order.branchId || null;

  const existingQueueId = await checkExistingQueueEntry(executor, {
    patientId: order.patientId,
    servicePoint: 'consultation',
    branchId,
    servicePointId: null,
  });

  let queueId = existingQueueId;
  let updated = false;

  if (existingQueueId) {
    const [existingRows] = await executor.execute(
      'SELECT notes, priority FROM queue_entries WHERE queueId = ? LIMIT 1',
      [existingQueueId],
    );
    const existingNotes = String(existingRows[0]?.notes || '');
    if (!existingNotes.includes(LAB_RETURN_NOTE_TAG)) {
      await executor.execute(
        `UPDATE queue_entries
         SET notes = ?,
             doctorId = COALESCE(?, doctorId),
             priority = CASE WHEN priority = 'normal' THEN 'urgent' ELSE priority END
         WHERE queueId = ?`,
        [notes, doctorId, existingQueueId],
      );
      updated = true;
    }
  } else {
    queueId = await createQueueEntry(executor, {
      patientId: order.patientId,
      servicePoint: 'consultation',
      priority: 'urgent',
      notes,
      userId,
      doctorId,
      branchId,
      req,
      checkDuplicate: false,
    });
  }

  await executor.execute(
    `UPDATE queue_entries
     SET status = 'completed', endTime = COALESCE(endTime, NOW())
     WHERE patientId = ? AND servicePoint = 'laboratory'
       AND status IN ('waiting', 'called', 'serving')`,
    [order.patientId],
  );

  return {
    enqueued: true,
    queueId,
    updated: Boolean(updated),
    patientId: order.patientId,
    orderNumber: order.orderNumber,
  };
}

/** Update today's laboratory queue ticket while results are still coming in. */
async function updateLaboratoryQueueProgressNote(executor, { orderId, patientId }) {
  const progress = await countOrderItemProgress(executor, orderId);
  const actionable = progress.total - progress.cancelled;
  if (actionable <= 0 || progress.completed <= 0 || progress.completed >= actionable) {
    return { updated: false };
  }
  const note = `Lab in progress (${progress.completed}/${actionable} results ready)`;
  const [result] = await executor.execute(
    `UPDATE queue_entries
     SET notes = ?
     WHERE patientId = ? AND servicePoint = 'laboratory'
       AND status IN ('waiting', 'called', 'serving')
       AND DATE(arrivalTime) = CURDATE()`,
    [note, patientId],
  );
  return { updated: (result.affectedRows || 0) > 0, note, progress };
}

module.exports = {
  LAB_RETURN_NOTE_TAG,
  buildLabReturnNotes,
  enqueueConsultationAfterLabOrderComplete,
  updateLaboratoryQueueProgressNote,
};
