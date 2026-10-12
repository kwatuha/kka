/**
 * Aggregate a patient's care events across clinical domains for timeline + PDFs.
 */

import {
  medicalRecordsApi,
  laboratoryApi,
  pharmacyApi,
  radiologyApi,
  proceduresApi,
  appointmentsApi,
  inpatientApi,
  billingApi,
  queueApi,
  workflowApi,
  patientApi,
  userApi,
} from "@/lib/api"

export type PatientServiceEvent = {
  id: string
  at: string
  dateLabel: string
  timeLabel: string
  type: string
  service: string
  details: string
  provider: string
  facility: string
}

function asList(data: unknown): any[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []
  const obj = data as Record<string, unknown>
  for (const key of ["data", "rows", "records", "items", "results", "orders", "prescriptions", "invoices", "admissions"]) {
    if (Array.isArray(obj[key])) return obj[key] as any[]
  }
  return []
}

function cleanName(value: unknown): string {
  if (value == null) return ""
  const s = String(value).replace(/\s+/g, " ").trim()
  if (!s || s === "null" || s === "undefined" || s === "—") return ""
  return s
}

function personName(...parts: unknown[]): string {
  return parts.map(cleanName).filter(Boolean).join(" ").trim()
}

/** Resolve the clinician/staff who offered the service from common API shapes. */
export function resolveProvider(row: Record<string, any>, fallback = "Not recorded"): string {
  // Never use bare firstName/lastName — many clinical APIs alias those to the patient.
  const direct =
    cleanName(row.doctorName) ||
    cleanName(row.staffName) ||
    cleanName(row.createdByName) ||
    cleanName(row.attendedByName) ||
    cleanName(row.orderedByName) ||
    cleanName(row.performedByName) ||
    cleanName(row.cashierName) ||
    cleanName(row.clinicianName) ||
    cleanName(row.providerName)

  if (direct) return direct

  // Insurance "provider" is not the serving clinician — only accept when no patient aliasing.
  const genericProvider = cleanName(row.provider)
  if (genericProvider && !row.patientId && !row.patientFirstName && !row.patientNumber) {
    return genericProvider
  }

  const fromParts =
    personName(row.doctorFirstName, row.doctorLastName) ||
    personName(row.staffFirstName, row.staffLastName) ||
    personName(row.performedByFirstName, row.performedByLastName) ||
    personName(row.createdByFirstName, row.createdByLastName) ||
    personName(row.orderedByFirstName, row.orderedByLastName) ||
    personName(row.userFirstName, row.userLastName)

  if (fromParts) return fromParts

  return fallback
}

function formatDateTime(value?: string | null): { at: string; dateLabel: string; timeLabel: string } {
  if (!value) {
    return { at: "", dateLabel: "—", timeLabel: "" }
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return { at: String(value), dateLabel: String(value), timeLabel: "" }
  }
  return {
    at: d.toISOString(),
    dateLabel: d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
    timeLabel: d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
  }
}

function facilityFallback(patient: any, ...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const v = cleanName(c)
    if (v) return v
  }
  return (
    cleanName(patient?.registeredBranchName) ||
    cleanName(patient?.branchName) ||
    cleanName(patient?.facilityName) ||
    "Not recorded"
  )
}

async function safeList(fn: () => Promise<unknown>): Promise<any[]> {
  try {
    return asList(await fn())
  } catch {
    return []
  }
}

async function buildUserNameMap(ids: Array<number | string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => (id == null || id === "" ? null : String(id))).filter(Boolean))] as string[]
  const map = new Map<string, string>()
  if (!unique.length) return map

  await Promise.all(
    unique.map(async (id) => {
      try {
        const u = await userApi.getById(id)
        const row = u?.user || u?.data || u
        const name =
          personName(row?.firstName, row?.lastName) ||
          cleanName(row?.username) ||
          cleanName(row?.name) ||
          cleanName(row?.fullName)
        if (name) map.set(id, name)
      } catch {
        // ignore missing users
      }
    })
  )

  // Fallback: fill any misses from a bulk user list (roles that can list users)
  const missing = unique.filter((id) => !map.has(id))
  if (missing.length) {
    try {
      const all = asList(await userApi.getAll(undefined, 1, 500))
      for (const u of all) {
        const id = u?.userId != null ? String(u.userId) : u?.id != null ? String(u.id) : ""
        if (!id || !missing.includes(id) || map.has(id)) continue
        const name = personName(u.firstName, u.lastName) || cleanName(u.username) || cleanName(u.name)
        if (name) map.set(id, name)
      }
    } catch {
      // ignore
    }
  }

  return map
}

