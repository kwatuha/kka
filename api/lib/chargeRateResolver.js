/**
 * Resolve unit price for a charge based on patient type (insurance vs cash) and latest applicable rate.
 * Used by billing (invoice create/update) and by inpatient bill generation.
 *
 * @param {object} db - Pool or connection with .execute()
 * @param {number} patientId - Patient ID
 * @param {object} item - { chargeId, quantity } (quantity default 1)
 * @param {string} asOfDate - Date for effective rate YYYY-MM-DD
 * @param {object} options - Optional: { wardId, wardType } for inpatient; when provided, use these for rate lookup instead of current admission (e.g. for discharged patients or bill generation)
 * @returns {Promise<{ unitPrice: number, totalPrice: number }>}
 */
async function resolveChargeRate(db, patientId, item, asOfDate, options = {}) {
    const chargeId = item.chargeId;
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

    const [chargeRows] = await db.execute(
        'SELECT cost, name FROM service_charges WHERE chargeId = ? AND (status = "Active" OR status = "Inactive")',
        [chargeId]
    );
    let unitPrice = 0;
    if (chargeRows.length > 0) {
        unitPrice = parseFloat(chargeRows[0].cost) || 0;
    }

    const [patientRows] = await db.execute(
        'SELECT patientType FROM patients WHERE patientId = ?',
        [patientId]
    );
    const patientType = patientRows.length > 0 ? (patientRows[0].patientType || 'paying') : 'paying';

    let wardId = options.wardId ?? null;
    let wardType = options.wardType ?? null;
    if (wardId == null && wardType == null) {
        const [adm] = await db.execute(
            `SELECT b.wardId, w.wardType
             FROM admissions a
             JOIN beds b ON a.bedId = b.bedId
             JOIN wards w ON b.wardId = w.wardId
             WHERE a.patientId = ? AND a.status = 'admitted' AND a.dischargeDate IS NULL
             ORDER BY a.admissionDate DESC LIMIT 1`,
            [patientId]
        );
        if (adm.length > 0) {
            wardId = adm[0].wardId;
            wardType = adm[0].wardType || null;
        }
    }

    if (patientType === 'insurance' && chargeId) {
        const [ins] = await db.execute(
            `SELECT providerId FROM patient_insurance
             WHERE patientId = ? AND isActive = 1
               AND (coverageEndDate IS NULL OR coverageEndDate >= ?)
             ORDER BY coverageStartDate DESC LIMIT 1`,
            [patientId, asOfDate]
        );
        if (ins.length > 0) {
            try {
                const [ruleRows] = await db.execute(
                    `SELECT amount
                     FROM charge_rate_rules
                     WHERE chargeId = ?
                       AND payerType = 'insurance'
                       AND providerId = ?
                       AND startDate <= ?
                       AND (endDate IS NULL OR endDate >= ?)
                       AND (wardId IS NULL OR wardId = ?)
                       AND (wardType IS NULL OR wardType = ?)
                     ORDER BY
                       CASE
                         WHEN wardId IS NOT NULL AND wardId = ? THEN 3
                         WHEN wardType IS NOT NULL AND wardType = ? THEN 2
                         ELSE 1
                       END DESC,
                       priority DESC,
                       startDate DESC
                     LIMIT 1`,
                    [chargeId, ins[0].providerId, asOfDate, asOfDate, wardId, wardType, wardId, wardType]
                );
                if (ruleRows.length > 0) {
                    unitPrice = parseFloat(ruleRows[0].amount) || unitPrice;
                } else {
                    const [rateRows] = await db.execute(
                        `SELECT amount FROM insurance_charge_rates
                         WHERE chargeId = ? AND providerId = ? AND startDate <= ? AND (endDate IS NULL OR endDate >= ?)
                         ORDER BY startDate DESC LIMIT 1`,
                        [chargeId, ins[0].providerId, asOfDate, asOfDate]
                    );
                    if (rateRows.length > 0) {
                        unitPrice = parseFloat(rateRows[0].amount) || unitPrice;
                    }
                }
            } catch (ruleErr) {
                if (!(ruleErr && (ruleErr.code === 'ER_NO_SUCH_TABLE' || ruleErr.errno === 1146))) {
                    throw ruleErr;
                }
                const [rateRows] = await db.execute(
                    `SELECT amount FROM insurance_charge_rates
                     WHERE chargeId = ? AND providerId = ? AND startDate <= ? AND (endDate IS NULL OR endDate >= ?)
                     ORDER BY startDate DESC LIMIT 1`,
                    [chargeId, ins[0].providerId, asOfDate, asOfDate]
                );
                if (rateRows.length > 0) {
                    unitPrice = parseFloat(rateRows[0].amount) || unitPrice;
                }
            }
        }
    } else if (patientType === 'paying' && chargeId) {
        let rate = null;
        try {
            const [ruleRows] = await db.execute(
                `SELECT amount
                 FROM charge_rate_rules
                 WHERE chargeId = ?
                   AND payerType = 'cash'
                   AND startDate <= ?
                   AND (endDate IS NULL OR endDate >= ?)
                   AND providerId IS NULL
                   AND (wardId IS NULL OR wardId = ?)
                   AND (wardType IS NULL OR wardType = ?)
                 ORDER BY
                   CASE
                     WHEN wardId IS NOT NULL AND wardId = ? THEN 3
                     WHEN wardType IS NOT NULL AND wardType = ? THEN 2
                     ELSE 1
                   END DESC,
                   priority DESC,
                   startDate DESC
                 LIMIT 1`,
                [chargeId, asOfDate, asOfDate, wardId, wardType, wardId, wardType]
            );
            if (ruleRows.length > 0) rate = parseFloat(ruleRows[0].amount);
        } catch (ruleErr) {
            if (!(ruleErr && (ruleErr.code === 'ER_NO_SUCH_TABLE' || ruleErr.errno === 1146))) {
                throw ruleErr;
            }
        }
        if (rate == null && (wardId != null || wardType != null)) {
            if (wardId) {
                const [rw] = await db.execute(
                    `SELECT amount FROM inpatient_charge_rates
                     WHERE chargeId = ? AND wardId = ? AND startDate <= ? AND (endDate IS NULL OR endDate >= ?)
                     ORDER BY startDate DESC LIMIT 1`,
                    [chargeId, wardId, asOfDate, asOfDate]
                );
                if (rw.length > 0) rate = parseFloat(rw[0].amount);
            }
            if (rate == null && wardType) {
                const [rt] = await db.execute(
                    `SELECT amount FROM inpatient_charge_rates
                     WHERE chargeId = ? AND wardId IS NULL AND wardType = ? AND startDate <= ? AND (endDate IS NULL OR endDate >= ?)
                     ORDER BY startDate DESC LIMIT 1`,
                    [chargeId, wardType, asOfDate, asOfDate]
                );
                if (rt.length > 0) rate = parseFloat(rt[0].amount);
            }
        }
        if (rate == null) {
            const [rd] = await db.execute(
                `SELECT amount FROM inpatient_charge_rates
                 WHERE chargeId = ? AND wardId IS NULL AND wardType IS NULL AND startDate <= ? AND (endDate IS NULL OR endDate >= ?)
                 ORDER BY startDate DESC LIMIT 1`,
                [chargeId, asOfDate, asOfDate]
            );
            if (rd.length > 0) rate = parseFloat(rd[0].amount);
        }
        if (rate != null) unitPrice = rate;
    }

    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
    return { unitPrice, totalPrice };
}

module.exports = { resolveChargeRate };
