/** Patient profile (`/patients/[id]`) tabs — keep in sync with app/(main)/patients/[id]/page.tsx */
export const PATIENT_CHART_TABS = [
  { value: "overview", label: "Overview" },
  { value: "services", label: "Services" },
  { value: "vitals", label: "Vitals" },
  { value: "lab-results", label: "Lab Results" },
  { value: "medications", label: "Medications" },
  { value: "procedures", label: "Procedures" },
  { value: "radiology", label: "Radiology" },
  { value: "orders", label: "Orders" },
  { value: "allied-health", label: "Allied health" },
  { value: "appointments", label: "Appointments" },
  { value: "billing", label: "Billing" },
  { value: "admissions", label: "Admissions" },
  { value: "documents", label: "Documents" },
  { value: "allergies", label: "Allergies" },
  { value: "problems", label: "Problem list" },
  { value: "ncd", label: "NCD Care" },
  { value: "mch", label: "MCH (ANC/PNC)" },
  { value: "insurance", label: "Insurance" },
  { value: "family-history", label: "Family History" },
  { value: "consent", label: "Consent & privacy" },
] as const

export const PATIENT_CHART_TAB_IDS = PATIENT_CHART_TABS.map((t) => t.value)
