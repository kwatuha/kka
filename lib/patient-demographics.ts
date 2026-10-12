/** Shared patient demographics options (registration / KENHDD alignment). */

export const PATIENT_ID_TYPES = [
  "National ID",
  "Passport",
  "Birth Certificate",
  "Driver's License",
  "Other",
] as const

export type PatientIdType = (typeof PATIENT_ID_TYPES)[number]

export const NEXT_OF_KIN_RELATIONSHIPS = [
  "Parent",
  "Spouse",
  "Child",
  "Sibling",
  "Friend",
  "Other",
] as const

export type NextOfKinRelationship = (typeof NEXT_OF_KIN_RELATIONSHIPS)[number]

/** Common counties — extend as needed; Kakamega deployments default here. */
export const KENYA_COUNTIES = [
  "Kakamega",
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Uasin Gishu",
  "Kiambu",
  "Machakos",
  "Nyeri",
  "Meru",
  "Bungoma",
  "Vihiga",
  "Busia",
  "Kisii",
  "Nandi",
  "Trans Nzoia",
  "Other",
] as const

export type KenyaCounty = (typeof KENYA_COUNTIES)[number]

export const DEFAULT_FACILITY_COUNTY: KenyaCounty = "Kakamega"
