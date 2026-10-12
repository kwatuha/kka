const { normalizeStatutoryConfig, DEFAULT_STATUTORY_CONFIG } = require('./kenyaStatutoryPayroll');

function parseRow(row) {
    if (!row) return null;
    let payeBandsJson = row.payeBandsJson;
    if (typeof payeBandsJson === 'string') {
        try {
            payeBandsJson = JSON.parse(payeBandsJson);
        } catch {
            payeBandsJson = DEFAULT_STATUTORY_CONFIG.payeBands;
        }
    }
    return {
        ...row,
        payeBandsJson,
        payeBands: payeBandsJson,
    };
}

function rowToComputeConfig(row) {
    return normalizeStatutoryConfig(parseRow(row));
}

async function getActiveStatutoryRateSet(executor, asOfDate) {
    const asOf = asOfDate || new Date().toISOString().slice(0, 10);
    try {
        const [rows] = await executor.query(
            `SELECT *
             FROM payroll_statutory_rate_sets
             WHERE isArchived = 0
               AND effectiveFrom <= ?
               AND (effectiveTo IS NULL OR effectiveTo >= ?)
             ORDER BY effectiveFrom DESC, rateSetId DESC
             LIMIT 1`,
            [asOf, asOf]
        );
        if (rows.length > 0) {
            return rowToComputeConfig(rows[0]);
        }
    } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE') {
            console.warn('statutory rate set lookup failed:', err.message);
        }
    }
    return normalizeStatutoryConfig(DEFAULT_STATUTORY_CONFIG);
}

async function listRateSets(executor, { includeArchived = false } = {}) {
    try {
        const [rows] = await executor.query(
            `SELECT rateSetId, code, label, effectiveFrom, effectiveTo,
                    personalReliefMonthly, nssfRate, nssfTier1Ceiling, nssfTier2Ceiling,
                    shifRate, housingLevyRate, payeBandsJson, kraReferenceUrl, notes,
                    isArchived, createdAt, updatedAt
             FROM payroll_statutory_rate_sets
             WHERE (? = 1 OR isArchived = 0)
             ORDER BY effectiveFrom DESC, rateSetId DESC`,
            [includeArchived ? 1 : 0]
        );
        return rows.map(parseRow);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') return [];
        throw err;
    }
}

async function getRateSetById(executor, rateSetId) {
    const [rows] = await executor.execute(
        'SELECT * FROM payroll_statutory_rate_sets WHERE rateSetId = ?',
        [parseInt(rateSetId, 10)]
    );
    return rows.length ? parseRow(rows[0]) : null;
}

function validateRateSetPayload(body) {
    const errors = [];
    if (!body.code || !String(body.code).trim()) errors.push('code is required');
    if (!body.label || !String(body.label).trim()) errors.push('label is required');
    if (!body.effectiveFrom) errors.push('effectiveFrom is required');
    const bands = body.payeBands || body.payeBandsJson;
    if (!Array.isArray(bands) || bands.length === 0) errors.push('payeBands must be a non-empty array');
    if (bands) {
        for (const b of bands) {
            if (b.rate == null || Number.isNaN(Number(b.rate))) errors.push('each PAYE band needs a rate');
        }
    }
    return errors;
}

async function createRateSet(executor, body, createdBy) {
    const errors = validateRateSetPayload(body);
    if (errors.length) {
        const err = new Error(errors.join('; '));
        err.statusCode = 400;
        throw err;
    }
    const bands = body.payeBands || body.payeBandsJson;
    const [result] = await executor.execute(
        `INSERT INTO payroll_statutory_rate_sets (
            code, label, effectiveFrom, effectiveTo,
            personalReliefMonthly, nssfRate, nssfTier1Ceiling, nssfTier2Ceiling,
            shifRate, housingLevyRate, payeBandsJson, kraReferenceUrl, notes, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            String(body.code).trim(),
            String(body.label).trim(),
            body.effectiveFrom,
            body.effectiveTo || null,
            parseFloat(body.personalReliefMonthly ?? 2400),
            parseFloat(body.nssfRate ?? 0.06),
            parseFloat(body.nssfTier1Ceiling ?? 7000),
            parseFloat(body.nssfTier2Ceiling ?? 36000),
            parseFloat(body.shifRate ?? 0.0275),
            parseFloat(body.housingLevyRate ?? 0.015),
            JSON.stringify(bands),
            body.kraReferenceUrl || null,
            body.notes || null,
            createdBy || null,
        ]
    );
    return getRateSetById(executor, result.insertId);
}

async function updateRateSet(executor, rateSetId, body) {
    const existing = await getRateSetById(executor, rateSetId);
    if (!existing) {
        const err = new Error('Rate set not found');
        err.statusCode = 404;
        throw err;
    }
    const bands = body.payeBands ?? body.payeBandsJson ?? existing.payeBandsJson;
    const payload = {
        code: body.code ?? existing.code,
        label: body.label ?? existing.label,
        effectiveFrom: body.effectiveFrom ?? existing.effectiveFrom,
        effectiveTo: body.effectiveTo !== undefined ? body.effectiveTo : existing.effectiveTo,
        personalReliefMonthly: body.personalReliefMonthly ?? existing.personalReliefMonthly,
        nssfRate: body.nssfRate ?? existing.nssfRate,
        nssfTier1Ceiling: body.nssfTier1Ceiling ?? existing.nssfTier1Ceiling,
        nssfTier2Ceiling: body.nssfTier2Ceiling ?? existing.nssfTier2Ceiling,
        shifRate: body.shifRate ?? existing.shifRate,
        housingLevyRate: body.housingLevyRate ?? existing.housingLevyRate,
        payeBands: bands,
        kraReferenceUrl: body.kraReferenceUrl !== undefined ? body.kraReferenceUrl : existing.kraReferenceUrl,
        notes: body.notes !== undefined ? body.notes : existing.notes,
    };
    const errors = validateRateSetPayload(payload);
    if (errors.length) {
        const err = new Error(errors.join('; '));
        err.statusCode = 400;
        throw err;
    }
    await executor.execute(
        `UPDATE payroll_statutory_rate_sets SET
            code = ?, label = ?, effectiveFrom = ?, effectiveTo = ?,
            personalReliefMonthly = ?, nssfRate = ?, nssfTier1Ceiling = ?, nssfTier2Ceiling = ?,
            shifRate = ?, housingLevyRate = ?, payeBandsJson = ?, kraReferenceUrl = ?, notes = ?
         WHERE rateSetId = ?`,
        [
            String(payload.code).trim(),
            String(payload.label).trim(),
            payload.effectiveFrom,
            payload.effectiveTo || null,
            parseFloat(payload.personalReliefMonthly),
            parseFloat(payload.nssfRate),
            parseFloat(payload.nssfTier1Ceiling),
            parseFloat(payload.nssfTier2Ceiling),
            parseFloat(payload.shifRate),
            parseFloat(payload.housingLevyRate),
            JSON.stringify(payload.payeBands),
            payload.kraReferenceUrl || null,
            payload.notes || null,
            parseInt(rateSetId, 10),
        ]
    );
    return getRateSetById(executor, rateSetId);
}

async function archiveRateSet(executor, rateSetId) {
    await executor.execute(
        'UPDATE payroll_statutory_rate_sets SET isArchived = 1 WHERE rateSetId = ?',
        [parseInt(rateSetId, 10)]
    );
    return getRateSetById(executor, rateSetId);
}

module.exports = {
    getActiveStatutoryRateSet,
    listRateSets,
    getRateSetById,
    createRateSet,
    updateRateSet,
    archiveRateSet,
    rowToComputeConfig,
    parseRow,
};
