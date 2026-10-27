/** Age helpers for guardian / dependant workflows (SHA, telemedicine). */

export function ageYearsFromDateOfBirth(dateOfBirth?: string | null, asOf = new Date()): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  let age = asOf.getFullYear() - dob.getFullYear()
  const m = asOf.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

export function isPatientMinor(dateOfBirth?: string | null, thresholdYears = 18): boolean {
  const age = ageYearsFromDateOfBirth(dateOfBirth)
  return age != null && age < thresholdYears
}

export function isDependantIdType(idType?: string | null): boolean {
  return /birth certificate/i.test(String(idType || ""))
}
