/**
 * Registration fee (REG-FEE) — used by patient registration and triage flows.
 *
 * - If the active REG-FEE (or matching name) service charge has cost > 0, return it for invoicing.
 * - If missing, or cost is 0 / null: amount is 0 → callers should NOT create invoices or cashier queue.
 * - Facilities that waive registration permanently should set the charge to 0 in Administration → Service charges.
 * - To enable billing later, set the amount > 0 on the same charge (no code change).
 *
 * @param {import('mysql2/promise').PoolConnection} connection
 * @returns {Promise<{ amount: number, chargeId: number | null, configured: boolean }>}
 */
async function resolveRegistrationFeeAmount(connection) {
    const [rows] = await connection.execute(
        `SELECT chargeId, cost FROM service_charges
         WHERE (chargeCode = 'REG-FEE' OR name LIKE '%Registration%Fee%')
         AND status = 'Active'
         LIMIT 1`
    );

    if (!rows.length) {
        return { amount: 0, chargeId: null, configured: false };
    }

    const raw = rows[0].cost;
    const amount = Math.max(0, parseFloat(raw != null ? raw : 0) || 0);
    return {
        amount,
        chargeId: rows[0].chargeId,
        configured: true,
    };
}

module.exports = { resolveRegistrationFeeAmount };
