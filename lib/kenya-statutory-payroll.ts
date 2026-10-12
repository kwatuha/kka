/**
 * Kenya monthly payroll statutory estimates (client helpers + fallback).
 * Production calculations use DB rate sets via POST /api/payroll/statutory-preview.
 */

export type PayeBand = { upTo: number | null; rate: number }

export type StatutoryRateConfig = {
  rateSetId?: number | null
  code?: string
  label?: string
  personalReliefMonthly: number
  nssfRate: number
  nssfTier1Ceiling: number
  nssfTier2Ceiling: number
  shifRate: number
  housingLevyRate: number
  payeBands: PayeBand[]
}

export const DEFAULT_STATUTORY_CONFIG: StatutoryRateConfig = {
  label: "Kenya 2024/25-style (verify on KRA calculator)",
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
}

export type KenyaStatutoryInput = {
  grossPay: number
}

export type KenyaStatutoryResult = {
  grossPay: number
  nssfEmployee: number
  shif: number
  housingLevyEmployee: number
  taxablePay: number
  paye: number
  totalStatutory: number
  netAfterStatutory: number
  rateSetLabel: string
  rateSetId?: number | null
  rateSetCode?: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function normalizeStatutoryConfig(raw?: Partial<StatutoryRateConfig> | null): StatutoryRateConfig {
  if (!raw) return { ...DEFAULT_STATUTORY_CONFIG, payeBands: [...DEFAULT_STATUTORY_CONFIG.payeBands] }
  const bands = raw.payeBands?.length ? raw.payeBands : DEFAULT_STATUTORY_CONFIG.payeBands
  return {
    rateSetId: raw.rateSetId ?? null,
    code: raw.code,
    label: raw.label ?? DEFAULT_STATUTORY_CONFIG.label,
    personalReliefMonthly: Number(raw.personalReliefMonthly ?? DEFAULT_STATUTORY_CONFIG.personalReliefMonthly),
    nssfRate: Number(raw.nssfRate ?? DEFAULT_STATUTORY_CONFIG.nssfRate),
    nssfTier1Ceiling: Number(raw.nssfTier1Ceiling ?? DEFAULT_STATUTORY_CONFIG.nssfTier1Ceiling),
    nssfTier2Ceiling: Number(raw.nssfTier2Ceiling ?? DEFAULT_STATUTORY_CONFIG.nssfTier2Ceiling),
    shifRate: Number(raw.shifRate ?? DEFAULT_STATUTORY_CONFIG.shifRate),
    housingLevyRate: Number(raw.housingLevyRate ?? DEFAULT_STATUTORY_CONFIG.housingLevyRate),
    payeBands: bands.map((b, i, arr) => ({
      upTo: b.upTo == null ? (i === arr.length - 1 ? null : 0) : Number(b.upTo),
      rate: Number(b.rate),
    })),
  }
}

function computeNssfEmployee(grossPay: number, config: StatutoryRateConfig): number {
  const g = Math.max(grossPay, 0)
  const tier1 = Math.min(g, config.nssfTier1Ceiling) * config.nssfRate
  const tier2Base = Math.min(Math.max(g - config.nssfTier1Ceiling, 0), config.nssfTier2Ceiling - config.nssfTier1Ceiling)
  const tier2 = tier2Base * config.nssfRate
  return round2(tier1 + tier2)
}

function computeShif(grossPay: number, config: StatutoryRateConfig): number {
  return round2(Math.max(grossPay, 0) * config.shifRate)
}

function computeHousingLevyEmployee(grossPay: number, config: StatutoryRateConfig): number {
  return round2(Math.max(grossPay, 0) * config.housingLevyRate)
}

function computePayeMonthly(taxablePay: number, config: StatutoryRateConfig): number {
  let remaining = Math.max(taxablePay, 0)
  let tax = 0
  for (const band of config.payeBands) {
    if (remaining <= 0) break
    const ceiling = band.upTo == null ? remaining : band.upTo
    const slice = Math.min(remaining, ceiling)
    tax += slice * band.rate
    remaining -= slice
  }
  return round2(Math.max(0, tax - config.personalReliefMonthly))
}

/** Offline / fallback only — prefer payrollApi.statutoryPreview in UI. */
export function computeKenyaStatutoryDeductions(
  input: KenyaStatutoryInput,
  statutoryConfig?: Partial<StatutoryRateConfig> | null
): KenyaStatutoryResult {
  const config = normalizeStatutoryConfig(statutoryConfig)
  const grossPay = round2(Math.max(input.grossPay, 0))
  const nssfEmployee = computeNssfEmployee(grossPay, config)
  const shif = computeShif(grossPay, config)
  const housingLevyEmployee = computeHousingLevyEmployee(grossPay, config)
  const taxablePay = round2(Math.max(0, grossPay - nssfEmployee - shif - housingLevyEmployee))
  const paye = computePayeMonthly(taxablePay, config)
  const totalStatutory = round2(paye + nssfEmployee + shif + housingLevyEmployee)
  const netAfterStatutory = round2(grossPay - totalStatutory)

  return {
    grossPay,
    nssfEmployee,
    shif,
    housingLevyEmployee,
    taxablePay,
    paye,
    totalStatutory,
    netAfterStatutory,
    rateSetLabel: config.label || DEFAULT_STATUTORY_CONFIG.label!,
    rateSetId: config.rateSetId,
    rateSetCode: config.code,
  }
}
