/**
 * WHO-inspired pediatric growth screening (demo / MCH evidence).
 * Uses interpolated median weight-for-length (0–5y) and BMI-for-age bands (5–19y).
 * Not a substitute for full WHO Anthro LMS — suitable for HMIS alerts and DHA demos.
 */

/** Length/height (cm) → approximate median weight (kg), blended reference */
const MEDIAN_WEIGHT_FOR_LENGTH: [number, number][] = [
  [45, 2.5],
  [55, 4.2],
  [65, 7.4],
  [75, 9.2],
  [85, 11.8],
  [95, 14.1],
  [105, 17.0],
  [115, 20.2],
  [120, 22.0],
]

/** Age (months) → overweight BMI threshold (approx WHO 5–19, simplified) */
const BMI_OVERWEIGHT_BY_AGE_MONTHS: [number, number][] = [
  [60, 17.0],
  [84, 16.5],
  [120, 17.0],
  [156, 18.0],
  [180, 19.0],
  [228, 21.0],
]

export type GrowthCategory =
  | "severe_acute_malnutrition"
  | "moderate_acute_malnutrition"
  | "normal"
  | "overweight"
  | "unknown"

export type GrowthAssessment = {
  ageMonths: number
  ageLabel: string
  weightKg: number | null
  heightCm: number | null
  bmi: number | null
  category: GrowthCategory
  method: "weight-for-length" | "bmi-for-age" | "none"
  summary: string
}

function interpolate(table: [number, number][], x: number): number | null {
  if (table.length === 0) return null
  if (x <= table[0][0]) return table[0][1]
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1]
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i]
    const [x1, y1] = table[i + 1]
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return null
}

export function ageInMonths(dateOfBirth: string | Date, asOf: Date = new Date()): number | null {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  let months = (asOf.getFullYear() - dob.getFullYear()) * 12 + (asOf.getMonth() - dob.getMonth())
  if (asOf.getDate() < dob.getDate()) months -= 1
  return Math.max(0, months)
}

function formatAgeLabel(months: number): string {
  if (months < 24) return `${months} mo`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem ? `${years}y ${rem}mo` : `${years}y`
}

function categoryLabel(c: GrowthCategory): string {
  switch (c) {
    case "severe_acute_malnutrition":
      return "Possible severe acute malnutrition — refer / MUAC & WHO chart"
    case "moderate_acute_malnutrition":
      return "Possible moderate undernutrition — nutrition counselling"
    case "overweight":
      return "Possible overweight — lifestyle / follow-up"
    case "normal":
      return "Within expected range (screening)"
    default:
      return "Insufficient data for growth screening"
  }
}

function assessWeightForLength(weightKg: number, heightCm: number): GrowthCategory {
  const expected = interpolate(MEDIAN_WEIGHT_FOR_LENGTH, heightCm)
  if (!expected || expected <= 0) return "unknown"
  const ratio = weightKg / expected
  if (ratio < 0.7) return "severe_acute_malnutrition"
  if (ratio < 0.85) return "moderate_acute_malnutrition"
  if (ratio > 1.2) return "overweight"
  return "normal"
}

function assessBmiForAge(bmi: number, ageMonths: number): GrowthCategory {
  const thin = ageMonths < 120 ? 14.5 : 16.0
  const severeThin = ageMonths < 120 ? 13.5 : 15.0
  const overweight = interpolate(BMI_OVERWEIGHT_BY_AGE_MONTHS, ageMonths) ?? 21
  if (bmi < severeThin) return "severe_acute_malnutrition"
  if (bmi < thin) return "moderate_acute_malnutrition"
  if (bmi >= overweight) return "overweight"
  return "normal"
}

/** Screen latest weight + height for patients under 20 years. */
export function assessPediatricGrowth(input: {
  dateOfBirth?: string | null
  weightKg?: number | null
  heightCm?: number | null
  asOf?: Date
}): GrowthAssessment | null {
  const { dateOfBirth, weightKg, heightCm, asOf = new Date() } = input
  if (!dateOfBirth) return null
  const ageMonths = ageInMonths(dateOfBirth, asOf)
  if (ageMonths == null || ageMonths >= 240) return null

  const weight = weightKg != null && weightKg > 0 ? Number(weightKg) : null
  const height = heightCm != null && heightCm > 0 ? Number(heightCm) : null
  const bmi = weight && height ? Number((weight / (height / 100) ** 2).toFixed(1)) : null

  let category: GrowthCategory = "unknown"
  let method: GrowthAssessment["method"] = "none"

  if (ageMonths < 60 && weight && height && height >= 45 && height <= 120) {
    method = "weight-for-length"
    category = assessWeightForLength(weight, height)
  } else if (ageMonths >= 24 && bmi != null) {
    method = "bmi-for-age"
    category = assessBmiForAge(bmi, ageMonths)
  }

  return {
    ageMonths,
    ageLabel: formatAgeLabel(ageMonths),
    weightKg: weight,
    heightCm: height,
    bmi,
    category,
    method,
    summary: categoryLabel(category),
  }
}
