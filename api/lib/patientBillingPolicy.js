/**
 * Central patient billing policy.
 * Non-paying patients skip cashier / awaiting_payment gates and go straight to clinical queues.
 * Emergency encounters also bypass payment until registration is completed (policy flag).
 */

const FEE_EXEMPT_TYPES = new Set(['non_paying']);

function isFeeExemptPatientType(patientType) {
  return FEE_EXEMPT_TYPES.has(String(patientType || '').toLowerCase());
}

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} executor
 * @param {number|string} patientId
 */
async function getPatientBillingPolicy(executor, patientId) {
  const pid = Number(patientId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return { patientId: null, patientType: 'paying', bypassPayment: false, isProvisional: false };
  }

  let row;
  try {
    const [rows] = await executor.execute(
      `SELECT patientId, patientType,
              COALESCE(isProvisional, 0) AS isProvisional
       FROM patients WHERE patientId = ? LIMIT 1`,
      [pid]
    );
    row = rows[0];
  } catch (err) {
    // Pre-migration DBs may lack isProvisional
    const [rows] = await executor.execute(
      `SELECT patientId, patientType FROM patients WHERE patientId = ? LIMIT 1`,
      [pid]
    );
    row = rows[0] ? { ...rows[0], isProvisional: 0 } : null;
  }

  if (!row) {
    return { patientId: pid, patientType: 'paying', bypassPayment: false, isProvisional: false };
  }

  const patientType = row.patientType || 'paying';
  const isProvisional = Boolean(Number(row.isProvisional));
  const bypassPayment = isFeeExemptPatientType(patientType);

  return {
    patientId: row.patientId,
    patientType,
    isProvisional,
    bypassPayment,
    reason: bypassPayment ? 'non_paying' : null,
  };
}

/**
 * Mark an invoice as waived (audit trail for free care) without cashier involvement.
 */
async function waiveInvoiceForExemptCare(executor, {
  invoiceId,
  userId = null,
  note = 'Non-paying patient — auto-waived',
} = {}) {
  if (!invoiceId) return;
  await executor.execute(
    `UPDATE invoices
     SET status = 'waived', balance = 0, paidAmount = COALESCE(paidAmount, 0),
         notes = CASE
           WHEN notes IS NULL OR notes = '' THEN ?
           ELSE CONCAT(notes, ' | ', ?)
         END,
         updatedAt = NOW()
     WHERE invoiceId = ?`,
    [note, note, invoiceId]
  );
  if (userId) {
    // best-effort; column may not exist on all installs
    try {
      await executor.execute(
        `UPDATE invoices SET updatedBy = ? WHERE invoiceId = ?`,
        [userId, invoiceId]
      );
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  FEE_EXEMPT_TYPES,
  isFeeExemptPatientType,
  getPatientBillingPolicy,
  waiveInvoiceForExemptCare,
};