function providerFromRow(
  row: Record<string, any>,
  userMap: Map<string, string>,
  idFields: string[],
  fallback: string
): string {
  const named = resolveProvider(row, "")
  if (named) return named
  for (const field of idFields) {
    const id = row[field]
    if (id != null && id !== "" && userMap.has(String(id))) return userMap.get(String(id))!
  }
  return fallback
}

export async function fetchPatientServiceEvents(
  patientId: string,
  patient?: any
): Promise<{ patient: any; events: PatientServiceEvent[] }> {
  const profile = patient || (await patientApi.getById(patientId))

  const [
    records,
    labOrders,
    prescriptions,
    radiologyOrders,
    procedures,
    appointments,
    admissions,
    invoices,
    queueHistory,
    workflowHistory,
  ] = await Promise.all([
    safeList(() => medicalRecordsApi.getAll(undefined, patientId, undefined, undefined, undefined, 1, 100)),
    safeList(() => laboratoryApi.getOrders(patientId, undefined, 1, 100)),
    safeList(() => pharmacyApi.getPrescriptions(patientId, undefined, 1, 100)),
    safeList(() => radiologyApi.getOrders(patientId, undefined, 1, 100)),
    safeList(() => proceduresApi.getPatientProcedures(patientId)),
    safeList(() => appointmentsApi.getAll(undefined, undefined, undefined, patientId, 1, 100)),
    safeList(() => inpatientApi.getAdmissions(undefined, undefined, 1, 100, undefined, patientId)),
    safeList(() => billingApi.getInvoices(patientId)),
    safeList(() => queueApi.getHistory({ patientId, page: 1, limit: 100 })),
    safeList(() => workflowApi.getPatientQueueHistory(patientId)),
  ])

  const idCandidates: Array<number | string | null | undefined> = []
  for (const row of [...records, ...labOrders, ...prescriptions, ...radiologyOrders, ...procedures, ...appointments, ...admissions, ...invoices, ...queueHistory, ...workflowHistory]) {
    idCandidates.push(
      row.doctorId,
      row.orderedBy,
      row.performedBy,
      row.createdBy,
      row.admittingDoctorId,
      row.attendedBy,
      row.cashierId,
      row.userId
    )
  }
  const userMap = await buildUserNameMap(idCandidates)

  const events: PatientServiceEvent[] = []

  for (const r of records) {
    const when = formatDateTime(r.visitDate || r.createdAt)
    events.push({
      id: `visit-${r.recordId || r.id}`,
      ...when,
      type: "Visit",
      service: r.department || r.visitType || "Clinical visit",
      details: [r.diagnosis, r.treatment, r.notes].filter(Boolean).join(" · ") || "Medical encounter",
      provider: providerFromRow(r, userMap, ["doctorId", "createdBy"], "Clinician not recorded"),
      facility: facilityFallback(profile, r.branchName, r.facilityName),
    })
  }

  for (const o of labOrders) {
    const when = formatDateTime(o.orderDate || o.createdAt)
    events.push({
      id: `lab-${o.orderId || o.id}`,
      ...when,
      type: "Laboratory",
      service: o.testNames || o.clinicalIndication || "Lab order",
      details: `Status: ${o.status || "—"}`,
      provider: providerFromRow(o, userMap, ["orderedBy", "doctorId", "createdBy"], "Ordering clinician not recorded"),
      facility: facilityFallback(profile, o.branchName, o.labName),
    })
  }

  for (const p of prescriptions) {
    const when = formatDateTime(p.prescriptionDate || p.createdAt)
    events.push({
      id: `rx-${p.prescriptionId || p.id}`,
      ...when,
      type: "Pharmacy",
      service: "Prescription",
      details: p.status ? `Status: ${p.status}` : "Medication prescribed",
      provider: providerFromRow(p, userMap, ["doctorId", "createdBy"], "Prescriber not recorded"),
      facility: facilityFallback(profile, p.branchName, p.pharmacyName),
    })
  }

  for (const o of radiologyOrders) {
    const when = formatDateTime(o.orderDate || o.createdAt)
    events.push({
      id: `rad-${o.orderId || o.id}`,
      ...when,
      type: "Radiology",
      service: o.examNames || o.clinicalIndication || "Imaging order",
      details: `Status: ${o.status || "—"}`,
      provider: providerFromRow(o, userMap, ["orderedBy", "doctorId", "createdBy"], "Ordering clinician not recorded"),
      facility: facilityFallback(profile, o.branchName),
    })
  }

  for (const p of procedures) {
    const when = formatDateTime(p.procedureDate || p.createdAt)
    events.push({
      id: `proc-${p.patientProcedureId || p.id}`,
      ...when,
      type: "Procedure",
      service: p.procedureName || p.name || "Procedure",
      details: p.notes || (p.status ? `Status: ${p.status}` : ""),
      provider: providerFromRow(p, userMap, ["performedBy", "doctorId", "createdBy"], "Clinician not recorded"),
      facility: facilityFallback(profile, p.branchName, p.wardName),
    })
  }

  for (const a of appointments) {
    const when = formatDateTime(a.appointmentDate || a.scheduledAt || a.createdAt)
    events.push({
      id: `appt-${a.appointmentId || a.id}`,
      ...when,
      type: "Appointment",
      service: a.reason || a.department || "Appointment",
      details: `Status: ${a.status || "—"}`,
      provider: providerFromRow(a, userMap, ["doctorId", "createdBy"], "Clinician not recorded"),
      facility: facilityFallback(profile, a.branchName),
    })
  }

  for (const a of admissions) {
    const when = formatDateTime(a.admissionDate || a.createdAt)
    events.push({
      id: `adm-${a.admissionId || a.id}`,
      ...when,
      type: "Admission",
      service: a.admissionDiagnosis || a.admissionReason || "Inpatient admission",
      details: [a.wardName, a.bedNumber, a.status].filter(Boolean).join(" · "),
      provider: providerFromRow(a, userMap, ["admittingDoctorId", "doctorId", "createdBy"], "Admitting clinician not recorded"),
      facility: facilityFallback(profile, a.branchName, a.wardName),
    })
  }

  for (const inv of invoices) {
    const when = formatDateTime(inv.invoiceDate || inv.createdAt)
    events.push({
      id: `bill-${inv.invoiceId || inv.id}`,
      ...when,
      type: "Billing",
      service: inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Billing",
      details: `Status: ${inv.status || "—"} · Amount: ${inv.totalAmount ?? inv.amount ?? "—"}`,
      provider: providerFromRow(inv, userMap, ["createdBy"], "Billing staff not recorded"),
      facility: facilityFallback(profile, inv.branchName),
    })
  }

  const queueRows = [...workflowHistory, ...queueHistory]
  for (const q of queueRows) {
    const when = formatDateTime(q.arrivalTime || q.createdAt || q.archivedAt)
    const sp = q.servicePoint || q.pointType || "Queue"
    events.push({
      id: `queue-${q.queueId || q.historyId || q.id || `${sp}-${when.at}`}`,
      ...when,
      type: "Queue",
      service: `${String(sp).replace(/_/g, " ")} queue`,
      details: [q.status, q.ticketNumber ? `Ticket ${q.ticketNumber}` : null, q.notes]
        .filter(Boolean)
        .join(" · "),
      provider: providerFromRow(q, userMap, ["doctorId", "createdBy", "attendedBy", "userId"], "Queue staff not recorded"),
      facility: facilityFallback(profile, q.branchName, q.servicePointName),
    })
  }

  const seen = new Set<string>()
  const unique = events.filter((e) => {
    if (!e.id || seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })
  unique.sort((a, b) => String(b.at).localeCompare(String(a.at)))

  return { patient: profile, events: unique }
}

export async function fetchPatientSummaryBundle(patientId: string) {
  const { patient, events } = await fetchPatientServiceEvents(patientId)
  const [allergies, vitals] = await Promise.all([
    safeList(() => patientApi.getAllergies(patientId)),
    safeList(() => patientApi.getVitals(patientId)),
  ])

  return {
    patient,
    events,
    allergies,
    recentVitals: vitals,
  }
}
