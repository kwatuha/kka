"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, ClipboardCopy, Loader2, ShieldCheck } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import {
  integrationApiUrl,
  integrationFetch,
  readIntegrationJson,
} from "@/lib/integration-api"
import { getPublicApiBaseUrl } from "@/lib/public-api-url"
import {
  ageYearsFromDateOfBirth,
  isDependantIdType,
  isPatientMinor,
} from "@/lib/patient-age"

const CLAIM_DOC_TYPES = [
  "CASE_NOTE",
  "TREATMENT_PLAN",
  "IMAGING_RESULT",
  "LAB_RESULTS",
  "REFERRAL_LETTER",
  "INVOICE",
  "FINAL_BILL",
  "DISCHARGE_SUMMARY",
] as const

function patientChartApiUrl(path: string): string {
  const base = getPublicApiBaseUrl().replace(/\/$/, "")
  let p = path.startsWith("/") ? path : `/${path}`
  if (base.endsWith("/api") && p.startsWith("/api/")) {
    p = p.slice(4) || "/"
  }
  return base ? `${base}${p}` : p
}

function authHeaders(json = false): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers["Content-Type"] = "application/json"
  return headers
}

const SERVICE_LABELS: Record<string, string> = {
  OUTPATIENT: "Outpatient (SHIF)",
  CAPITATION: "Capitation (PHC)",
  INPATIENT: "Inpatient (SHIF)",
  EMERGENCY: "Emergency (ECCIF)",
}

/** Parent benefit codes that include billable inpatient sub-benefits (DHA SHA-07 / surgical IP). */
function parentBenefitsIncludeInpatientPackages(
  parents: Array<{ parentBenefitCode: string; name?: string | null }>
) {
  return parents.some((p) => {
    const code = String(p.parentBenefitCode || "").toUpperCase()
    const name = String(p.name || "").toLowerCase()
    return (
      code.startsWith("SHA-07") ||
      code.startsWith("PMF-07") ||
      code.startsWith("SHA-19") ||
      /inpatient|surgical services/i.test(name)
    )
  })
}

function visitFundMismatchHint(visitServiceType: string, eligibilityServiceType: string): string | null {
  const v = String(visitServiceType || "OUTPATIENT").toUpperCase()
  const e = String(eligibilityServiceType || "OUTPATIENT").toUpperCase()
  if (v === e) return null
  if (v === "INPATIENT" && e === "OUTPATIENT") {
    return "National visit fund is Inpatient but eligibility was checked as Outpatient (SHIF). That is not the same as “member cannot be admitted”—the top control only sets context for GET eligibility. Align both for IP witness, then confirm parent benefits include inpatient packages (e.g. SHA-07). UAT smoke member 12345678 often has SHA-12 (outpatient) only."
  }
  if (v === "OUTPATIENT" && e === "INPATIENT") {
    return "Eligibility context is Inpatient but national visit fund is Outpatient—align both unless you are deliberately testing a mixed flow."
  }
  if (e === "CAPITATION" || e === "EMERGENCY" || v === "CAPITATION" || v === "EMERGENCY") {
    return "Different values are OK for PHC capitation or ECCIF emergency witness—use Match buttons when you want them aligned for evidence."
  }
  return `Visit fund (${SERVICE_LABELS[v] || v}) and eligibility context (${SERVICE_LABELS[e] || e}) differ—use Match buttons before witness evidence.`
}

const WITNESS_UAT_STEPS = [
  "Set National visit fund type (PHC / SHIF OP / IP / ECCIF)",
  "Load sub-benefits for that fund → intervention → Load contacts",
  "Send claims OTP → Start SHA visit (note national visit id)",
  "Optional: Request preauth (type) before lines if intervention requires it",
  "Add intervention + Add billing line → attach PDFs → Refresh preview",
  "Add / Retire / Switch intervention (witness) → Refresh preview again",
  "Send discharge OTP → Submit national claim (IP: Submit IP discharge)",
  "Copy evidence below → HIE smoke recorder + claim history claim ref",
] as const

type Props = {
  patientId: string
  nupi?: string | null
  dateOfBirth?: string | null
  idType?: string | null
  idNumber?: string | null
  nextOfKinName?: string | null
  nextOfKinPhone?: string | null
  onDemographicsUpdated?: () => void
}

/**
 * SHA / fund eligibility (sandbox demo or live middleware when ELIGIBILITY_MODE=live).
 */
