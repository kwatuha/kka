/**
 * Kenya monthly payroll statutory calculations.
 * Rates come from payroll_statutory_rate_sets when provided; otherwise DEFAULT_STATUTORY_CONFIG.
 */

const DEFAULT_STATUTORY_CONFIG = {
    rateSetId: null,
    code: 'built-in-fallback',
    label: 'Kenya 2024/25-style (verify on KRA calculator)',
    personalReliefMonthly: 2400,
    nssfRate: 0.06,
    nssfTier1Ceiling: 7000,
    nssfTier2Ceiling: 36000,
    shifRate: 0.0275,
    housingLevyRate: 0.015,
    payeBands: [
        { upTo: 24000, rate: 0.1 },
        { upTo: 8333, rate: 0.25 },
        { upTo: 467667, rate: 0.3 },
        { upTo: 300000, rate: 0.325 },
        { upTo: null, rate: 0.35 },
    ],
};

function round2(n) {
    return Math.round(n * 100) / 100;
}

function normalizePayeBands(bands) {
    if (!Array.isArray(bands) || bands.length === 0) {
        return DEFAULT_STATUTORY_CONFIG.payeBands;
    }
    return bands.map((b, i) => ({
        upTo: b.upTo == null || b.upTo === '' ? (i === bands.length - 1 ? null : 0) : Number(b.upTo),
        rate: Number(b.rate),
    }));
}

function normalizeStatutoryConfig(raw) {
    if (!raw) return { ...DEFAULT_STATUTORY_CONFIG, payeBands: [...DEFAULT_STATUTORY_CONFIG.payeBands] };
    let payeBands = raw.payeBands;
    if (!payeBands && raw.payeBandsJson) {
        try {
            payeBands = typeof raw.payeBandsJson === 'string' ? JSON.parse(raw.payeBandsJson) : raw.payeBandsJson;
        } catch {
            payeBands = DEFAULT_STATUTORY_CONFIG.payeBands;
        }
    }
    return {
        rateSetId: raw.rateSetId ?? null,
        code: raw.code || 'custom',
        label: raw.label || raw.rateSetLabel || DEFAULT_STATUTORY_CONFIG.label,
        personalReliefMonthly: Number(raw.personalReliefMonthly ?? DEFAULT_STATUTORY_CONFIG.personalReliefMonthly),
        nssfRate: Number(raw.nssfRate ?? DEFAULT_STATUTORY_CONFIG.nssfRate),
        nssfTier1Ceiling: Number(raw.nssfTier1Ceiling ?? DEFAULT_STATUTORY_CONFIG.nssfTier1Ceiling),
        nssfTier2Ceiling: Number(raw.nssfTier2Ceiling ?? DEFAULT_STATUTORY_CONFIG.nssfTier2Ceiling),
        shifRate: Number(raw.shifRate ?? DEFAULT_STATUTORY_CONFIG.shifRate),
        housingLevyRate: Number(raw.housingLevyRate ?? DEFAULT_STATUTORY_CONFIG.housingLevyRate),
        payeBands: normalizePayeBands(payeBands),
    };
}

function computeNssfEmployee(grossPay, config) {
    const g = Math.max(grossPay, 0);
    const tier1 = Math.min(g, config.nssfTier1Ceiling) * config.nssfRate;
    const tier2Base = Math.min(
        Math.max(g - config.nssfTier1Ceiling, 0),
        config.nssfTier2Ceiling - config.nssfTier1Ceiling
    );
    const tier2 = tier2Base * config.nssfRate;
    return round2(tier1 + tier2);
}

function computeShif(grossPay, config) {
    return round2(Math.max(grossPay, 0) * config.shifRate);
}

function computeHousingLevyEmployee(grossPay, config) {
    return round2(Math.max(grossPay, 0) * config.housingLevyRate);
}

function computePayeMonthly(taxablePay, config) {
    let remaining = Math.max(taxablePay, 0);
    let tax = 0;
    for (const band of config.payeBands) {
        if (remaining <= 0) break;
        const ceiling = band.upTo == null ? remaining : band.upTo;
        const slice = Math.min(remaining, ceiling);
        tax += slice * band.rate;
        remaining -= slice;
    }
    return round2(Math.max(0, tax - config.personalReliefMonthly));
}

function computeKenyaStatutoryDeductions(input, statutoryConfig) {
    const config = normalizeStatutoryConfig(statutoryConfig);
    const grossPay = round2(Math.max(input.grossPay, 0));
    const nssfEmployee = computeNssfEmployee(grossPay, config);
    const shif = computeShif(grossPay, config);
    const housingLevyEmployee = computeHousingLevyEmployee(grossPay, config);
    const taxablePay = round2(Math.max(0, grossPay - nssfEmployee - shif - housingLevyEmployee));
    const paye = computePayeMonthly(taxablePay, config);
    const totalStatutory = round2(paye + nssfEmployee + shif + housingLevyEmployee);
    const netAfterStatutory = round2(grossPay - totalStatutory);

    return {
        grossPay,
        nssfEmployee,
        shif,
        housingLevyEmployee,
        taxablePay,
        paye,
        totalStatutory,
        netAfterStatutory,
        rateSetLabel: config.label,
        rateSetId: config.rateSetId,
        rateSetCode: config.code,
    };
}

module.exports = {
    DEFAULT_STATUTORY_CONFIG,
    normalizeStatutoryConfig,
    computeKenyaStatutoryDeductions,
    computeNssfEmployee,
    computeShif,
    computeHousingLevyEmployee,
    computePayeMonthly,
};
