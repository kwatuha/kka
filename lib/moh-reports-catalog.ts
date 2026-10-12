/**
 * Ministry of Health report catalog for the frontend.
 */

export type MohReportKind = "summary" | "register"

export type MohReportDef = {
  code: string
  title: string
  kind: MohReportKind
  /** Included in the primary MOH facility catalog (summaries/registers). */
  primaryMoh: boolean
  legacy?: boolean
  description: string
  includes: string[]
}

export const MOH_REPORTS_CATALOG: MohReportDef[] = [
  {
    code: "505",
    title: "MOH 505 — IDSR Weekly Epidemic Monitoring",
    kind: "summary",
    primaryMoh: true,
    description: "Notifiable / epidemic-prone disease counts for IDSR weekly reporting.",
    includes: ["AFP/polio", "Cholera", "Measles", "Meningitis", "VHF", "Malaria", "Rabies"],
  },
  {
    code: "705A",
    title: "MOH 705A — OPD Morbidity Under 5",
    kind: "summary",
    primaryMoh: true,
    description: "Outpatient morbidity summary for children under 5 years.",
    includes: ["Diarrhoea", "Pneumonia", "Malaria", "Malnutrition", "Injuries", "New attendances"],
  },
  {
    code: "705B",
    title: "MOH 705B — OPD Morbidity Over 5",
    kind: "summary",
    primaryMoh: true,
    description: "Outpatient morbidity summary for patients 5 years and above.",
    includes: ["Diarrhoea", "Pneumonia", "Malaria", "NCDs", "Injuries", "New attendances"],
  },
  {
    code: "706",
    title: "MOH 706 — Laboratory Summary",
    kind: "summary",
    primaryMoh: true,
    description: "Laboratory investigations performed in the reporting period.",
    includes: ["Total orders", "Completed tests", "Malaria / HIV / TB tests", "Tests by type"],
  },
  {
    code: "710",
    title: "MOH 710 — Immunizations Summary",
    kind: "summary",
    primaryMoh: true,
    description: "Vaccines and immunization doses administered (MOH 710).",
    includes: ["BCG", "OPV/IPV", "Pentavalent", "PCV", "Measles/MR", "HPV", "Vitamin A"],
  },
  {
    code: "711",
    title: "MOH 711 — Integrated RH / HIV / Malaria / TB / Nutrition",
    kind: "summary",
    primaryMoh: true,
    description: "National integrated facility form for RH, HIV, malaria, TB and nutrition.",
    includes: ["ANC", "Deliveries", "PNC", "FP", "HIV testing", "STI", "TB suspects", "Nutrition"],
  },
  {
    code: "717",
    title: "MOH 717 — Monthly Workload",
    kind: "summary",
    primaryMoh: true,
    description: "Hospital monthly service workload: OPD, IPD, maternity, lab, pharmacy.",
    includes: ["Outpatients", "Inpatients", "Deliveries", "Surgeries", "Lab", "Radiology", "Pharmacy"],
  },
  {
    code: "731",
    title: "MOH 731 — Comprehensive HIV Care & Treatment",
    kind: "summary",
    primaryMoh: true,
    description: "Primary HIV programme monthly summary (AIR / KHIS aligned).",
    includes: ["HTS", "HIV+", "ART", "Viral load", "TB screening", "PrEP", "PMTCT"],
  },
  {
    code: "740",
    title: "MOH 740 — Diabetes & Hypertension",
    kind: "summary",
    primaryMoh: true,
    description: "NCD monthly summary for diabetes and hypertension care.",
    includes: ["New DM", "New HTN", "Combined DM+HTN", "Follow-up", "Complications"],
  },
  {
    code: "745",
    title: "MOH 745 — Cancer Screening",
    kind: "summary",
    primaryMoh: true,
    description: "Cancer screening monthly summary (cervical, breast, prostate, colorectal).",
    includes: ["Cervical (VIA/HPV)", "Breast", "Prostate", "Colorectal", "Referrals"],
  },
  {
    code: "755",
    title: "MOH 755 — NCD / Mental Health Summary",
    kind: "summary",
    primaryMoh: true,
    description: "Selected NCD and mental health service counts.",
    includes: ["Mental health", "Asthma/COPD", "Sickle cell", "Epilepsy", "Substance use"],
  },
  {
    code: "204A",
    title: "MOH 204A — OPD Register Under 5",
    kind: "register",
    primaryMoh: true,
    description: "Line list of outpatient encounters for children under 5.",
    includes: ["Patient", "Age", "Sex", "Diagnosis", "Treatment", "Visit date"],
  },
  {
    code: "204B",
    title: "MOH 204B — OPD Register Over 5",
    kind: "register",
    primaryMoh: true,
    description: "Line list of outpatient encounters for patients 5 years and above.",
    includes: ["Patient", "Age", "Sex", "Diagnosis", "Treatment", "Visit date"],
  },
  {
    code: "240",
    title: "MOH 240 — Laboratory Register",
    kind: "register",
    primaryMoh: true,
    description: "Laboratory orders and tests for the period.",
    includes: ["Patient", "Test", "Indication", "Status", "Order date"],
  },
  {
    code: "301",
    title: "MOH 301 — Inpatient Register",
    kind: "register",
    primaryMoh: true,
    description: "Inpatient admissions for the reporting period.",
    includes: ["Patient", "Ward", "Admission", "Discharge", "Status"],
  },
  {
    code: "270",
    title: "MOH 270 — FP Permanent Register",
    kind: "register",
    primaryMoh: true,
    description: "Family planning permanent register line list.",
    includes: ["Patient", "Visit", "Diagnosis/treatment notes"],
  },
  {
    code: "274",
    title: "MOH 274 — FP Daily Activity",
    kind: "register",
    primaryMoh: true,
    description: "Family planning daily activity register.",
    includes: ["Patient", "Visit", "FP-related notes"],
  },
  {
    code: "275",
    title: "MOH 275 — FP Visit Information",
    kind: "register",
    primaryMoh: true,
    description: "Family planning visit information register.",
    includes: ["Patient", "Visit", "FP-related notes"],
  },
  {
    code: "512",
    title: "MOH 512 — Family Planning Register",
    kind: "register",
    primaryMoh: true,
    description: "Family planning register line list.",
    includes: ["Patient", "Visit", "FP-related notes"],
  },
  {
    code: "510",
    title: "MOH 510 — Immunization / Child Health Register",
    kind: "register",
    primaryMoh: true,
    description: "Immunization and child health register.",
    includes: ["Patient", "Age", "Immunization notes"],
  },
  {
    code: "511",
    title: "MOH 511 — Child Welfare Clinic Register",
    kind: "register",
    primaryMoh: true,
    description: "Child welfare clinic register for under-5s.",
    includes: ["Patient", "Age", "CWC notes"],
  },
  {
    code: "407A",
    title: "MOH 407A — Service Visit Register A",
    kind: "register",
    primaryMoh: true,
    description: "General service visit register (MOH 407A).",
    includes: ["Patient", "Department", "Diagnosis", "Visit date"],
  },
  {
    code: "407B",
    title: "MOH 407B — Service Visit Register B",
    kind: "register",
    primaryMoh: true,
    description: "General service visit register (MOH 407B).",
    includes: ["Patient", "Department", "Diagnosis", "Visit date"],
  },
  {
    code: "416",
    title: "MOH 416 — Service Register",
    kind: "register",
    primaryMoh: true,
    description: "Service register line list.",
    includes: ["Patient", "Department", "Diagnosis", "Visit date"],
  },
  {
    code: "417",
    title: "MOH 417 — Service Visit Register",
    kind: "register",
    primaryMoh: true,
    description: "Service visit register line list.",
    includes: ["Patient", "Department", "Diagnosis", "Visit date"],
  },
  {
    code: "419B",
    title: "MOH 419B — Service Register",
    kind: "register",
    primaryMoh: true,
    description: "Service register line list.",
    includes: ["Patient", "Department", "Diagnosis", "Visit date"],
  },
  {
    code: "420",
    title: "MOH 420 — Service Register",
    kind: "register",
    primaryMoh: true,
    description: "Service register line list.",
    includes: ["Patient", "Department", "Diagnosis", "Visit date"],
  },
  {
    code: "705",
    title: "MOH 705 — Morbidity (combined, legacy)",
    kind: "summary",
    primaryMoh: false,
    legacy: true,
    description: "Legacy combined morbidity view. Prefer 705A / 705B.",
    includes: ["Malaria", "Respiratory", "Diarrhoea", "Skin", "Eye", "Injuries"],
  },
  {
    code: "708",
    title: "MOH 708 — Maternal & Child Health (facility)",
    kind: "summary",
    primaryMoh: false,
    legacy: true,
    description: "Facility MCH summary (use MOH 711 for national integrated reporting).",
    includes: ["ANC", "Deliveries", "PNC", "FP", "Child clinic"],
  },
  {
    code: "730",
    title: "MOH 730 — Facility Information",
    kind: "summary",
    primaryMoh: false,
    legacy: true,
    description: "Point-in-time facility capacity and services snapshot.",
    includes: ["Beds", "Staff", "Equipment", "Services"],
  },
  {
    code: "731-plus",
    title: "MOH 731 Plus — Key Populations",
    kind: "summary",
    primaryMoh: false,
    legacy: true,
    description: "Key populations / HIV programme snapshot. Prefer full MOH 731.",
    includes: ["HTS", "ART", "Viral load", "TB", "STI"],
  },
]

export const MOH_SUMMARY_REPORTS = MOH_REPORTS_CATALOG.filter((r) => r.kind === "summary")
export const MOH_REGISTER_REPORTS = MOH_REPORTS_CATALOG.filter((r) => r.kind === "register")
export const MOH_PRIMARY_REPORTS = MOH_REPORTS_CATALOG.filter((r) => r.primaryMoh)

export function getMohReportDef(code: string): MohReportDef | undefined {
  return MOH_REPORTS_CATALOG.find((r) => r.code.toLowerCase() === code.toLowerCase())
}

/** Humanize indicator keys for display */
export function labelIndicatorKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