export function PatientShaEligibilityCard({
  patientId,
  nupi: nupiProp,
  dateOfBirth,
  idType,
  idNumber,
  nextOfKinName,
  nextOfKinPhone,
  onDemographicsUpdated,
}: Props) {
  const [effectiveNupi, setEffectiveNupi] = useState<string | null>(nupiProp ?? null)
  useEffect(() => {
    setEffectiveNupi(nupiProp ?? null)
  }, [nupiProp])

  const patientMinor = isPatientMinor(dateOfBirth)
  const kinPhone = String(nextOfKinPhone ?? "").trim()
  const guardianIncomplete =
    patientMinor &&
    (!nextOfKinName?.trim() || kinPhone.length < 10)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState("OUTPATIENT")
  /** Fund type for national visit (POST /claims/visit) — separate from eligibility check. */
  const [visitServiceType, setVisitServiceType] = useState("OUTPATIENT")
  const [preauthType, setPreauthType] = useState("normal")
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [benefitsBusy, setBenefitsBusy] = useState(false)
  const [subBenefits, setSubBenefits] = useState<
    Array<{ subBenefitCode: string; name: string; accessPoint?: string | null }>
  >([])
  const [selectedSubBenefit, setSelectedSubBenefit] = useState<string>("")
  const [interventions, setInterventions] = useState<Array<Record<string, unknown>>>([])
  const [subBenefitsNote, setSubBenefitsNote] = useState<string | null>(null)
  const [parentBenefits, setParentBenefits] = useState<
    Array<{ parentBenefitCode: string; name: string; fund?: string | null }>
  >([])
  const [selectedParentBenefit, setSelectedParentBenefit] = useState("")
  const [switchToIntervention, setSwitchToIntervention] = useState("")
  const [biometricsIframeUrl, setBiometricsIframeUrl] = useState<string | null>(null)
  const [biometricsAuthToken, setBiometricsAuthToken] = useState<string | null>(null)
  const [benefitsLoadState, setBenefitsLoadState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle")
  const [benefitsNationalError, setBenefitsNationalError] = useState<string | null>(null)
  const [claimsBusy, setClaimsBusy] = useState(false)
  const [contacts, setContacts] = useState<
    Array<{ contactId: string; contactValue?: string | null; contactType?: string | null }>
  >([])
  const [selectedContactId, setSelectedContactId] = useState("")
  const [claimsSession, setClaimsSession] = useState<Record<string, unknown> | null>(null)
  const [claimsOtp, setClaimsOtp] = useState("")
  const [selectedIntervention, setSelectedIntervention] = useState("")
  type VisitLineRow = {
    kind: "intervention" | "billing" | "attachment"
    code: string
    lineId?: string | null
    name?: string | null
    amount?: string | null
    documentType?: string | null
  }
  const [visitLineRows, setVisitLineRows] = useState<VisitLineRow[]>([])
  const [billingUnitPrice, setBillingUnitPrice] = useState("100")
  const [dischargeOtp, setDischargeOtp] = useState("")
  const [claimPreviewTotal, setClaimPreviewTotal] = useState<string | null>(null)
  const [submitReadiness, setSubmitReadiness] = useState<{
    readyToSubmit?: boolean
    blockers?: string[]
    claimDoctorOk?: boolean
    claimDoctorIdentificationNumber?: string | null
    encounterIcd11?: string | null
    hasDiagnosisOnClaim?: boolean
    hasBillingLines?: boolean
    attachmentsOk?: boolean
    missingAttachments?: string[]
  } | null>(null)
  const [previewRefreshing, setPreviewRefreshing] = useState(false)
  const [lastLineAction, setLastLineAction] = useState<string | null>(null)
  type ClaimsActionTone = "info" | "success" | "error"
  const [claimsActionStatus, setClaimsActionStatus] = useState<{
    text: string
    tone: ClaimsActionTone
  } | null>(null)
  const setClaimStatus = (text: string | null, tone: ClaimsActionTone = "info") => {
    setClaimsActionStatus(text ? { text, tone } : null)
  }
  const [missingAttachmentCodes, setMissingAttachmentCodes] = useState<string[]>([])
  const [patientDocuments, setPatientDocuments] = useState<
    Array<{ documentId: number; documentName: string }>
  >([])
  const [selectedPatientDocId, setSelectedPatientDocId] = useState("")
  const [patientDocsStatus, setPatientDocsStatus] = useState<string | null>(null)
  const [claimDocumentType, setClaimDocumentType] = useState<string>("CASE_NOTE")
  /** Intervention on the *national visit* to tag attachments (not the benefits catalog picker). */
  const [attachTargetCode, setAttachTargetCode] = useState("")
  const claimFileInputRef = useRef<HTMLInputElement>(null)
  type ClaimHistoryRow = {
    sessionId: number
    serviceType?: string | null
    nationalVisitId?: string | null
    claimReference?: string | null
    preauthReference?: string | null
    sessionStatus: string
    lastError?: string | null
    updatedAt?: string | null
    createdByUsername?: string | null
  }
  const [claimHistory, setClaimHistory] = useState<ClaimHistoryRow[]>([])
  const [claimHistoryLoading, setClaimHistoryLoading] = useState(false)
  const [lastSubmittedClaimRef, setLastSubmittedClaimRef] = useState<string | null>(null)
  const claimHistoryRef = useRef<HTMLDivElement | null>(null)
  type EncounterPick = {
    recordId: number
    visitDate?: string | null
    diagnosis?: string | null
  }
  type EncounterDiagnosisInfo = {
    icd11Code?: string | null
    icd10Code?: string | null
    medicalRecordId?: number | null
    diagnosisText?: string | null
    source?: string | null
    warnings?: string[]
  }
  const [linkedMedicalRecordId, setLinkedMedicalRecordId] = useState("")
  const [encounterDiagnosis, setEncounterDiagnosis] = useState<EncounterDiagnosisInfo | null>(
    null
  )
  const [recentEncounters, setRecentEncounters] = useState<EncounterPick[]>([])
  const [encounterLinkBusy, setEncounterLinkBusy] = useState(false)

  const claimsEncounterPayload = useMemo(() => {
    const body: Record<string, unknown> = {}
    if (linkedMedicalRecordId) body.medicalRecordId = Number(linkedMedicalRecordId)
    if (encounterDiagnosis?.icd11Code) body.icdCode = encounterDiagnosis.icd11Code
    return body
  }, [linkedMedicalRecordId, encounterDiagnosis?.icd11Code])

  const integrationErr = (data: Record<string, unknown>, fallback: string) => {
    const raw = String(data.message || data.msg || data.error || fallback)
    if (raw.trim().startsWith("<") || /502 Bad Gateway|APISIX|openresty/i.test(raw)) {
      const step =
        data.nationalStep != null ? ` Step: ${String(data.nationalStep)}.` : ""
      const status = data.httpStatus != null ? ` HTTP ${Number(data.httpStatus)}.` : ""
      return (
        `National HIE gateway error (Bad Gateway).${status}${step} ` +
        "DHA AfyaConnect/APISIX upstream — retry in a few minutes or email afyaconnect.dha@gmail.com with national visit id and time."
      )
    }
    const step = data.nationalStep != null ? ` [${String(data.nationalStep)}]` : ""
    return raw + step
  }

  const rowsFromPreview = (preview: Record<string, unknown>): VisitLineRow[] => {
    const rows: VisitLineRow[] = []
    const interventions = Array.isArray(preview.interventions) ? preview.interventions : []
    for (const row of interventions as Record<string, unknown>[]) {
      rows.push({
        kind: "intervention",
        code: String(row.interventionCode ?? row.intervention_code ?? "?"),
        lineId:
          row.lineId != null
            ? String(row.lineId)
            : row.id != null
              ? String(row.id)
              : null,
        name: row.name != null ? String(row.name) : null,
      })
    }
    const invoiceLines = Array.isArray(preview.invoiceLines) ? preview.invoiceLines : []
    for (const row of invoiceLines as Record<string, unknown>[]) {
      rows.push({
        kind: "billing",
        code: String(row.interventionCode ?? row.intervention_code ?? "?"),
        lineId:
          row.lineId != null
            ? String(row.lineId)
            : row.id != null
              ? String(row.id)
              : null,
        name: row.name != null ? String(row.name) : null,
        amount:
          row.lineTotal != null
            ? String(row.lineTotal)
            : row.unitPrice != null
              ? String(row.unitPrice)
              : null,
      })
    }
    const attachments = Array.isArray(preview.attachments) ? preview.attachments : []
    for (const row of attachments as Record<string, unknown>[]) {
      rows.push({
        kind: "attachment",
        code: String(row.interventionCode ?? row.intervention_code ?? "?"),
        lineId: row.attachmentId != null ? String(row.attachmentId) : null,
        name: row.title != null ? String(row.title) : null,
        documentType: row.documentType != null ? String(row.documentType) : null,
      })
    }
    return rows
  }

  const applyClaimPreview = (payload: Record<string, unknown> | null | undefined) => {
    if (!payload || typeof payload !== "object") return
    const preview =
      payload.preview && typeof payload.preview === "object"
        ? (payload.preview as Record<string, unknown>)
        : payload
    setVisitLineRows(rowsFromPreview(preview))
    if (preview.totalClaimAmount != null) {
      setClaimPreviewTotal(String(preview.totalClaimAmount))
    }
    if (Array.isArray(preview.missingAttachmentInterventionCodes)) {
      setMissingAttachmentCodes(
        preview.missingAttachmentInterventionCodes.map((c) => String(c))
      )
    } else {
      setMissingAttachmentCodes([])
    }
    const readiness = (payload.submitReadiness ?? preview.submitReadiness) as typeof submitReadiness
    if (readiness && typeof readiness === "object") {
      setSubmitReadiness(readiness)
    }
  }

  const visitInterventionCodes = visitLineRows
    .filter((r) => r.kind === "intervention")
    .map((r) => r.code)

  const visitInterventionsForAttach = useMemo(
    () =>
      visitLineRows
        .filter((r) => r.kind === "intervention")
        .map((r) => ({
          code: r.code,
          label: r.name ? `${r.name} (${r.code})` : r.code,
        })),
    [visitLineRows]
  )

  const billingAllowed =
    Boolean(selectedIntervention) &&
    visitInterventionCodes.includes(selectedIntervention)

  const loadPatientDocumentsForClaims = useCallback(async () => {
    if (!patientId) return
    try {
      setPatientDocsStatus("Loading patient documents…")
      const res = await fetch(
        patientChartApiUrl(`/api/patients/${encodeURIComponent(patientId)}/documents`),
        { headers: authHeaders() }
      )
      if (!res.ok) {
        setPatientDocsStatus(`Could not load documents (HTTP ${res.status}).`)
        return
      }
      const rows = (await res.json()) as Array<{
        documentId: number
        documentName: string
      }>
      if (Array.isArray(rows)) {
        const mapped = rows.map((d) => ({
          documentId: d.documentId,
          documentName: d.documentName || `Document #${d.documentId}`,
        }))
        setPatientDocuments(mapped)
        if (mapped.length) {
          setSelectedPatientDocId((prev) => prev || String(mapped[0].documentId))
          setPatientDocsStatus(`${mapped.length} document(s) — first one selected.`)
        } else {
          setPatientDocsStatus(
            "No files in Patient → Documents yet. Upload a PDF there, click Reload docs, or use Upload PDF below."
          )
        }
      }
    } catch {
      setPatientDocsStatus("Failed to load patient documents — check login / API.")
    }
  }, [patientId])

  const loadMode = useCallback(async () => {
    try {
      const res = await integrationFetch("/api/integrations/sha/eligibility/status", {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await readIntegrationJson(res)
        setMode(data.mode || "sandbox")
      }
    } catch {
      setMode("sandbox")
    }
  }, [])

  useEffect(() => {
    void loadMode()
  }, [loadMode])

  const refreshClaimPreview = useCallback(
    async (sessionOverride?: Record<string, unknown>, opts?: { quiet?: boolean }) => {
      const session = sessionOverride ?? claimsSession
      if (!session?.nationalVisitId || !patientId) {
        if (!opts?.quiet) {
          toast({
            title: "No active national visit",
            description: "Start SHA visit first, then refresh preview.",
            variant: "destructive",
          })
        }
        return
      }
      try {
        setPreviewRefreshing(true)
        const res = await integrationFetch("/api/integrations/sha/claims/preview", {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({
            patientId: Number(patientId),
            sessionId: session.sessionId,
          }),
        })
        const data = await readIntegrationJson<Record<string, unknown>>(res)
        if (!res.ok) {
          const msg = String(data.message || data.error || "Preview failed")
          if (!opts?.quiet) {
            toast({ title: "Claim preview failed", description: msg, variant: "destructive" })
          }
          return
        }
        applyClaimPreview(data)
        if (!opts?.quiet) {
          const ready = (data.submitReadiness as { readyToSubmit?: boolean } | undefined)?.readyToSubmit
          toast({
            title: "Preview updated",
            description: ready
              ? "Submit readiness: looks good after discharge OTP."
              : "See Submit readiness checklist below.",
          })
        }
      } catch (err: unknown) {
        if (!opts?.quiet) {
          const msg = err instanceof Error ? err.message : "Preview request failed"
          toast({ title: "Claim preview failed", description: msg, variant: "destructive" })
        }
      } finally {
        setPreviewRefreshing(false)
      }
    },
    [patientId, claimsSession]
  )

  const loadActiveClaimsSession = useCallback(async () => {
    if (!patientId) return
    try {
      const res = await integrationFetch(
        `/api/integrations/sha/claims/session/active/${encodeURIComponent(patientId)}`,
        { headers: authHeaders() }
      )
      if (!res.ok) return
      const data = await readIntegrationJson(res)
      if (data?.session) {
        const session = data.session as Record<string, unknown>
        setClaimsSession(session)
        const mid = session.medicalRecordId
        if (mid != null && String(mid) !== "") setLinkedMedicalRecordId(String(mid))
        if (session.subBenefitCode) {
          setSelectedSubBenefit(String(session.subBenefitCode))
        }
        if (session.interventionCode) {
          setSelectedIntervention(String(session.interventionCode))
        }
        if (session.serviceType) {
          setVisitServiceType(String(session.serviceType))
        }
      } else {
        setClaimsSession(null)
        setVisitLineRows([])
        setSubmitReadiness(null)
        setClaimPreviewTotal(null)
        setMissingAttachmentCodes([])
        setDischargeOtp("")
      }
      const enc = data?.encounterDiagnosis as EncounterDiagnosisInfo | undefined
      if (enc) setEncounterDiagnosis(enc)
      const session = data?.session as Record<string, unknown> | undefined
      if (session?.sessionStatus === "visit_active" && session.nationalVisitId) {
        try {
          const prevRes = await integrationFetch("/api/integrations/sha/claims/preview", {
            method: "POST",
            headers: authHeaders(true),
            body: JSON.stringify({
              patientId: Number(patientId),
              sessionId: session.sessionId,
            }),
          })
          const prevData = await readIntegrationJson<Record<string, unknown>>(prevRes)
          if (prevRes.ok) applyClaimPreview(prevData)
        } catch {
          /* optional */
        }
      }
    } catch {
      /* table may be missing until migration 145 */
    }
  }, [patientId])

  const loadRecentEncounters = useCallback(async () => {
    if (!patientId) return
    try {
      const res = await fetch(
        patientChartApiUrl(
          `/api/medical-records?patientId=${encodeURIComponent(patientId)}&limit=8&page=1`
        ),
        { headers: authHeaders() }
      )
      if (!res.ok) return
      const rows = (await res.json()) as Array<Record<string, unknown>>
      if (!Array.isArray(rows)) return
      const mapped = rows.map((r) => ({
        recordId: Number(r.recordId),
        visitDate: r.visitDate != null ? String(r.visitDate) : null,
        diagnosis: r.diagnosis != null ? String(r.diagnosis) : null,
      }))
      setRecentEncounters(mapped)
      if (mapped.length) {
        setLinkedMedicalRecordId((prev) => prev || String(mapped[0].recordId))
      }
    } catch {
      /* optional */
    }
  }, [patientId])

  const refreshEncounterDiagnosis = useCallback(
    async (medicalRecordId?: string) => {
      const rid = medicalRecordId ?? linkedMedicalRecordId
      if (!patientId || !rid) {
        setEncounterDiagnosis(null)
        return
      }
      try {
        const q = new URLSearchParams({
          patientId: String(patientId),
          medicalRecordId: rid,
        })
        const res = await integrationFetch(
          `/api/integrations/sha/claims/encounter-diagnosis?${q.toString()}`,
          { headers: authHeaders() }
        )
        const data = await readIntegrationJson<{ encounterDiagnosis?: EncounterDiagnosisInfo }>(
          res
        )
        if (res.ok && data.encounterDiagnosis) setEncounterDiagnosis(data.encounterDiagnosis)
      } catch {
        /* ignore */
      }
    },
    [patientId, linkedMedicalRecordId]
  )

  const linkEncounterToClaimsSession = useCallback(async () => {
    if (!linkedMedicalRecordId) {
      toast({ title: "Select an HMIS encounter", variant: "destructive" })
      return
    }
    try {
      setEncounterLinkBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/session/link-encounter", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          medicalRecordId: Number(linkedMedicalRecordId),
          pushToNational: true,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(integrationErr(data, "Link encounter failed"))
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      if (data.encounterDiagnosis) {
        setEncounterDiagnosis(data.encounterDiagnosis as EncounterDiagnosisInfo)
      }
      toast({
        title: "Encounter linked",
        description:
          data.nationalSync && (data.nationalSync as { synced?: boolean }).synced
            ? "National claim diagnosis updated from HMIS encounter."
            : "Session linked — diagnosis will be sent on submit if not already on the claim.",
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Link failed"
      toast({ title: "Link encounter failed", description: msg, variant: "destructive" })
    } finally {
      setEncounterLinkBusy(false)
    }
  }, [patientId, linkedMedicalRecordId, claimsSession?.sessionId])

  const claimHistoryInFlight = useRef(false)
  const benefitsSessionHydratedRef = useRef<number | null>(null)

  const loadClaimHistory = useCallback(async () => {
    if (!patientId || claimHistoryInFlight.current) return
    try {
      claimHistoryInFlight.current = true
      setClaimHistoryLoading(true)
      const res = await integrationFetch(
        `/api/integrations/sha/claims/session/history/${encodeURIComponent(patientId)}?limit=15`,
        { headers: authHeaders() }
      )
      if (!res.ok) {
        setClaimHistory([])
        return
      }
      const data = await readIntegrationJson<{ history?: ClaimHistoryRow[] }>(res)
      setClaimHistory(Array.isArray(data.history) ? data.history : [])
    } catch {
      setClaimHistory([])
    } finally {
      claimHistoryInFlight.current = false
      setClaimHistoryLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    setSubBenefits([])
    setParentBenefits([])
    setSelectedSubBenefit("")
    setSelectedParentBenefit("")
    setInterventions([])
    setBenefitsLoadState("idle")
    setBenefitsNationalError(null)
    benefitsSessionHydratedRef.current = null
    void loadActiveClaimsSession()
    void loadClaimHistory()
    void loadRecentEncounters()
    // Intentionally patientId only — avoid refetch loop when session/preview callbacks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  useEffect(() => {
    const onEncounterSaved = (ev: Event) => {
      const detail = (ev as CustomEvent<{ patientId?: string | number; recordId?: number }>).detail
      if (detail?.patientId == null || String(detail.patientId) !== String(patientId)) return
      if (detail.recordId) {
        setLinkedMedicalRecordId(String(detail.recordId))
        void refreshEncounterDiagnosis(String(detail.recordId))
        void loadRecentEncounters()
      }
    }
    window.addEventListener("hmis-encounter-saved", onEncounterSaved)
    return () => window.removeEventListener("hmis-encounter-saved", onEncounterSaved)
  }, [patientId, refreshEncounterDiagnosis, loadRecentEncounters])

  useEffect(() => {
    if (linkedMedicalRecordId) void refreshEncounterDiagnosis(linkedMedicalRecordId)
  }, [linkedMedicalRecordId, refreshEncounterDiagnosis])

  const check = async () => {
    try {
      setLoading(true)
      const res = await integrationFetch("/api/integrations/sha/eligibility/check", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          serviceType,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        throw new Error(
          String(data.message || data.msg || data.error || "Eligibility check failed")
        )
      }
      setResult(data)
      if (data.nupiPersisted && data.memberCrNumber) {
        setEffectiveNupi(String(data.memberCrNumber))
        onDemographicsUpdated?.()
        toast({
          title: "NUPI saved from national CR",
          description: String(data.memberCrNumber),
        })
      }
      setSubBenefits([])
      setSelectedSubBenefit("")
      setInterventions([])
      setParentBenefits([])
      setSelectedParentBenefit("")
      const st = String(data.serviceType || serviceType).toUpperCase()
      const crForAuto =
        (data.memberCrNumber as string | undefined) ||
        (data.patient as { crId?: string } | undefined)?.crId ||
        effectiveNupi ||
        null
      if (data.mode === "live" && crForAuto && !data.error) {
        void loadSubBenefits({
          memberCr: crForAuto,
          ignoreParentFilter: true,
          serviceType: visitServiceType,
        })
        void loadParentBenefits({ silent: true, memberCr: crForAuto })
        void refreshMemberCoverage(crForAuto)
      }
      const label = SERVICE_LABELS[st] || st
      if (data.mode === "sandbox") {
        toast({
          title: `Sandbox: ${label}`,
          description: data.message || "Demonstration only — not a national SHA response.",
        })
      } else {
        toast({
          title: `Eligibility: ${label}`,
          description: data.coverageStatus || data.message || "See details below.",
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Check failed"
      toast({ title: "Eligibility failed", description: msg, variant: "destructive" })
      setResult({ error: msg })
    } finally {
      setLoading(false)
    }
  }

  const memberCrForBenefits =
    (result?.memberCrNumber as string | undefined) ||
    (result?.patient as { crId?: string } | undefined)?.crId ||
    effectiveNupi ||
    null

  const visitTypeMismatchHint = visitFundMismatchHint(visitServiceType, serviceType)
  const inpatientPackagesLikely = parentBenefitsIncludeInpatientPackages(parentBenefits)
  const outpatientOnlyPackages =
    parentBenefits.length > 0 && !inpatientPackagesLikely

  type WitnessTrackRow = { status: string; label: string; detail: string }
  const [witnessCoverage, setWitnessCoverage] = useState<{
    witnessTracks?: Record<string, WitnessTrackRow>
    inpatientPackagesAvailable?: boolean
    uatSmokeNote?: string | null
    dhaContact?: string | null
  } | null>(null)

  const refreshMemberCoverage = useCallback(
    async (memberCr?: string | null) => {
      const cr = memberCr ?? memberCrForBenefits
      if (!cr || mode !== "live") {
        setWitnessCoverage(null)
        return
      }
      try {
        const res = await integrationFetch("/api/integrations/sha/benefits/member-coverage", {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({
            patientId: Number(patientId),
            memberCrNumber: cr,
          }),
        })
        const data = await readIntegrationJson<Record<string, unknown>>(res)
        if (!res.ok) {
          setWitnessCoverage(null)
          return
        }
        setWitnessCoverage({
          witnessTracks: data.witnessTracks as Record<string, WitnessTrackRow> | undefined,
          inpatientPackagesAvailable: data.inpatientPackagesAvailable as boolean | undefined,
          uatSmokeNote: data.uatSmokeNote != null ? String(data.uatSmokeNote) : null,
          dhaContact: data.dhaContact != null ? String(data.dhaContact) : null,
        })
      } catch {
        setWitnessCoverage(null)
      }
    },
    [patientId, memberCrForBenefits, mode]
  )

  useEffect(() => {
    void refreshMemberCoverage()
  }, [refreshMemberCoverage])

  const loadParentBenefits = async (opts?: { silent?: boolean; memberCr?: string | null }) => {
    const cr = opts?.memberCr ?? memberCrForBenefits
    if (!cr) {
      if (!opts?.silent) {
        toast({
          title: "Member CR required",
          description: "Check eligibility or set patient NUPI first.",
          variant: "destructive",
        })
      }
      return
    }
    try {
      setBenefitsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/benefits/parent-benefits", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: cr,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(String(data.message || data.error || "Parent benefits failed"))
      const list = Array.isArray(data.parentBenefits) ? data.parentBenefits : []
      setParentBenefits(list)
      setSelectedParentBenefit(list[0]?.parentBenefitCode || "")
      if (list.length === 1 && !opts?.silent) {
        void loadSubBenefits({
          memberCr: cr,
          parentBenefitCode: list[0].parentBenefitCode,
        })
      }
      if (!opts?.silent) {
        toast({
          title: list.length ? "Parent benefits loaded" : "No parent benefits returned",
          description: list.length
            ? `${list.length} scheme(s) — see Parent benefits list below`
            : "National API returned none for this member CR.",
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Parent benefits failed"
      if (!opts?.silent) {
        toast({ title: "Parent benefits failed", description: msg, variant: "destructive" })
      }
    } finally {
      setBenefitsBusy(false)
    }
  }

  const copyWitnessEvidence = async () => {
    const visitId =
      claimsSession?.nationalVisitId != null ? String(claimsSession.nationalVisitId) : "—"
    const preauth =
      claimsSession?.preauthReference != null ? String(claimsSession.preauthReference) : "—"
    const claim =
      lastSubmittedClaimRef ||
      (claimsSession?.claimReference != null ? String(claimsSession.claimReference) : "—")
    const lines = [
      `Patient ID: ${patientId}`,
      `NUPI/CR: ${memberCrForBenefits || effectiveNupi || idNumber || "—"}`,
      `Visit fund: ${visitServiceType}`,
      `National visit: ${visitId}`,
      `Preauth: ${preauth}`,
      `Latest claim ref: ${claim}`,
      `FR / env: see Administration → Run preflight`,
      "",
      "Witness steps:",
      ...WITNESS_UAT_STEPS.map((s, i) => `${i + 1}. ${s}`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      toast({ title: "Witness notes copied", description: "Paste into HIE smoke recorder or email to DHA." })
    } catch {
      toast({ title: "Copy failed", description: lines.join("\n").slice(0, 200), variant: "destructive" })
    }
  }

  const loadSubBenefits = async (opts?: {
    memberCr?: string | null
    ignoreParentFilter?: boolean
    parentBenefitCode?: string | null
    /** Eligibility check uses top dropdown; manual loads use visit fund type. */
    serviceType?: string
  }) => {
    const memberCr = opts?.memberCr ?? memberCrForBenefits
    if (!memberCr) {
      toast({
        title: "Member CR required",
        description: "Check eligibility or set patient NUPI first.",
        variant: "destructive",
      })
      return
    }
    const parentCode = opts?.ignoreParentFilter
      ? undefined
      : opts?.parentBenefitCode ||
        (selectedParentBenefit ? selectedParentBenefit : undefined)
    try {
      setBenefitsBusy(true)
      setBenefitsLoadState("loading")
      setBenefitsNationalError(null)
      setInterventions([])
      const benefitServiceType = opts?.serviceType ?? visitServiceType
      const res = await integrationFetch("/api/integrations/sha/benefits/sub-benefits", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: memberCr,
          serviceType: benefitServiceType,
          ...(parentCode ? { parentBenefitCode: parentCode } : {}),
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      const nationalErr = data.error != null ? String(data.error) : null
      const httpStatus = data.httpStatus != null ? Number(data.httpStatus) : res.status
      const traceId =
        (data.traceId as string | undefined) ||
        (data.body as { trace_id?: string } | undefined)?.trace_id ||
        null
      if (!res.ok || (nationalErr && data.mode === "live")) {
        const detail = nationalErr || String(data.message || "Sub-benefits failed")
        const withStatus =
          httpStatus && httpStatus >= 400 ? `${detail} (HTTP ${httpStatus})` : detail
        const withTrace = traceId ? `${withStatus}\nDHA trace_id: ${traceId}` : withStatus
        setBenefitsNationalError(withTrace)
        throw new Error(withTrace)
      }
      const list = Array.isArray(data.subBenefits) ? data.subBenefits : []
      setSubBenefits(list)
      setSelectedSubBenefit(list[0]?.subBenefitCode || "")
      setBenefitsLoadState("loaded")
      const total = Number(data.subBenefitsTotalFromApi ?? list.length)
      setSubBenefitsNote(
        typeof data.note === "string"
          ? data.note
          : total > list.length
            ? `Showing ${list.length} of ${total} after filter for ${SERVICE_LABELS[benefitServiceType] || benefitServiceType}.`
            : total <= 2
              ? "A short list is normal — SHA returns only packages this member may use at your facility FR code."
              : null
      )
      const visitSt = String(benefitServiceType || "OUTPATIENT").toUpperCase()
      toast({
        title: list.length ? "Sub-benefits loaded" : "No sub-benefits returned",
        description: list.length
          ? `${list.length} package(s) — see the Sub-benefits list below this section`
          : visitSt === "INPATIENT"
            ? "No IP sub-benefits for this CR + facility (accessPoint IP). Parent may be outpatient-only (SHA-12)—use Outpatient visit fund for OP witness or ask DHA for an IP UAT member."
            : "National API returned 0 packages for this CR + facility FR. Confirm branch FR code or try another visit fund type.",
      })
    } catch (err: unknown) {
      setBenefitsLoadState("error")
      const msg = err instanceof Error ? err.message : "Sub-benefits failed"
      toast({ title: "Sub-benefits failed", description: msg, variant: "destructive" })
    } finally {
      setBenefitsBusy(false)
    }
  }

  useEffect(() => {
    const sid =
      claimsSession?.sessionId != null ? Number(claimsSession.sessionId) : null
    if (!sid || !claimsSession?.subBenefitCode || subBenefits.length > 0) return
    if (benefitsSessionHydratedRef.current === sid) return
    const cr =
      claimsSession.crId != null && String(claimsSession.crId).trim()
        ? String(claimsSession.crId)
        : memberCrForBenefits
    if (!cr) return
    benefitsSessionHydratedRef.current = sid
    void loadSubBenefits({ memberCr: String(cr), ignoreParentFilter: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    claimsSession?.sessionId,
    claimsSession?.subBenefitCode,
    claimsSession?.crId,
    subBenefits.length,
    memberCrForBenefits,
  ])

  const selectedInterventionCode = selectedIntervention || undefined
  const selectedInterventionRow = interventions.find(
    (i) => String(i.interventionCode) === selectedIntervention
  )
  const needsPreauthFlag =
    Boolean(selectedInterventionRow?.needsPreauth) ||
    Boolean(selectedInterventionRow?.needsManualPreauthApproval)

  useEffect(() => {
    if (!selectedIntervention) return
    const applicable = selectedInterventionRow?.applicableDocumentTypes
    if (Array.isArray(applicable) && applicable.length) {
      setClaimDocumentType(String(applicable[0]))
    } else if (selectedIntervention.includes("003")) {
      setClaimDocumentType("IMAGING_RESULT")
    } else {
      setClaimDocumentType("CASE_NOTE")
    }
  }, [selectedIntervention, selectedInterventionRow])

  const loadClaimsContacts = async () => {
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/contacts", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: memberCrForBenefits,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(String(data.message || data.error || "Contacts failed"))
      const list = Array.isArray(data.contacts) ? data.contacts : []
      setContacts(list)
      setSelectedContactId(list[0]?.contactId || "")
      toast({ title: "Contacts loaded", description: `${list.length} contact(s) from CR` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Contacts failed"
      toast({ title: "Contacts failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const sendClaimsOtp = async () => {
    if (!selectedContactId) {
      toast({ title: "Select a contact", variant: "destructive" })
      return
    }
    if (!selectedInterventionCode) {
      toast({
        title: "Select an intervention first",
        description: "Load interventions and pick a line — national OTP requires intervention_codes.",
        variant: "destructive",
      })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/otp/send", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: memberCrForBenefits,
          contactId: selectedContactId,
          serviceType: visitServiceType,
          subBenefitCode: selectedSubBenefit || undefined,
          interventionCode: selectedInterventionCode,
          ...claimsEncounterPayload,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        throw new Error(integrationErr(data, "OTP send failed"))
      }
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      const uatHint =
        typeof data.uatOtpHint === "string" ? data.uatOtpHint : null
      const warn = typeof data.warning === "string" ? data.warning : null
      toast({
        title: warn ? "Claims OTP sent (open visit exists)" : "Claims OTP sent",
        description: warn
          ? warn
          : uatHint
            ? `UAT: enter OTP ${uatHint} below (from national API — may not SMS).`
            : String(data.message || "Check patient phone for SMS"),
        variant: warn ? "destructive" : "default",
      })
      if (uatHint) setClaimsOtp(uatHint)
      if (data.openSessionId != null && warn) {
        void loadActiveClaimsSession()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "OTP send failed"
      toast({ title: "Claims OTP failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const startBiometricsAuthorization = async () => {
    if (!selectedInterventionCode) {
      toast({
        title: "Select intervention first",
        description: "National biometrics authorization requires intervention_codes.",
        variant: "destructive",
      })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/authorize/biometrics", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: memberCrForBenefits,
          sessionId: claimsSession?.sessionId,
          serviceType: visitServiceType,
          subBenefitCode: selectedSubBenefit || undefined,
          interventionCode: selectedInterventionCode,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(integrationErr(data, "Biometrics authorize failed"))
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      const iframe =
        typeof data.iframeUrl === "string"
          ? data.iframeUrl
          : typeof data.iframe_url === "string"
            ? data.iframe_url
            : null
      setBiometricsIframeUrl(iframe)
      const token =
        typeof data.authorizationToken === "string"
          ? data.authorizationToken
          : typeof data.authGuid === "string"
            ? data.authGuid
            : null
      setBiometricsAuthToken(token)
      toast({
        title: "Biometrics authorization started",
        description: iframe
          ? "Complete fingerprint capture in the iframe below, then Start SHA visit with auth_guid."
          : String(data.message || "Check env AFYACONNECT_BIOMETRICS_* on server"),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Biometrics failed"
      toast({ title: "Biometrics authorization failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const rejectStuckBiometrics = async () => {
    const token = biometricsAuthToken
    if (!token) {
      toast({ title: "No pending authorization token", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/authorize/reject", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ authorizationToken: token }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(String(data.message || data.error || "Reject failed"))
      setBiometricsIframeUrl(null)
      setBiometricsAuthToken(null)
      toast({ title: "Authorization rejected", description: "You can start a new biometrics or OTP flow." })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reject failed"
      toast({ title: "Reject failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const startShaVisit = async () => {
    const sessionAuthGuid =
      claimsSession?.authGuid != null ? String(claimsSession.authGuid) : null
    const hasOtp = Boolean(claimsOtp.trim())
    const hasBio = Boolean(sessionAuthGuid)
    if (!hasOtp && !hasBio) {
      toast({
        title: "Consent required",
        description: "Enter claims OTP or complete biometrics authorization first.",
        variant: "destructive",
      })
      return
    }
    if (visitActive) {
      toast({
        title: "Visit already open",
        description: `National visit ${nationalVisitId} is active — use the claim steps below.`,
      })
      return
    }
    const st = String(claimsSession?.sessionStatus || "")
    if (
      mode === "live" &&
      !hasBio &&
      st !== "otp_sent" &&
      st !== "draft" &&
      st !== "ready_for_visit"
    ) {
      toast({
        title: "Send claims OTP first",
        description:
          st === "failed"
            ? `Last error: ${String(claimsSession?.lastError || "unknown")}. Send claims OTP again.`
            : "National visit needs Send claims OTP (not the SHR consent card).",
        variant: "destructive",
      })
      return
    }
    if (
      mode === "live" &&
      String(visitServiceType).toUpperCase() === "INPATIENT" &&
      (outpatientOnlyPackages || witnessCoverage?.inpatientPackagesAvailable === false)
    ) {
      const proceed = window.confirm(
        "National API shows no inpatient sub-benefits (SHA-07 / IP accessPoint) for this member at your facility. " +
          "An IP visit may start but claim lines and discharge witness will fail until DHA provides an IP test CR.\n\n" +
          "Start inpatient visit anyway?"
      )
      if (!proceed) return
    }
    try {
      setClaimsBusy(true)
      setClaimStatus("Starting national SHA visit…")
      const res = await integrationFetch("/api/integrations/sha/claims/visit/start", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: memberCrForBenefits,
          sessionId: claimsSession?.sessionId,
          serviceType: visitServiceType,
          subBenefitCode: selectedSubBenefit || undefined,
          interventionCode: selectedInterventionCode,
          otp: hasOtp ? claimsOtp.trim() : undefined,
          authGuid: hasBio ? sessionAuthGuid : undefined,
          ...claimsEncounterPayload,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        if (data.session) setClaimsSession(data.session as Record<string, unknown>)
        throw new Error(integrationErr(data, "Start visit failed"))
      }
      if (data.session) {
        const session = data.session as Record<string, unknown>
        setClaimsSession(session)
        if (session.nationalVisitId) {
          void refreshClaimPreview(session)
        }
      }
      setClaimStatus(null)
      if (data.mode === "live" && !data.nationalVisitId) {
        toast({
          title: "Visit response incomplete",
          description: String(
            data.message || data.error || "No national visit id — check API logs / Postman body."
          ),
          variant: "destructive",
        })
        return
      }
      const sync = data.nationalDiagnosisSync as { synced?: boolean; error?: string } | undefined
      toast({
        title: "SHA visit started",
        description: data.nationalVisitId
          ? sync?.synced
            ? `Visit ${data.nationalVisitId} · diagnosis synced from HMIS encounter`
            : sync?.error
              ? `Visit ${data.nationalVisitId} · diagnosis sync: ${sync.error}`
              : `Visit ID ${data.nationalVisitId}`
          : String(data.message || "See session below"),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Start visit failed"
      setClaimStatus(`Start visit failed: ${msg}`, "error")
      toast({ title: "Start visit failed", description: msg, variant: "destructive" })
      void loadActiveClaimsSession()
    } finally {
      setClaimsBusy(false)
    }
  }

  const nationalVisitId =
    claimsSession?.nationalVisitId != null ? String(claimsSession.nationalVisitId) : ""
  const visitActive =
    claimsSession?.sessionStatus === "visit_active" && Boolean(nationalVisitId)
  const activeVisitServiceType = String(
    claimsSession?.serviceType || visitServiceType
  ).toUpperCase()
  const isInpatientNationalVisit = visitActive && activeVisitServiceType === "INPATIENT"
  const preauthRef =
    claimsSession?.preauthReference != null ? String(claimsSession.preauthReference) : ""
  const claimRef =
    claimsSession?.claimReference != null ? String(claimsSession.claimReference) : ""

  useEffect(() => {
    if (visitActive) void loadPatientDocumentsForClaims()
  }, [visitActive, loadPatientDocumentsForClaims])

  const attachmentMissingCodes =
    missingAttachmentCodes.length > 0
      ? missingAttachmentCodes
      : visitInterventionCodes.filter(
          (code) =>
            !visitLineRows.some((r) => r.kind === "attachment" && r.code === code)
        )

  const attachInterventionCode =
    attachTargetCode ||
    selectedIntervention ||
    attachmentMissingCodes[0] ||
    visitInterventionCodes[0] ||
    undefined

  useEffect(() => {
    if (!visitActive || !visitInterventionsForAttach.length) return
    const codes = visitInterventionsForAttach.map((r) => r.code)
    if (attachTargetCode && codes.includes(attachTargetCode)) return
    const prefer =
      attachmentMissingCodes.find((c) => codes.includes(c)) ||
      visitInterventionsForAttach[0]?.code ||
      ""
    if (prefer) setAttachTargetCode(prefer)
  }, [
    visitActive,
    visitInterventionsForAttach,
    attachmentMissingCodes,
    attachTargetCode,
  ])

  useEffect(() => {
    if (!attachTargetCode) return
    if (attachTargetCode.includes("003")) {
      setClaimDocumentType("IMAGING_RESULT")
    } else if (attachTargetCode.includes("001")) {
      setClaimDocumentType("CASE_NOTE")
    }
  }, [attachTargetCode])

  const uploadPdfToClaim = async (file: File, attachAllMissing: boolean) => {
    if (!visitActive) {
      toast({ title: "Active national visit required", variant: "destructive" })
      return
    }
    const codes = attachAllMissing
      ? attachmentMissingCodes
      : attachInterventionCode
        ? [attachInterventionCode]
        : []
    if (!codes.length) {
      toast({
        title: attachAllMissing ? "Nothing to attach" : "Select an intervention",
        description: attachAllMissing
          ? "Refresh preview — all interventions may already have attachments."
          : "Choose “Attach to intervention” in the attachments box.",
        variant: "destructive",
      })
      return
    }
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt_token") ||
      localStorage.getItem("auth_token")
    try {
      setClaimsBusy(true)
      for (const code of codes) {
        setClaimStatus(`Uploading attachment for ${code}…`)
        const form = new FormData()
        form.append("file", file)
        form.append("patientId", String(patientId))
        if (claimsSession?.sessionId != null) {
          form.append("sessionId", String(claimsSession.sessionId))
        }
        form.append("interventionCode", code)
        form.append("documentType", claimDocumentType)
        const res = await fetch(
          integrationApiUrl("/api/integrations/sha/claims/attachments/upload"),
          {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
          }
        )
        const data = await readIntegrationJson<Record<string, unknown>>(res)
        if (!res.ok) {
          throw new Error(integrationErr(data, "Upload attach failed"))
        }
        if (data.preview) applyClaimPreview(data.preview as Record<string, unknown>)
      }
      setClaimStatus(`Attached PDF to ${codes.join(", ")}.`)
      toast({ title: "Attachment added", description: `Linked to ${codes.join(", ")}` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setClaimStatus(`Attach failed: ${msg}`, "error")
      toast({ title: "Attachment failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const attachClinicalFromDocument = async (attachAllMissing: boolean) => {
    if (!visitActive) {
      toast({ title: "Active national visit required", variant: "destructive" })
      return
    }
    if (!selectedPatientDocId) {
      toast({
        title: "Select a patient document",
        description: "Upload a PDF in Patient documents first, then attach it to the national claim.",
        variant: "destructive",
      })
      return
    }
    if (!attachAllMissing && !attachInterventionCode) {
      toast({
        title: "Select intervention on visit",
        description: "Use the “Attach to intervention” dropdown in the attachments box.",
        variant: "destructive",
      })
      return
    }
    try {
      setClaimsBusy(true)
      setClaimStatus(
        attachAllMissing
          ? "Attaching document to all interventions missing attachments…"
          : "Attaching document to national claim…"
      )
      const res = await integrationFetch("/api/integrations/sha/claims/attachments/from-document", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          documentId: Number(selectedPatientDocId),
          interventionCode: attachAllMissing ? undefined : attachInterventionCode,
          documentType: claimDocumentType,
          attachAllMissing,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        throw new Error(integrationErr(data, "Attach failed"))
      }
      if (data.preview) applyClaimPreview(data.preview as Record<string, unknown>)
      const ok = attachAllMissing
        ? "Document attached for all lines that were missing attachments."
        : `Attached to ${attachInterventionCode} (${claimDocumentType}).`
      setClaimStatus(ok)
      toast({ title: "Attachment added", description: ok })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Attach failed"
      setClaimStatus(`Attach failed: ${msg}`, "error")
      toast({ title: "Attachment failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const requestPreauth = async () => {
    if (!visitActive) {
      toast({ title: "Start SHA visit first", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/preauth/request", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          interventionCode: selectedInterventionCode,
          preauthType,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      if (!res.ok) throw new Error(integrationErr(data, "Preauth failed"))
      const pathHint =
        data.preauthPath != null ? ` · ${String(data.preauthPath)}` : ""
      toast({
        title: "Preauth requested",
        description: data.preauthReference
          ? `Ref ${String(data.preauthReference)}${pathHint}`
          : String(data.message || "See session") + pathHint,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preauth failed"
      toast({ title: "Preauth failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const requestDischargeOtp = async (): Promise<string | null> => {
    const res = await integrationFetch("/api/integrations/sha/claims/discharge/otp/send", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({
        patientId: Number(patientId),
        sessionId: claimsSession?.sessionId,
      }),
    })
    const data = await readIntegrationJson<Record<string, unknown>>(res)
    if (!res.ok) {
      throw new Error(integrationErr(data, "Discharge OTP failed"))
    }
    const uatHint = typeof data.uatOtpHint === "string" ? data.uatOtpHint : null
    if (uatHint) {
      setDischargeOtp(uatHint)
      return uatHint
    }
    return dischargeOtp.trim() || null
  }

  const sendDischargeOtp = async () => {
    if (!visitActive) {
      toast({ title: "Active national visit required", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      setClaimStatus("Requesting discharge OTP…")
      const hint = await requestDischargeOtp()
      const desc = hint
        ? `UAT: OTP ${hint} filled in — use Submit national claim.`
        : "Check patient phone for SMS, enter Discharge OTP, then submit."
      setClaimStatus(desc)
      toast({ title: "Discharge OTP sent", description: desc })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Discharge OTP failed"
      setClaimStatus(`Discharge OTP failed: ${msg}`, "error")
      toast({ title: "Discharge OTP failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const submitNationalClaim = async () => {
    if (!visitActive) {
      toast({ title: "Active national visit required", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      setClaimStatus(null)
      setClaimStatus("Checking claim (preview + billing lines)…")
      let otp = dischargeOtp.trim()
      if (!otp) {
        setClaimStatus("No discharge OTP yet — requesting from national HIE…")
        otp = (await requestDischargeOtp()) || ""
      }
      if (!otp) {
        const msg =
          "Add billing lines, then Send discharge OTP (or enter the SMS code) before submit."
        setClaimStatus(msg, "error")
        toast({ title: "Discharge OTP required", description: msg, variant: "destructive" })
        return
      }
      setClaimStatus("Submitting national claim…")
      const res = await integrationFetch("/api/integrations/sha/claims/submit", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          dischargeOtp: otp,
          ...claimsEncounterPayload,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        const detail = integrationErr(data, "Submit failed")
        const preview = data.preview as Record<string, unknown> | undefined
        const billCount = Array.isArray(preview?.invoiceLines) ? preview.invoiceLines.length : null
        const extra =
          billCount === 0
            ? " Add at least one billing line (priced), then Refresh preview."
            : ""
        throw new Error(detail + extra)
      }
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      if (data.preview) applyClaimPreview(data.preview as Record<string, unknown>)
      const ref =
        data.claimReference != null ? String(data.claimReference) : ""
      const okDesc = ref
        ? `National claim accepted. Reference: ${ref}`
        : String(data.message || "National claim submitted — check session for reference.")
      setClaimStatus(okDesc, "success")
      if (ref) setLastSubmittedClaimRef(ref)
      toast({
        title: "National claim submitted",
        description: ref ? `Claim reference ${ref}` : okDesc,
        duration: 12000,
      })
      void loadActiveClaimsSession()
      await loadClaimHistory()
      claimHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submit failed"
      setClaimStatus(msg.startsWith("Submit failed") ? msg : `Submit failed: ${msg}`, "error")
      toast({
        title: "Claim submit failed",
        description: msg,
        variant: "destructive",
        duration: 15000,
      })
    } finally {
      setClaimsBusy(false)
    }
  }

  const addBillingLineToVisit = async () => {
    if (!selectedInterventionCode) {
      toast({ title: "Select an intervention", variant: "destructive" })
      return
    }
    const price = billingUnitPrice.trim() || "100"
    if (Number(price) <= 0) {
      toast({ title: "Unit price must be greater than 0", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/billing/lines/add", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          interventionCode: selectedInterventionCode,
          unitPrice: price,
          quantity: 1,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        throw new Error(String(data.message || data.msg || data.error || "Billing line failed"))
      }
      if (data.preview) applyClaimPreview(data.preview as Record<string, unknown>)
      const okMsg = data.lineId
        ? `Billing line ${data.lineId} (${price} KES)`
        : String(data.message || "Billable line added")
      setLastLineAction(okMsg)
      toast({ title: "Billing line added", description: okMsg })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Billing line failed"
      setLastLineAction(`Failed: ${msg}`)
      toast({ title: "Billing line failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const switchInterventionOnVisit = async () => {
    if (!visitActive) {
      toast({ title: "Active national visit required", variant: "destructive" })
      return
    }
    if (!selectedInterventionCode) {
      toast({ title: "Select current intervention (from catalog)", variant: "destructive" })
      return
    }
    if (!switchToIntervention || switchToIntervention === selectedInterventionCode) {
      toast({ title: "Pick a different intervention to switch to", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/visit/lines/switch", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          existingInterventionCode: selectedInterventionCode,
          newInterventionCode: switchToIntervention,
          retainBillItems: true,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(String(data.message || data.error || "Switch failed"))
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      setSelectedIntervention(switchToIntervention)
      if (data.preview) applyClaimPreview(data.preview as Record<string, unknown>)
      if (data.submitReadiness) setSubmitReadiness(data.submitReadiness as typeof submitReadiness)
      setLastLineAction(`Switched ${selectedInterventionCode} → ${switchToIntervention}`)
      toast({
        title: "Intervention switched",
        description: String(data.message || "National visit updated"),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Switch failed"
      toast({ title: "Switch failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const retireInterventionFromVisit = async () => {
    if (!selectedInterventionCode) {
      toast({ title: "Select an intervention to retire", variant: "destructive" })
      return
    }
    const row = visitLineRows.find(
      (r) => r.kind === "intervention" && r.code === selectedInterventionCode
    )
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/visit/lines/retire", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          lineId: row?.lineId || undefined,
          interventionCode: selectedInterventionCode,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        throw new Error(String(data.message || data.error || "Retire failed"))
      }
      if (data.preview) applyClaimPreview(data.preview as Record<string, unknown>)
      setLastLineAction(`Retired ${selectedInterventionCode}`)
      toast({ title: "Intervention retired", description: String(data.message || "OK") })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Retire failed"
      toast({ title: "Retire failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const addLineToVisit = async () => {
    if (!selectedInterventionCode) {
      toast({ title: "Select an intervention", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/visit/lines/add", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          interventionCode: selectedInterventionCode,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) {
        throw new Error(String(data.message || data.msg || data.error || "Add line failed"))
      }
      const label =
        interventions.find((i) => String(i.interventionCode) === selectedInterventionCode)?.name ||
        selectedInterventionCode
      if (data.preview) {
        applyClaimPreview(data.preview as Record<string, unknown>)
      } else {
        const lineId = data.lineId != null ? String(data.lineId) : null
        setVisitLineRows((prev) => {
          if (lineId && prev.some((x) => x.lineId === lineId)) return prev
          return [
            ...prev,
            {
              kind: "intervention" as const,
              code: selectedInterventionCode,
              lineId,
              name: label,
            },
          ]
        })
      }
      const okMsg = data.lineId
        ? `${label} — line id ${data.lineId}`
        : String(data.message || "Added (no line id in response)")
      setLastLineAction(okMsg)
      toast({
        title: "Line added to national visit",
        description: okMsg,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Add line failed"
      setLastLineAction(`Failed: ${msg}`)
      toast({ title: "Add line failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const cancelPreauth = async () => {
    if (!preauthRef) {
      toast({ title: "No preauth on session", variant: "destructive" })
      return
    }
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/preauth/cancel", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          preauthReference: preauthRef,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(integrationErr(data, "Preauth cancel failed"))
      toast({
        title: "Preauth cancel sent",
        description: String(data.message || "Confirm on national middleware"),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preauth cancel failed"
      toast({ title: "Preauth cancel failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const closeNationalVisit = async () => {
    try {
      setClaimsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/claims/visit/close", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          sessionId: claimsSession?.sessionId,
          reason: "HMIS close — aborted or test reset",
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(integrationErr(data, "Close failed"))
      if (data.session) setClaimsSession(data.session as Record<string, unknown>)
      setVisitLineRows([])
      setSubmitReadiness(null)
      setDischargeOtp("")
      void loadActiveClaimsSession()
      void loadClaimHistory()
      toast({ title: "National visit closed", description: String(data.message || "Session closed") })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Close failed"
      toast({ title: "Close visit failed", description: msg, variant: "destructive" })
    } finally {
      setClaimsBusy(false)
    }
  }

  const loadInterventions = async (code?: string) => {
    const subBenefitCode = code || selectedSubBenefit
    if (!subBenefitCode) return
    try {
      setBenefitsBusy(true)
      const res = await integrationFetch("/api/integrations/sha/benefits/interventions", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          memberCrNumber: memberCrForBenefits,
          subBenefitCode,
        }),
      })
      const data = await readIntegrationJson<Record<string, unknown>>(res)
      if (!res.ok) throw new Error(String(data.message || data.error || "Interventions failed"))
      const list = Array.isArray(data.interventions) ? data.interventions : []
      setInterventions(list)
      const firstCode =
        list[0]?.interventionCode != null ? String(list[0].interventionCode) : ""
      setSelectedIntervention(firstCode)
      toast({
        title: "Interventions loaded",
        description: `${list.length} package line(s) — pick one before OTP / visit`,
      })
      if (list.length && !contacts.length) {
        void loadClaimsContacts()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Interventions failed"
      toast({ title: "Interventions failed", description: msg, variant: "destructive" })
    } finally {
      setBenefitsBusy(false)
    }
  }

  if (!effectiveNupi?.trim() && !idNumber?.trim()) return null

  const eligible = result?.eligible
  const isError = Boolean(result?.error)
  /** eClaims read is independent of eligibility outcome — only needs member CR / NUPI */
  const showEclaimsBenefitsStep = Boolean(memberCrForBenefits)

  const hasWitnessOpSubmit = claimHistory.some(
    (r) =>
      Boolean(r.claimReference) &&
      String(r.serviceType || "").toUpperCase() === "OUTPATIENT"
  )
  const hasWitnessIpDischarge = claimHistory.some(
    (r) =>
      Boolean(r.claimReference) &&
      String(r.serviceType || "").toUpperCase() === "INPATIENT"
  )

  const witnessTrackBadge = (track?: WitnessTrackRow, evidenceDone?: boolean) => {
    if (evidenceDone) {
      return (
        <Badge className="bg-emerald-600 text-[9px] font-normal">Evidence recorded</Badge>
      )
    }
    const st = track?.status || "unknown"
    if (st === "ready") {
      return (
        <Badge variant="outline" className="border-emerald-400 text-[9px] font-normal text-emerald-800">
          Ready to test
        </Badge>
      )
    }
    if (st === "awaiting_dha") {
      return (
        <Badge variant="outline" className="border-amber-400 text-[9px] font-normal text-amber-900">
          Awaiting DHA IP CR
        </Badge>
      )
    }
    if (st === "manual") {
      return (
        <Badge variant="secondary" className="text-[9px] font-normal">
          Manual witness
        </Badge>
      )
    }
    return (
      <Badge variant="destructive" className="text-[9px] font-normal">
        Blocked
      </Badge>
    )
  }

  const schemesSummary = Array.isArray(result?.schemesSummary)
    ? (result.schemesSummary as Array<Record<string, unknown>>)
    : []

  const coverageLabel = (status: unknown) => {
    const s = String(status ?? "").trim()
    if (s === "1" || s.toLowerCase() === "active") return "Active"
    if (s === "0") return "Inactive"
    return s || "Unknown"
  }

  const showNationalVisitWorkflow =
    visitActive ||
    (Boolean(result) && !isError && Boolean(selectedSubBenefit)) ||
    Boolean(
      claimsSession &&
        ["otp_sent", "ready_for_visit", "visit_active"].includes(String(claimsSession.sessionStatus))
    )

  const submitReadinessChecklist = (
    <div
      id="sha-submit-readiness"
      className="rounded-md border border-emerald-600/50 bg-emerald-50/90 p-3 dark:bg-emerald-950/50"
    >
      <p className="font-sans text-xs font-semibold text-emerald-950 dark:text-emerald-100">
        Submit readiness checklist
      </p>
      {submitReadiness ? (
        <ul className="mt-2 space-y-1 text-[11px]">
          <li className={submitReadiness.claimDoctorOk ? "text-emerald-800" : "text-amber-900"}>
            Doctor:{" "}
            {submitReadiness.claimDoctorOk
              ? submitReadiness.claimDoctorIdentificationNumber || "OK"
              : "not resolved — Administration → Users → Lookup HWR (KMPDC reg)"}
          </li>
          <li
            className={
              submitReadiness.hasDiagnosisOnClaim || submitReadiness.encounterIcd11
                ? "text-emerald-800"
                : "text-amber-900"
            }
          >
            Diagnosis:{" "}
            {submitReadiness.hasDiagnosisOnClaim
              ? "on national claim"
              : submitReadiness.encounterIcd11
                ? `will apply ICD-11 ${submitReadiness.encounterIcd11} on submit`
                : "link HMIS encounter or set AFYACONNECT_CLAIM_DEFAULT_ICD11"}
          </li>
          <li
            className={
              submitReadiness.hasBillingLines ? "text-emerald-800" : "text-amber-900"
            }
          >
            Billing lines:{" "}
            {submitReadiness.hasBillingLines
              ? "priced invoice line on visit"
              : "Add billing line (unit price > 0), then Refresh preview"}
          </li>
          <li
            className={
              submitReadiness.attachmentsOk !== false ? "text-emerald-800" : "text-amber-900"
            }
          >
            Attachments:{" "}
            {submitReadiness.attachmentsOk === false &&
            submitReadiness.missingAttachments?.length
              ? `missing for ${submitReadiness.missingAttachments.join(", ")}`
              : submitReadiness.attachmentsOk !== false
                ? "OK for previewed interventions"
                : "attach PDFs per intervention, then Refresh preview"}
          </li>
          <li className="text-muted-foreground">
            Discharge OTP: Send discharge OTP (UAT may auto-fill from toast) before Submit
          </li>
          {submitReadiness.readyToSubmit ? (
            <li className="font-medium text-emerald-800">
              Ready to submit (after discharge OTP)
            </li>
          ) : submitReadiness.blockers?.length ? (
            <li className="text-amber-900">
              Still needed: {submitReadiness.blockers.join(" · ")}
            </li>
          ) : (
            <li className="text-muted-foreground">Add billing lines and attachments as needed.</li>
          )}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Press <strong>Refresh preview</strong> to load doctor, diagnosis, billing, and attachment
          status from the national middleware.
        </p>
      )}
    </div>
  )

  return (
    <Alert className="border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/25">
      <ShieldCheck className="h-4 w-4 text-violet-800" />
      <AlertTitle className="flex flex-wrap items-center gap-2 text-sm">
        SHA eligibility
        {mode ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {mode}
          </Badge>
        ) : null}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3 text-xs">
        <p>
          {effectiveNupi ? (
            <>
              NUPI <span className="font-mono">{effectiveNupi}</span>.
            </>
          ) : (
            <>
              No NUPI on chart yet
              {idNumber ? (
                <>
                  {" "}
                  (ID: {idType || "—"} <span className="font-mono">{idNumber}</span>).
                </>
              ) : null}{" "}
              Run <strong>Check eligibility</strong> to resolve dependant NUPI from CR, or complete
              Client Registry search at registration.
            </>
          )}{" "}
          Use before starting a funded visit or claim (national live check requires AfyaConnect
          eligibility + <code className="text-[10px]">ELIGIBILITY_MODE=live</code>). Admin:{" "}
          <Link
            href="/administration?tab=system#afyaconnect-coverage"
            className="font-medium text-violet-900 underline underline-offset-2"
          >
            Run preflight
          </Link>
          .
        </p>
        {guardianIncomplete ? (
          <p className="rounded-md border border-amber-300/80 bg-amber-50/90 px-2 py-1.5 text-[10px] text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Patient is under 18 ({ageYearsFromDateOfBirth(dateOfBirth)} yrs). Add{" "}
            <strong>parent or guardian</strong> name and phone on the patient record (next of kin) —
            national claims OTP and consent often use the registered contact.
          </p>
        ) : null}
        {!effectiveNupi && isDependantIdType(idType) ? (
          <p className="rounded-md border border-sky-200/80 bg-sky-50/80 px-2 py-1.5 text-[10px] text-sky-950 dark:border-sky-900 dark:bg-sky-950/40">
            Dependant with birth certificate: national SHA does not eligibility-check birth cert
            alone. <strong>Check eligibility</strong> resolves{" "}
            <span className="font-mono">ClientRegistry ID</span> from CR automatically.
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1 max-w-xl">
            <span className="font-sans text-[10px] text-muted-foreground">
              Eligibility <strong>context</strong> — all four visit types stay available under{" "}
              <strong>National visit fund</strong> below. This dropdown only sets{" "}
              <code className="text-[10px]">service_type</code> on{" "}
              <code className="text-[10px]">GET …/patients/eligibility</code> (scheme view), not
              which visit types you may start.
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-9 w-[200px] bg-background">
                  <SelectValue placeholder="Eligibility context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTPATIENT">Outpatient (SHIF)</SelectItem>
                  <SelectItem value="CAPITATION">Capitation (PHC)</SelectItem>
                  <SelectItem value="INPATIENT">Inpatient (SHIF)</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency (ECCIF)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 text-[10px]"
                disabled={visitActive}
                onClick={() => setServiceType(visitServiceType)}
              >
                Match visit fund (
                {SERVICE_LABELS[visitServiceType] || visitServiceType})
              </Button>
            </div>
          </div>
          <Button type="button" size="sm" disabled={loading} onClick={() => void check()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check eligibility"}
          </Button>
        </div>
        {visitTypeMismatchHint && !visitActive ? (
          <p className="rounded border border-amber-300/80 bg-amber-50/90 px-2 py-1.5 text-[10px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {visitTypeMismatchHint}
          </p>
        ) : null}
        {visitActive ? (
          <Alert className="border-2 border-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40">
            <AlertTitle className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
              National visit open
              {nationalVisitId ? (
                <>
                  {" "}
                  · <span className="font-mono">{nationalVisitId}</span>
                </>
              ) : null}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              {submitReadinessChecklist}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={previewRefreshing || claimsBusy}
                  onClick={() => void refreshClaimPreview()}
                >
                  {previewRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Refresh preview
                </Button>
                <span className="self-center text-[10px] text-muted-foreground">
                  Full claim controls (interventions, billing, submit) are in the green{" "}
                  <strong>National visit (eClaims)</strong> section below.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        {result ? (
          <div
            className={`rounded-md border bg-background/80 p-3 text-[11px] ${
              isError ? "border-destructive/40 text-destructive" : "border-violet-200/80"
            }`}
          >
            {isError ? (
              <p className="font-sans whitespace-pre-wrap">{String(result.error)}</p>
            ) : (
              <div className="space-y-3 font-sans">
                <div className="flex flex-wrap items-start gap-2">
                  {eligible === true ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : eligible === false ? (
                    <span className="mt-0.5 text-amber-700 font-bold">✕</span>
                  ) : (
                    <span className="mt-0.5 text-muted-foreground">?</span>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">
                      {eligible === true
                        ? "Eligible for funded care"
                        : eligible === false
                          ? "Not eligible on active schemes"
                          : "Member found — review coverage"}
                    </p>
                    <p className="text-muted-foreground">
                      {result.fullName ? String(result.fullName) : "Member"}
                      {result.memberCrNumber ? (
                        <>
                          {" · "}
                          <span className="font-mono text-[10px]">{String(result.memberCrNumber)}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Eligibility context:{" "}
                    {SERVICE_LABELS[String(result.serviceType || serviceType).toUpperCase()] ||
                      String(result.serviceType || serviceType)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Badge shows the context you selected for this check, not the only visit type allowed.
                  Billable packages depend on{" "}
                  <strong>parent/sub-benefits</strong> (e.g. SHA-12 outpatient vs SHA-07 inpatient) and
                  your facility FR code — use <strong>Load parent benefits</strong> below.
                </p>

                {result.isDependantMember || result.dependantNote ? (
                  <p className="rounded border border-sky-200/80 bg-sky-50/80 px-2 py-1.5 text-[10px] leading-snug text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                    {result.dependantNote
                      ? String(result.dependantNote)
                      : "Dependant member: national SHA uses this patient’s NUPI (Client Registry ID), not birth certificate alone."}
                    {result.linkedParentCrId ? (
                      <>
                        {" "}
                        Linked household parent CR:{" "}
                        <span className="font-mono">{String(result.linkedParentCrId)}</span>
                      </>
                    ) : null}
                  </p>
                ) : null}

                {result.suggestPersistNupi ? (
                  <div className="flex flex-wrap items-center gap-2 rounded border border-amber-300/80 bg-amber-50/70 px-2 py-1.5 text-[10px]">
                    <span>
                      Save NUPI{" "}
                      <span className="font-mono">{String(result.suggestPersistNupi)}</span> on this
                      chart so future checks skip CR lookup.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-[10px]"
                      onClick={async () => {
                        try {
                          const { patientApi } = await import("@/lib/api")
                          await patientApi.update(String(patientId), {
                            nupi: String(result.suggestPersistNupi),
                          })
                          toast({ title: "NUPI saved", description: String(result.suggestPersistNupi) })
                          void check()
                        } catch (e: unknown) {
                          toast({
                            title: "Could not save NUPI",
                            description: e instanceof Error ? e.message : "Update failed",
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      Save NUPI to patient
                    </Button>
                  </div>
                ) : null}

                {result.message ? (
                  <p className="rounded bg-muted/50 px-2 py-1.5 text-foreground leading-snug">
                    {String(result.message)}
                  </p>
                ) : null}

                {result.statusDesc && String(result.statusDesc) !== String(result.message) ? (
                  <p className="text-[10px] text-muted-foreground">{String(result.statusDesc)}</p>
                ) : null}

                {schemesSummary.length > 0 ? (
                  <ul className="space-y-2">
                    {schemesSummary.map((row, idx) => (
                      <li
                        key={`${row.schemeName ?? "scheme"}-${idx}`}
                        className="rounded border bg-background px-2 py-2 space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{String(row.schemeName ?? "Scheme")}</span>
                          {row.memberType ? (
                            <Badge variant="outline" className="text-[9px] font-normal">
                              {String(row.memberType)}
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-normal ${
                              coverageLabel(row.coverageStatus) === "Active"
                                ? "border-emerald-300 text-emerald-800"
                                : ""
                            }`}
                          >
                            {coverageLabel(row.coverageStatus)}
                          </Badge>
                        </div>
                        {row.policyNumber ? (
                          <p className="text-[10px] text-muted-foreground">
                            Policy{" "}
                            <span className="font-mono">{String(row.policyNumber)}</span>
                            {row.policyStart || row.policyEnd ? (
                              <>
                                {" · "}
                                {row.policyStart ? String(row.policyStart) : "…"}
                                {" → "}
                                {row.policyEnd ? String(row.policyEnd) : "…"}
                              </>
                            ) : null}
                          </p>
                        ) : null}
                        {row.coverageReason ? (
                          <p className="text-[10px]">{String(row.coverageReason)}</p>
                        ) : null}
                        {row.possibleSolution ? (
                          <p className="text-[10px] text-amber-800">{String(row.possibleSolution)}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    No scheme details returned — try another service type or confirm NUPI on CR.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1 border-t border-dashed">
                  {result.scheme ? (
                    <Badge variant="outline" className="text-[9px] font-normal">
                      Primary scheme {String(result.scheme)}
                    </Badge>
                  ) : null}
                  {result.whitelistedForOTP === true ? (
                    <Badge variant="outline" className="text-[9px] font-normal text-emerald-800">
                      OTP path allowed
                    </Badge>
                  ) : result.whitelistedForOTP === false ? (
                    <Badge variant="outline" className="text-[9px] font-normal">
                      OTP whitelist: no
                    </Badge>
                  ) : null}
                  {result.requiresPreauth === true ? (
                    <Badge variant="outline" className="text-[9px] font-normal text-amber-800">
                      Pre-auth likely
                    </Badge>
                  ) : null}
                  {result.facilityBiometricsEnforced === true ? (
                    <Badge variant="outline" className="text-[9px] font-normal text-amber-900">
                      Facility biometrics enforced
                    </Badge>
                  ) : null}
                  {result.mode ? (
                    <Badge variant="outline" className="text-[9px] font-normal">
                      {String(result.mode)}
                    </Badge>
                  ) : null}
                </div>

                <details className="text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer select-none hover:text-foreground">
                    Technical response (support)
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/40 p-2 font-mono text-[9px] whitespace-pre-wrap break-all">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ) : null}
        {showEclaimsBenefitsStep && mode === "live" ? (
          <Collapsible defaultOpen className="rounded-md border border-sky-200/80 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/30">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium">
              UAT witness tracks (while awaiting inpatient test member)
              <span className="text-[10px] font-normal text-muted-foreground">expand</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-t border-sky-200/60 px-3 pb-3 pt-2 dark:border-sky-900">
              {witnessCoverage?.uatSmokeNote ? (
                <p className="text-[10px] text-muted-foreground">{witnessCoverage.uatSmokeNote}</p>
              ) : null}
              <ul className="space-y-2 text-[10px]">
                {(
                  [
                    ["shifOutpatient", hasWitnessOpSubmit] as const,
                    ["shifInpatient", hasWitnessIpDischarge] as const,
                    ["phcCapitation", false] as const,
                    ["eccifEmergency", false] as const,
                  ] as const
                ).map(([key, evidenceDone]) => {
                  const track = witnessCoverage?.witnessTracks?.[key]
                  return (
                    <li
                      key={key}
                      className="flex flex-wrap items-start justify-between gap-2 rounded border bg-background/80 px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{track?.label || key}</p>
                        <p className="text-muted-foreground">{track?.detail}</p>
                      </div>
                      {witnessTrackBadge(track, evidenceDone)}
                    </li>
                  )
                })}
              </ul>
              <p className="text-[10px] text-muted-foreground">
                IP packages:{" "}
                {witnessCoverage?.inpatientPackagesAvailable
                  ? "national API reports inpatient sub-benefits"
                  : "none on current CR + FR — email "}
                {!witnessCoverage?.inpatientPackagesAvailable ? (
                  <a
                    className="font-mono underline"
                    href={`mailto:${witnessCoverage?.dhaContact || "afyaconnect.dha@gmail.com"}?subject=UAT%20inpatient%20test%20CR`}
                  >
                    {witnessCoverage?.dhaContact || "afyaconnect.dha@gmail.com"}
                  </a>
                ) : null}
              </p>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        {showEclaimsBenefitsStep ? (
          <div className="rounded-md border border-dashed bg-background/60 p-2 space-y-2">
            <p className="font-sans text-[11px] text-muted-foreground">
              eClaims steps 4–5 (national read): member CR{" "}
              <span className="font-mono text-foreground">{memberCrForBenefits}</span> + your facility FR code.
              Run <strong>Check eligibility</strong> first for coverage; then review{" "}
              <strong>parent benefits</strong> (auto-loaded in live mode) and{" "}
              <strong>sub-benefits</strong> filtered by <strong>National visit fund</strong>. Packages appear
              in the lists below — not in the eligibility scheme table above.
            </p>
            {outpatientOnlyPackages ? (
              <p className="rounded border border-violet-300/80 bg-violet-50/90 px-2 py-1.5 text-[10px] text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
                <strong>Outpatient packages only</strong> on national API for this member (no SHA-07 / inpatient
                parent). Use <strong>Outpatient (SHIF)</strong> visit fund for witness on{" "}
                <span className="font-mono">12345678</span>-class UAT members, or email{" "}
                <span className="font-mono">afyaconnect.dha@gmail.com</span> for an IP-enabled test CR.
              </p>
            ) : inpatientPackagesLikely ? (
              <p className="text-[10px] text-emerald-800 dark:text-emerald-200">
                Inpatient parent benefit detected — choose <strong>Inpatient (SHIF)</strong> visit fund and load
                sub-benefits with <strong>accessPoint IP</strong>.
              </p>
            ) : null}
            {subBenefitsNote ? (
              <p className="font-sans text-[10px] text-muted-foreground">{subBenefitsNote}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={benefitsBusy || !memberCrForBenefits}
                onClick={() => void loadParentBenefits(undefined)}
              >
                {benefitsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load parent benefits"}
              </Button>
              {parentBenefits.length ? (
                <Select
                  value={selectedParentBenefit || undefined}
                  onValueChange={setSelectedParentBenefit}
                >
                  <SelectTrigger className="h-9 w-[200px] bg-background">
                    <SelectValue placeholder="Parent benefit (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentBenefits.map((b) => (
                      <SelectItem key={b.parentBenefitCode} value={b.parentBenefitCode}>
                        {b.name}
                        {b.fund ? ` · ${b.fund}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={benefitsBusy || !memberCrForBenefits}
                onClick={() => void loadSubBenefits()}
              >
                {benefitsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load sub-benefits"}
              </Button>
            </div>
            {parentBenefits.length ? (
              <ul className="space-y-1 rounded-md border bg-muted/30 p-2 text-[11px]">
                <li className="font-medium text-foreground">Parent benefits ({parentBenefits.length})</li>
                {parentBenefits.map((b) => (
                  <li key={b.parentBenefitCode} className="font-mono text-[10px] text-muted-foreground">
                    {b.name}
                    {b.parentBenefitCode !== b.name ? ` · ${b.parentBenefitCode}` : ""}
                    {b.fund ? ` · ${b.fund}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {subBenefits.length ? (
              <ul className="space-y-1 rounded-md border border-violet-200/80 bg-violet-50/40 p-2 text-[11px] dark:border-violet-900 dark:bg-violet-950/30">
                <li className="font-medium text-foreground">
                  Sub-benefits ({subBenefits.length}) — pick one to load interventions
                </li>
                {subBenefits.map((b) => (
                  <li key={b.subBenefitCode} className="text-[10px]">
                    <span className="font-medium">{b.name}</span>{" "}
                    <span className="font-mono text-muted-foreground">({b.subBenefitCode})</span>
                    {b.accessPoint ? (
                      <span className="text-muted-foreground"> · {b.accessPoint}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : benefitsLoadState === "loading" || benefitsBusy ? (
              <p className="text-[10px] text-muted-foreground">Loading packages from national API…</p>
            ) : benefitsLoadState === "error" ? (
              <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[10px] text-destructive">
                <p className="font-medium">National benefits API did not return packages</p>
                {benefitsNationalError ? (
                  <p className="font-mono whitespace-pre-wrap break-all">{benefitsNationalError}</p>
                ) : (
                  <p>Try Load sub-benefits again.</p>
                )}
                <p className="text-muted-foreground font-sans">
                  When the message includes{" "}
                  <code className="text-[9px]">edi: upstream temporarily unavailable</code>, SHA’s
                  benefits service on UAT is down — HMIS and your FR code are fine; retry later or email{" "}
                  <span className="font-mono">afyaconnect.dha@gmail.com</span> with the trace_id above.
                </p>
              </div>
            ) : benefitsLoadState === "loaded" ? (
              <p className="text-[10px] text-amber-800 dark:text-amber-200">
                {String(visitServiceType).toUpperCase() === "INPATIENT" ? (
                  <>
                    No <strong>inpatient</strong> sub-benefits (accessPoint IP) for this CR + facility FR.
                    {outpatientOnlyPackages
                      ? " National parent benefits are outpatient-only — this is expected for UAT smoke CR6724396934727-8, not an HMIS block."
                      : " Try Load parent benefits, align visit fund with eligibility context, or ask DHA for an IP UAT member."}
                  </>
                ) : (
                  <>
                    No sub-benefits returned for this CR + facility FR — try another national visit fund or
                    Load parent benefits first.
                  </>
                )}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No packages loaded yet — click <strong>Load sub-benefits</strong> or{" "}
                <strong>Check eligibility</strong> (live mode auto-loads packages).
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {subBenefits.length ? (
                <>
                  <Select
                    value={selectedSubBenefit}
                    onValueChange={(v) => {
                      setSelectedSubBenefit(v)
                      void loadInterventions(v)
                    }}
                  >
                    <SelectTrigger className="h-9 w-[200px] bg-background">
                      <SelectValue placeholder="Sub-benefit" />
                    </SelectTrigger>
                    <SelectContent>
                      {subBenefits.map((b) => (
                        <SelectItem key={b.subBenefitCode} value={b.subBenefitCode}>
                          {b.name}
                          {b.subBenefitCode !== b.name ? ` (${b.subBenefitCode})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={benefitsBusy || !selectedSubBenefit}
                    onClick={() => void loadInterventions()}
                  >
                    Load interventions
                  </Button>
                </>
              ) : null}
            </div>
            {interventions.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                  <SelectTrigger className="h-9 min-w-[220px] max-w-full bg-background">
                    <SelectValue placeholder="Intervention" />
                  </SelectTrigger>
                  <SelectContent>
                    {interventions.map((row) => {
                      const code = String(row.interventionCode ?? "")
                      const preauth =
                        row.needsPreauth || row.needsManualPreauthApproval ? " · preauth" : ""
                      return (
                        <SelectItem key={code} value={code}>
                          {String(row.name || code)}
                          {preauth}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {needsPreauthFlag ? (
                  <Badge variant="outline" className="text-[10px] font-normal text-amber-800">
                    Preauth likely
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {showNationalVisitWorkflow ? (
          <div className="rounded-md border border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30 p-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-sans text-[11px] font-medium text-emerald-950 dark:text-emerald-100">
                National visit (eClaims) — steps 6–9
              </p>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => void copyWitnessEvidence()}
                >
                  <ClipboardCopy className="mr-1 h-3 w-3" />
                  Copy witness notes
                </Button>
              </div>
            </div>
            <Collapsible className="rounded border border-emerald-400/40 bg-background/70 px-2 py-1">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-full justify-start text-[10px]">
                  Witness UAT checklist (expand)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ol className="list-decimal space-y-1 pl-4 pb-2 text-[10px] text-muted-foreground">
                  {WITNESS_UAT_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>
            {visitActive ? submitReadinessChecklist : null}
            {!selectedSubBenefit && visitActive ? (
              <p className="text-[10px] text-muted-foreground">
                Sub-benefit not loaded in this session — use Load sub-benefits above if you start a
                new visit; active visit controls below still work.
              </p>
            ) : null}
            <div className="rounded border border-dashed border-emerald-400/60 bg-background/80 p-2 space-y-2">
              <p className="font-sans text-[11px] font-medium">HMIS encounter → national diagnosis</p>
              <p className="font-sans text-[10px] text-muted-foreground">
                Document diagnosis in <strong>Consultation</strong> (ICD-10). HMIS maps to ICD-11 for the national
                claim when you link the encounter below or save while a SHA visit is open.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                {recentEncounters.length ? (
                  <Select
                    value={linkedMedicalRecordId || undefined}
                    onValueChange={(v) => setLinkedMedicalRecordId(v)}
                  >
                    <SelectTrigger className="h-9 w-[min(100%,280px)] bg-background text-xs">
                      <SelectValue placeholder="Link encounter" />
                    </SelectTrigger>
                    <SelectContent>
                      {recentEncounters.map((e) => (
                        <SelectItem key={e.recordId} value={String(e.recordId)}>
                          #{e.recordId}
                          {e.visitDate ? ` · ${e.visitDate.slice(0, 10)}` : ""}
                          {e.diagnosis ? ` · ${e.diagnosis.slice(0, 40)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[10px] text-muted-foreground">No encounters yet — save consultation first.</span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={encounterLinkBusy || !linkedMedicalRecordId}
                  onClick={() => void linkEncounterToClaimsSession()}
                >
                  {encounterLinkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link & sync diagnosis"}
                </Button>
              </div>
              {encounterDiagnosis?.icd11Code ? (
                <p className="font-mono text-[10px] text-emerald-900 dark:text-emerald-100">
                  ICD-11 for claim: {encounterDiagnosis.icd11Code}
                  {encounterDiagnosis.icd10Code ? ` (from ICD-10 ${encounterDiagnosis.icd10Code})` : ""}
                  {encounterDiagnosis.source ? ` · ${encounterDiagnosis.source}` : ""}
                </p>
              ) : linkedMedicalRecordId ? (
                <p className="text-[10px] text-amber-800 dark:text-amber-200">
                  No ICD-11 mapped — pick ICD-10 in encounter or seed{" "}
                  <code className="text-[9px]">diagnoses.icd11Code</code> / set{" "}
                  <code className="text-[9px]">AFYACONNECT_CLAIM_DEFAULT_ICD11</code>.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-violet-200/60 bg-violet-50/40 p-2 dark:border-violet-900 dark:bg-violet-950/20">
              <div className="space-y-1">
                <span className="font-sans text-[10px] font-medium text-foreground">
                  National visit fund type
                </span>
                <p className="max-w-md text-[10px] text-muted-foreground">
                  Sent as <code className="text-[9px]">service_type</code> on{" "}
                  <code className="text-[9px]">POST /claims/visit</code> and when filtering sub-benefits by{" "}
                  <code className="text-[9px]">accessPoint</code> (IP vs OP). Align with eligibility context
                  unless doing PHC/ECCIF witness.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={visitServiceType} onValueChange={setVisitServiceType} disabled={visitActive}>
                    <SelectTrigger className="h-9 w-[200px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTPATIENT">Outpatient (SHIF)</SelectItem>
                      <SelectItem value="CAPITATION">Capitation (PHC)</SelectItem>
                      <SelectItem value="INPATIENT">Inpatient (SHIF)</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency (ECCIF)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 text-[10px]"
                    disabled={visitActive}
                    onClick={() => setVisitServiceType(serviceType)}
                  >
                    Match eligibility (
                    {SERVICE_LABELS[serviceType] || serviceType})
                  </Button>
                </div>
                {outpatientOnlyPackages && String(visitServiceType).toUpperCase() === "INPATIENT" ? (
                  <p className="text-[10px] text-amber-800 dark:text-amber-200">
                    This member has no inpatient packages on UAT national API — IP visit start may succeed but
                    claim steps need IP sub-benefits. Use Outpatient (SHIF) for current test CR or request an IP
                    test member from DHA.
                  </p>
                ) : null}
              </div>
            </div>
            <p className="font-sans text-[10px] text-muted-foreground">
              Uses <strong>claims</strong> OTP (not SHR consent — that card cannot start a funded visit).
              Order: pick <strong>intervention</strong> → load contacts → <strong>Send claims OTP</strong> (SMS to
              CR phone) → enter SMS code → Start visit. UAT without SMS: request{" "}
              <a
                href="https://hie-docs.dha.go.ke/docs/consent/process/createOTPWhitelistRequest"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OTP whitelist
              </a>{" "}
              for the NUPI via AfyaConnect/DHA, or email{" "}
              <span className="font-mono">afyaconnect.dha@gmail.com</span>. Eligibility{" "}
              <code className="text-[10px]">whitelistedForOTP</code> means OTP path is allowed — not a fixed code.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={claimsBusy}
                onClick={() => void loadClaimsContacts()}
              >
                Load contacts
              </Button>
              {contacts.length ? (
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger className="h-9 w-[200px] bg-background">
                    <SelectValue placeholder="Contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.contactId} value={c.contactId}>
                        {c.contactValue || c.contactId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={claimsBusy || !selectedContactId}
                onClick={() => void sendClaimsOtp()}
              >
                Send claims OTP
              </Button>
            </div>
            {!visitActive ? (
              <div className="space-y-2">
                {(result?.facilityBiometricsEnforced === true ||
                  claimsSession?.authGuid != null) && (
                  <div className="rounded-md border border-amber-200/80 bg-amber-50/50 p-2 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="font-sans text-[10px] text-muted-foreground">
                      <strong>Biometrics path</strong> (when facility enforces fingerprint consent): start
                      authorization, complete capture in iframe, then Start visit without OTP if{" "}
                      <code className="text-[9px]">auth_guid</code> is on the session.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={claimsBusy || !selectedInterventionCode}
                        onClick={() => void startBiometricsAuthorization()}
                      >
                        Start biometrics auth
                      </Button>
                      {biometricsAuthToken ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={claimsBusy}
                          onClick={() => void rejectStuckBiometrics()}
                        >
                          Reject stuck auth
                        </Button>
                      ) : null}
                    </div>
                    {biometricsIframeUrl ? (
                      <iframe
                        title="SHA biometrics capture"
                        src={biometricsIframeUrl}
                        className="mt-2 h-[280px] w-full max-w-lg rounded border bg-background"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    ) : null}
                    {claimsSession?.authGuid != null ? (
                      <p className="mt-1 font-mono text-[10px] text-emerald-900">
                        auth_guid on session: {String(claimsSession.authGuid)}
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    className="h-9 max-w-[120px] bg-background font-mono text-sm"
                    placeholder="OTP"
                    value={claimsOtp}
                    onChange={(e) => setClaimsOtp(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      claimsBusy ||
                      (!claimsOtp.trim() && claimsSession?.authGuid == null)
                    }
                    onClick={() => void startShaVisit()}
                  >
                    {claimsBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Start SHA visit"
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
            {visitActive ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-emerald-200/60 pt-2">
                <Badge variant="outline" className="text-[10px] font-normal">
                  Visit {nationalVisitId}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {SERVICE_LABELS[activeVisitServiceType] || activeVisitServiceType}
                </Badge>
                {preauthRef ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Preauth {preauthRef}
                  </Badge>
                ) : null}
                {claimRef ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Claim {claimRef}
                  </Badge>
                ) : null}
                <Select
                  value={preauthType}
                  onValueChange={setPreauthType}
                  disabled={claimsBusy || Boolean(claimRef)}
                >
                  <SelectTrigger className="h-9 w-[130px] bg-background text-[10px]">
                    <SelectValue placeholder="Preauth type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Preauth normal</SelectItem>
                    <SelectItem value="surgical">Preauth surgical</SelectItem>
                    <SelectItem value="oncology">Preauth oncology</SelectItem>
                    <SelectItem value="elective">Preauth elective</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={claimsBusy || Boolean(claimRef)}
                  onClick={() => void requestPreauth()}
                >
                  Request preauth
                </Button>
                {preauthRef ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={claimsBusy || Boolean(claimRef)}
                    onClick={() => void cancelPreauth()}
                  >
                    Cancel preauth
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={claimsBusy || Boolean(claimRef) || !selectedInterventionCode}
                  onClick={() => void addLineToVisit()}
                >
                  Add intervention
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={claimsBusy || Boolean(claimRef) || !selectedInterventionCode}
                  onClick={() => void retireInterventionFromVisit()}
                >
                  Retire intervention
                </Button>
                {visitActive && interventions.length > 1 ? (
                  <>
                    <Select value={switchToIntervention || undefined} onValueChange={setSwitchToIntervention}>
                      <SelectTrigger className="h-9 min-w-[180px] max-w-[240px] bg-background text-xs">
                        <SelectValue placeholder="Switch to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {interventions
                          .filter((row) => String(row.interventionCode) !== selectedInterventionCode)
                          .map((row) => {
                            const code = String(row.interventionCode ?? "")
                            return (
                              <SelectItem key={code} value={code}>
                                {String(row.name || code)}
                              </SelectItem>
                            )
                          })}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        claimsBusy ||
                        Boolean(claimRef) ||
                        !selectedInterventionCode ||
                        !switchToIntervention
                      }
                      onClick={() => void switchInterventionOnVisit()}
                    >
                      Switch intervention
                    </Button>
                  </>
                ) : null}
                <Input
                  className="h-9 max-w-[72px] bg-background font-mono text-sm"
                  placeholder="KES"
                  title="Unit price for billable invoice line"
                  value={billingUnitPrice}
                  onChange={(e) => setBillingUnitPrice(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={claimsBusy || Boolean(claimRef) || !billingAllowed}
                  title={
                    billingAllowed
                      ? undefined
                      : "Add intervention to the visit first (same code as billing line)"
                  }
                  onClick={() => void addBillingLineToVisit()}
                >
                  Add billing line
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={claimsBusy || Boolean(claimRef) || previewRefreshing}
                  onClick={() => void refreshClaimPreview()}
                >
                  {previewRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Refresh preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={claimsBusy || Boolean(claimRef)}
                  onClick={() => void sendDischargeOtp()}
                >
                  Send discharge OTP
                </Button>
                <Input
                  className="h-9 max-w-[120px] bg-background font-mono text-sm"
                  placeholder="Discharge OTP"
                  value={dischargeOtp}
                  onChange={(e) => setDischargeOtp(e.target.value)}
                />
                {isInpatientNationalVisit ? (
                  <p className="w-full font-sans text-[10px] text-amber-900 dark:text-amber-200">
                    Inpatient visit: after billing lines and attachments, use discharge OTP then submit —
                    national <code className="text-[9px]">POST /claims/discharge</code> (not OP submit).
                  </p>
                ) : null}
                <p className="w-full font-sans text-[10px] text-muted-foreground">
                  Witness extras: <strong>Add / Retire / Switch intervention</strong> on this visit; confirm each in
                  Refresh preview before submit.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={claimsBusy || Boolean(claimRef)}
                  onClick={() => void submitNationalClaim()}
                >
                  {claimsBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isInpatientNationalVisit ? (
                    "Submit IP discharge"
                  ) : (
                    "Submit national claim"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={claimsBusy || Boolean(claimRef)}
                  onClick={() => void closeNationalVisit()}
                >
                  Close visit
                </Button>
              </div>
            ) : null}
            {visitActive ? (
              <div className="space-y-2 rounded-md border border-emerald-200/80 bg-background/80 p-2">
                <p className="font-sans text-[10px] font-medium text-foreground">
                  Claim attachments (required before submit)
                </p>
                <p className="font-sans text-[10px] text-muted-foreground">
                  Tag each file to an intervention on this national visit (e.g. SHA-12-001, SHA-12-003).
                  Refresh preview first if the list is empty.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={attachTargetCode || undefined}
                    onValueChange={setAttachTargetCode}
                    disabled={!visitInterventionsForAttach.length}
                  >
                    <SelectTrigger className="h-9 min-w-[200px] max-w-[280px] bg-background text-xs">
                      <SelectValue
                        placeholder={
                          visitInterventionsForAttach.length
                            ? "Attach to intervention"
                            : "No visit lines — refresh preview"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {visitInterventionsForAttach.map((row) => (
                        <SelectItem key={row.code} value={row.code}>
                          {row.label}
                          {attachmentMissingCodes.includes(row.code) ? " · needs doc" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedPatientDocId || undefined}
                    onValueChange={setSelectedPatientDocId}
                    disabled={!patientDocuments.length}
                  >
                    <SelectTrigger className="h-9 min-w-[160px] max-w-[220px] bg-background text-xs">
                      <SelectValue
                        placeholder={
                          patientDocuments.length
                            ? "Patient document"
                            : "No documents loaded"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {patientDocuments.map((d) => (
                        <SelectItem key={d.documentId} value={String(d.documentId)}>
                          {d.documentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={claimDocumentType} onValueChange={setClaimDocumentType}>
                    <SelectTrigger className="h-9 max-w-[130px] bg-background text-xs">
                      <SelectValue placeholder="Doc type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAIM_DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={claimsBusy}
                    onClick={() => void loadPatientDocumentsForClaims()}
                  >
                    Reload docs
                  </Button>
                  <input
                    ref={claimFileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (file) {
                        void uploadPdfToClaim(
                          file,
                          attachmentMissingCodes.length > 0
                        )
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={claimsBusy || Boolean(claimRef)}
                    onClick={() => claimFileInputRef.current?.click()}
                  >
                    Upload PDF to claim
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      claimsBusy ||
                      Boolean(claimRef) ||
                      !selectedPatientDocId ||
                      !attachInterventionCode
                    }
                    onClick={() => void attachClinicalFromDocument(false)}
                  >
                    Attach doc to line
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      claimsBusy ||
                      Boolean(claimRef) ||
                      !selectedPatientDocId ||
                      !attachmentMissingCodes.length
                    }
                    onClick={() => void attachClinicalFromDocument(true)}
                  >
                    Attach to all missing
                  </Button>
                </div>
                {patientDocsStatus ? (
                  <p className="font-sans text-[10px] text-muted-foreground">{patientDocsStatus}</p>
                ) : null}
                {!selectedPatientDocId && patientDocuments.length ? (
                  <p className="font-sans text-[10px] text-amber-700 dark:text-amber-400">
                    Choose a document in the dropdown — buttons stay inactive until one is selected
                    (or use Upload PDF to claim).
                  </p>
                ) : null}
                {attachmentMissingCodes.length ? (
                  <p className="font-sans text-[10px] text-muted-foreground">
                    Needs attachment for:{" "}
                    <span className="font-mono">{attachmentMissingCodes.join(", ")}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            {visitActive ? (
              <div className="rounded border border-dashed bg-background/50 p-2 text-[10px]">
                <p className="font-medium text-foreground">
                  National claim preview
                  {claimPreviewTotal ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      Total {claimPreviewTotal} KES
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Interventions = clinical lines on the visit. Billing lines = priced invoice rows
                  required before submit. Readiness checklist is at the top of this card when a visit
                  is open.
                </p>
                {visitLineRows.length ? (
                  <ul className="mt-1 list-inside list-disc font-mono text-muted-foreground">
                    {visitLineRows.map((l, idx) => (
                      <li key={`${l.kind}-${l.lineId || l.code}-${idx}`}>
                        <span className="text-foreground">
                          {l.kind === "billing"
                            ? "bill"
                            : l.kind === "attachment"
                              ? "doc"
                              : "intv"}
                        </span>{" "}
                        {l.code}
                        {l.name ? ` · ${l.name}` : ""}
                        {l.amount ? ` · ${l.amount} KES` : ""}
                        {l.documentType ? ` · ${l.documentType}` : ""}
                        {l.lineId ? ` · id ${l.lineId}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    Refresh preview after adding interventions and billing lines.
                  </p>
                )}
                {lastLineAction ? (
                  <p className="mt-1 text-muted-foreground">Last action: {lastLineAction}</p>
                ) : null}
                {claimsActionStatus?.tone === "success" ? (
                  <Alert className="mt-2 border-emerald-600/50 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-sm">Claim submitted successfully</AlertTitle>
                    <AlertDescription className="text-xs">{claimsActionStatus.text}</AlertDescription>
                  </Alert>
                ) : claimsActionStatus?.tone === "error" ? (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTitle className="text-sm">Claim not submitted</AlertTitle>
                    <AlertDescription className="text-xs">{claimsActionStatus.text}</AlertDescription>
                  </Alert>
                ) : claimsActionStatus ? (
                  <p className="mt-1 text-muted-foreground">{claimsActionStatus.text}</p>
                ) : null}
                {!visitLineRows.some((r) => r.kind === "billing") ? (
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    Submit needs at least one billing line (unit price &gt; 0), not only
                    interventions.
                  </p>
                ) : null}
                {missingAttachmentCodes.length ? (
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    Attachments still needed for:{" "}
                    <span className="font-mono">{missingAttachmentCodes.join(", ")}</span> — pick a
                    patient document and use Attach to all missing.
                  </p>
                ) : visitLineRows.some((r) => r.kind === "intervention") &&
                  claimsActionStatus?.tone !== "error" &&
                  !claimRef ? (
                  <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                    Attachments look complete for visit interventions — you can submit after
                    discharge OTP.
                  </p>
                ) : null}
              </div>
            ) : null}
            {claimsSession ? (
              <div className="space-y-1 font-sans text-[10px] text-muted-foreground">
                <p>
                  Session #{String(claimsSession.sessionId)} ·{" "}
                  <span className="font-medium">{String(claimsSession.sessionStatus)}</span>
                  {claimsSession.nationalVisitId ? (
                    <>
                      {" "}
                      · visit{" "}
                      <span className="font-mono">{String(claimsSession.nationalVisitId)}</span>
                    </>
                  ) : null}
                </p>
                {claimsSession.sessionStatus === "otp_sent" &&
                !claimsSession.nationalVisitId ? (
                  <p className="text-amber-800 dark:text-amber-200">
                    OTP step recorded — enter the code from the Send OTP toast (UAT often shows
                    &quot;Your OTP is …&quot; in the API) then Start SHA visit.
                  </p>
                ) : null}
                {claimsSession.lastError ? (
                  <p className="text-destructive">
                    Last error: {String(claimsSession.lastError)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          id="sha-claim-history"
          ref={claimHistoryRef}
          className="rounded-md border border-border/80 bg-background/60 p-2 space-y-2"
        >
          {lastSubmittedClaimRef ? (
            <p className="rounded border border-emerald-600/40 bg-emerald-50/90 px-2 py-1.5 font-mono text-[11px] text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
              Latest submit: claim ref{" "}
              <span className="font-semibold">{lastSubmittedClaimRef}</span> — recorded in history
              below for witness UAT evidence.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-sans text-[11px] font-medium text-foreground">National claim history</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[10px]"
              disabled={claimHistoryLoading}
              onClick={() => void loadClaimHistory()}
            >
              {claimHistoryLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Refresh history"
              )}
            </Button>
          </div>
          <p className="font-sans text-[10px] text-muted-foreground">
            HMIS audit of closed national visits. The live claim is on SHA / AfyaConnect — not Billing
            insurance claims.
          </p>
          {claimHistoryLoading && !claimHistory.length ? (
            <p className="text-[10px] text-muted-foreground">Loading history…</p>
          ) : !claimHistoryLoading && !claimHistory.length ? (
            <p className="text-[10px] text-muted-foreground">
              No closed national visits recorded for this patient yet.
            </p>
          ) : claimHistory.length ? (
            <ul className="space-y-2 font-sans text-[10px]">
              {claimHistory.map((row) => {
                const when = row.updatedAt
                  ? new Date(row.updatedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"
                const submitted = Boolean(row.claimReference)
                return (
                  <li
                    key={row.sessionId}
                    className="rounded border border-border/60 bg-background/80 px-2 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={submitted ? "secondary" : "outline"}
                        className="text-[9px] font-normal"
                      >
                        {submitted ? "Submitted" : row.sessionStatus}
                      </Badge>
                      {row.serviceType ? (
                        <span className="text-muted-foreground">{row.serviceType}</span>
                      ) : null}
                      <span className="text-muted-foreground">· {when}</span>
                      {row.createdByUsername ? (
                        <span className="text-muted-foreground">· {row.createdByUsername}</span>
                      ) : null}
                    </div>
                    {row.claimReference ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-foreground">
                        <span>Claim ref {row.claimReference}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1 text-[9px]"
                          onClick={() => {
                            void navigator.clipboard.writeText(String(row.claimReference))
                            toast({ title: "Claim ref copied" })
                          }}
                        >
                          <ClipboardCopy className="h-3 w-3" />
                        </Button>
                      </p>
                    ) : null}
                    {row.nationalVisitId ? (
                      <p className="mt-0.5 font-mono text-muted-foreground">
                        Visit {row.nationalVisitId}
                      </p>
                    ) : null}
                    {row.preauthReference ? (
                      <p className="mt-0.5 font-mono text-muted-foreground">
                        Preauth {row.preauthReference}
                      </p>
                    ) : null}
                    {row.sessionStatus === "failed" && row.lastError ? (
                      <p className="mt-0.5 text-destructive">{row.lastError}</p>
                    ) : null}
                    {!row.claimReference && row.sessionStatus === "closed" ? (
                      <p className="mt-0.5 text-muted-foreground">
                        Closed without a stored claim reference (visit closed or incomplete submit).
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              No closed national sessions yet for this patient.
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
