"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { insuranceApi, patientApi, standardsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  DEFAULT_FACILITY_COUNTY,
  NEXT_OF_KIN_RELATIONSHIPS,
  PATIENT_ID_TYPES,
} from "@/lib/patient-demographics"
import { ageYearsFromDateOfBirth, isPatientMinor } from "@/lib/patient-age"
import { KenyaLocationSelect } from "@/components/kenya-location-select"
import { getPublicApiBaseUrl } from "@/lib/public-api-url"
import {
  AddToQueueDialog,
  type QueueServicePointChoice,
  queueTypeLabel,
} from "@/components/add-to-queue-dialog"
import { ensurePatientInQueue } from "@/lib/patient-queue-flow"
import { Checkbox } from "@/components/ui/checkbox"

interface Patient {
  patientId?: number
  patientNumber?: string
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth?: string
  gender?: string
  patientType?: string
  insuranceCompanyId?: number | string
  insuranceNumber?: string
  phone?: string
  email?: string
  address?: string
  county?: string
  subcounty?: string
  ward?: string
  idNumber?: string
  idType?: string
  nupi?: string
  crReference?: string
  bloodGroup?: string
  nextOfKinName?: string
  nextOfKinPhone?: string
  nextOfKinRelationship?: string
}

export type PatientFormSuccessPayload = {
  patientId: number
  firstName: string
  lastName: string
  patientNumber?: string
  nupi?: string | null
}

export type PatientFormAfterSaveDestination = "chart" | "registration-desk"

interface PatientFormProps {
  patient?: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after save; payload set when a new or updated row was persisted. */
  onSuccess: (payload?: PatientFormSuccessPayload) => void
  /** TaifaCare registration desk: return to desk after save; default opens patient chart. */
  afterSaveDestination?: PatientFormAfterSaveDestination
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

function normalizeCrGender(raw?: string | null): string {
  const g = String(raw || "").toLowerCase()
  if (g === "m" || g === "male") return "Male"
  if (g === "f" || g === "female") return "Female"
  return g ? g.charAt(0).toUpperCase() + g.slice(1) : ""
}

export function PatientForm({
  patient,
  open,
  onOpenChange,
  onSuccess,
  afterSaveDestination = "chart",
}: PatientFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Patient>({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    patientType: 'paying',
    insuranceCompanyId: '',
    insuranceNumber: '',
    phone: '',
    email: '',
    address: '',
    county: '',
    subcounty: '',
    ward: '',
    idNumber: '',
    idType: '',
    bloodGroup: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crLookupBusy, setCrLookupBusy] = useState(false)
  const [crLookupHint, setCrLookupHint] = useState<string | null>(null)
  const [crLinkedParentCrId, setCrLinkedParentCrId] = useState<string | null>(null)
  const [crDependantMember, setCrDependantMember] = useState(false)
  const [crVerifiedNupi, setCrVerifiedNupi] = useState<string | null>(null)
  const [existingLocalPatient, setExistingLocalPatient] = useState<{
    patientId: number
    firstName: string
    lastName: string
    patientNumber?: string
    nupi?: string | null
  } | null>(null)
  const [continueCareWithQueue, setContinueCareWithQueue] = useState(true)
  const [pendingCarePatient, setPendingCarePatient] = useState<PatientFormSuccessPayload | null>(
    null
  )
  const [careQueueOpen, setCareQueueOpen] = useState(false)
  const [careQueueBusy, setCareQueueBusy] = useState(false)
  const crDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  // Load insurance companies when form opens
  useEffect(() => {
    if (open) {
      loadInsuranceCompanies()
    }
  }, [open])

  const loadInsuranceCompanies = async () => {
    try {
      setLoadingCompanies(true)
      const companies = await insuranceApi.getProviders('active')

      // Deduplicate by providerName, keeping the first occurrence (preferring ones with providerCode)
      const uniqueCompanies = (companies || []).reduce((acc: any[], company: any) => {
        const existing = acc.find(c =>
          c.providerName?.toLowerCase().trim() === company.providerName?.toLowerCase().trim()
        )
        if (!existing) {
          acc.push(company)
        } else {
          // If current has providerCode and existing doesn't, replace it
          if (company.providerCode && !existing.providerCode) {
            const index = acc.indexOf(existing)
            acc[index] = company
          }
        }
        return acc
      }, [])

      setInsuranceCompanies(uniqueCompanies)
    } catch (error) {
      console.error('Error loading insurance companies:', error)
    } finally {
      setLoadingCompanies(false)
    }
  }

  useEffect(() => {
    if (patient) {
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        middleName: patient.middleName || '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
        gender: patient.gender || '',
        patientType: patient.patientType || 'paying',
        insuranceCompanyId: patient.insuranceCompanyId || '',
        insuranceNumber: patient.insuranceNumber || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        county: patient.county || '',
        subcounty: patient.subcounty || '',
        ward: patient.ward || '',
        idNumber: patient.idNumber || '',
        idType: patient.idType || '',
        nupi: (patient as Patient).nupi || '',
        crReference: (patient as Patient).crReference || '',
        bloodGroup: patient.bloodGroup || '',
        nextOfKinName: (patient as any).nextOfKinName || '',
        nextOfKinPhone: (patient as any).nextOfKinPhone || '',
        nextOfKinRelationship: (patient as any).nextOfKinRelationship || '',
      })
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: '',
        patientType: 'paying',
        insuranceCompanyId: '',
        insuranceNumber: '',
        phone: '',
        email: '',
        address: '',
        county: DEFAULT_FACILITY_COUNTY,
        subcounty: '',
        ward: '',
        idNumber: '',
        idType: 'National ID',
        nupi: '',
        crReference: '',
        bloodGroup: '',
        nextOfKinName: '',
        nextOfKinPhone: '',
        nextOfKinRelationship: 'Spouse',
      })
    }
    setError(null)
    setCrLookupHint(null)
    setCrLinkedParentCrId(null)
    setCrDependantMember(false)
    setCrVerifiedNupi(null)
    setExistingLocalPatient(null)
    setContinueCareWithQueue(true)
    setPendingCarePatient(null)
    setCareQueueOpen(false)
  }, [patient, open])

  const navigateAfterCare = (patientId: number) => {
    if (afterSaveDestination === "registration-desk") {
      router.push("/registration")
    } else {
      router.push(`/patients/${patientId}`)
    }
  }

  const toastQueueResult = (
    result: Awaited<ReturnType<typeof ensurePatientInQueue>>,
    name: string,
    servicePoint: QueueServicePointChoice
  ) => {
    const label = queueTypeLabel(servicePoint)
    if (!result.ok) {
      toast({
        title: "Queue not updated",
        description: result.error,
        variant: "destructive",
      })
      return
    }
    const ticket = result.ticketNumber ? ` Ticket ${result.ticketNumber}.` : ""
    if (result.status === "already_queued") {
      toast({
        title: `Already in ${label} queue`,
        description: `${name} is already waiting.${ticket}`,
      })
    } else {
      toast({
        title: `Added to ${label} queue`,
        description: `${name} can proceed to ${label.toLowerCase()}.${ticket}`,
      })
    }
  }

  const beginContinueCare = (payload: PatientFormSuccessPayload) => {
    if (continueCareWithQueue) {
      setPendingCarePatient(payload)
      setCareQueueOpen(true)
    } else {
      navigateAfterCare(payload.patientId)
    }
  }

  const confirmCareQueue = async (servicePoint: QueueServicePointChoice) => {
    if (!pendingCarePatient) return
    setCareQueueBusy(true)
    const name = `${pendingCarePatient.firstName} ${pendingCarePatient.lastName}`.trim()
    const notes = crVerifiedNupi
      ? `TaifaCare: CR-verified (${crVerifiedNupi}) — ${servicePoint} queue`
      : `TaifaCare care pathway — ${servicePoint} queue`
    const result = await ensurePatientInQueue({
      patientId: pendingCarePatient.patientId,
      servicePoint,
      notes,
    })
    toastQueueResult(result, name, servicePoint)
    const id = pendingCarePatient.patientId
    setPendingCarePatient(null)
    setCareQueueOpen(false)
    setCareQueueBusy(false)
    navigateAfterCare(id)
  }

  const findLocalPatientAfterCr = async (nupi: string, idNumber?: string) => {
    for (const term of [nupi, idNumber].filter(Boolean) as string[]) {
      const rows = await patientApi.getAll(term, 1, 15)
      if (!Array.isArray(rows) || !rows.length) continue
      const exact =
        rows.find((r) => r.nupi && String(r.nupi) === nupi) ||
        rows.find((r) => idNumber && String(r.idNumber) === idNumber) ||
        rows[0]
      if (exact?.patientId) return exact
    }
    return null
  }

  const lookupClientRegistry = useCallback(
    async (opts?: { silent?: boolean; idNumber?: string }) => {
      const idNumber = (opts?.idNumber ?? formData.idNumber)?.trim()
      const nupiQuery = formData.nupi?.trim()
      const phone = formData.phone?.trim()
      if (!idNumber && !phone && !nupiQuery) {
        if (!opts?.silent) {
          setCrLookupHint(
            "Enter ID number, NUPI (CR…), or phone to search Client Registry."
          )
        }
        return
      }
      try {
        setCrLookupBusy(true)
        setCrLookupHint(null)
        const apiBase = getPublicApiBaseUrl()
        const res = await fetch(`${apiBase}/api/integrations/cr/resolve`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({
            idNumber: idNumber || undefined,
            nupi: !idNumber && nupiQuery ? nupiQuery : undefined,
            idType: formData.idType?.trim() || (idNumber ? "National ID" : undefined),
            phone: phone || undefined,
            firstName: formData.firstName || undefined,
            lastName: formData.lastName || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            gender: formData.gender || undefined,
          }),
        })
        const raw = await res.text()
        let data: Record<string, unknown> = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          throw new Error(
            res.ok
              ? "Invalid response from API"
              : `API error (${res.status}). If using :5400 for UI, API must be on :3222 (check login works).`
          )
        }
        if (!res.ok || !data.found || !data.nupi) {
          const msg = String(
            data.reason ||
              data.message ||
              data.error ||
              (res.status === 401 ? "Not signed in — log in again." : "") ||
              "No match in Client Registry (you can still save locally)."
          )
          setCrLookupHint(msg)
          if (!opts?.silent) {
            toast({ title: "Client Registry", description: msg, variant: "destructive" })
          }
          return
        }
        const crPatient = (data.patient || {}) as Record<string, string | undefined>
        const dependant = (data.dependant || {}) as Record<string, string | undefined>
        const nupi = String(data.nupi)
        const linkedParent =
          dependant.linkedParentCrId ||
          crPatient.linkedParentCrId ||
          null
        const isDep =
          Boolean(data.dependant) ||
          Boolean((crPatient as { isDependantMember?: boolean }).isDependantMember)
        setCrLinkedParentCrId(linkedParent ? String(linkedParent) : null)
        setCrDependantMember(isDep)
        setCrVerifiedNupi(nupi)
        const crIdType = crPatient.identificationType?.trim()
        const mappedIdType =
          crIdType && PATIENT_ID_TYPES.includes(crIdType as (typeof PATIENT_ID_TYPES)[number])
            ? crIdType
            : /birth certificate/i.test(String(crIdType))
              ? "Birth Certificate"
              : undefined
        const dobFromCr = crPatient.dateOfBirth?.split?.("T")?.[0]
        setFormData((prev) => {
          const nextDob = dobFromCr || prev.dateOfBirth
          const minor = isPatientMinor(nextDob)
          const kinRel =
            minor && (prev.nextOfKinRelationship === "Spouse" || !prev.nextOfKinRelationship)
              ? "Parent"
              : prev.nextOfKinRelationship
          return {
            ...prev,
            nupi,
            crReference: (data.crReference as string) || prev.crReference,
            idNumber: prev.idNumber || crPatient.idNumber || prev.idNumber,
            idType: mappedIdType || prev.idType,
            firstName: crPatient.firstName || prev.firstName,
            lastName: crPatient.lastName || prev.lastName,
            middleName: crPatient.middleName || prev.middleName,
            dateOfBirth: nextDob,
            gender: normalizeCrGender(crPatient.gender) || prev.gender,
            phone: crPatient.phone || prev.phone,
            nextOfKinRelationship: kinRel,
          }
        })
        const label = `${nupi}${data.mode === "live" ? " (live CR)" : ""}`

        if (!patient?.patientId) {
          try {
            const local = await findLocalPatientAfterCr(nupi, idNumber || undefined)
            if (local?.patientId) {
              setExistingLocalPatient({
                patientId: Number(local.patientId),
                firstName: local.firstName,
                lastName: local.lastName,
                patientNumber: local.patientNumber,
                nupi: local.nupi,
              })
              setCrLookupHint(`National match ${label}. This patient is already in HMIS.`)
              if (!opts?.silent) {
                toast({
                  title: "Already registered at facility",
                  description: `${local.firstName} ${local.lastName} — open chart to continue care.`,
                })
              }
              return
            }
          } catch {
            /* continue as new local registration */
          }
        }

        setExistingLocalPatient(null)
        const depNote = isDep
          ? ` Dependant: SHA eligibility uses NUPI ${nupi} (not birth certificate alone).${
              linkedParent ? ` Household parent CR ${linkedParent}.` : ""
            } Record guardian as next of kin.`
          : ""
        setCrLookupHint(
          `National match ${label}.${depNote} Complete phone, location & next of kin, then Save — we will add to triage/telemedicine queue and continue care (TaifaCare).`
        )
        if (!opts?.silent) {
          toast({
            title: "Client Registry match",
            description: "Finish registration, then choose triage or telemedicine queue.",
          })
        }
      } catch (err: any) {
        setCrLookupHint(err.message || "Lookup failed")
        if (!opts?.silent) {
          toast({ title: "Client Registry lookup failed", description: err.message, variant: "destructive" })
        }
      } finally {
        setCrLookupBusy(false)
      }
    },
    [formData]
  )

  const scheduleIdCrLookup = (idNumber: string, idType?: string) => {
    if (crDebounceRef.current) clearTimeout(crDebounceRef.current)
    const trimmed = idNumber.trim()
    if (trimmed.length < 6) return
    const type = (idType ?? formData.idType)?.trim()
    if (type === "Birth Certificate" && trimmed.length < 8) return
    if (type === "National ID" && /^CR[\dA-Za-z-]+$/i.test(trimmed)) return
    if (type === "National ID" && /^\d{9,}$/.test(trimmed)) return
    crDebounceRef.current = setTimeout(() => {
      void lookupClientRegistry({ silent: true, idNumber: trimmed })
    }, 700)
  }

  // Clear insurance fields when patient type changes to "paying"
  useEffect(() => {
    if (formData.patientType !== 'insurance') {
      setFormData(prev => ({
        ...prev,
        insuranceCompanyId: '',
        insuranceNumber: '',
      }))
    }
  }, [formData.patientType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const missing: string[] = []
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) missing.push("name")
    if (!formData.dateOfBirth) missing.push("date of birth")
    if (!formData.gender) missing.push("gender")
    if (!formData.phone?.trim() || formData.phone.trim().length < 10) missing.push("phone")
    if (!formData.county?.trim()) missing.push("county")
    if (!formData.subcounty?.trim()) missing.push("sub-county")
    if (!formData.ward?.trim()) missing.push("ward")
    const idNum = formData.idNumber?.trim()
    if (idNum && !formData.idType?.trim()) missing.push("ID type")
    if (!idNum) missing.push("ID number")
    if (!formData.nextOfKinName?.trim()) missing.push("next of kin name")
    const minor = isPatientMinor(formData.dateOfBirth)
    if (
      minor &&
      formData.nextOfKinRelationship === "Spouse" &&
      (crDependantMember || /birth certificate/i.test(formData.idType || ""))
    ) {
      setError(
        "Patients under 18 need a parent or guardian as next of kin (required for SHA dependant / consent workflows)."
      )
      setLoading(false)
      return
    }
    if (!formData.nextOfKinPhone?.trim() || formData.nextOfKinPhone.trim().length < 10) {
      missing.push("next of kin phone")
    }
    if (missing.length) {
      setError(`Please complete required demographics: ${missing.join(", ")}.`)
      setLoading(false)
      return
    }

    try {
      // Format data for API
      const patientData = {
        ...formData,
        insuranceCompanyId: formData.insuranceCompanyId ? parseInt(formData.insuranceCompanyId.toString()) : null,
        idType: formData.idType || (idNum ? "National ID" : null),
      }

      let successPayload: PatientFormSuccessPayload | undefined

      if (patient?.patientId) {
        await patientApi.update(patient.patientId.toString(), patientData)
        successPayload = {
          patientId: patient.patientId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          patientNumber: patient.patientNumber,
          nupi: formData.nupi,
        }
        try {
          const kenhdd = await standardsApi.validateKenhddPatient(patient.patientId)
          toast({
            title: "Patient updated",
            description: `KENHDD readiness: ${kenhdd.overallScore}%`,
          })
        } catch {
          toast({ title: "Patient updated" })
        }
      } else {
        const created = await patientApi.create(patientData)
        const newId = created?.patientId ?? created?.id
        if (newId) {
          successPayload = {
            patientId: Number(newId),
            firstName: formData.firstName,
            lastName: formData.lastName,
            patientNumber: created?.patientNumber,
            nupi: formData.nupi,
          }
          try {
            const kenhdd = await standardsApi.validateKenhddPatient(newId)
            toast({
              title: "Patient registered locally",
              description: `Opening chart · KENHDD ${kenhdd.overallScore}%`,
            })
          } catch {
            toast({
              title: "Patient registered locally",
              description: "National ID linked — continue care in the patient chart.",
            })
          }
        }
      }

      onSuccess(successPayload)
      onOpenChange(false)
      if (successPayload?.patientId && !patient?.patientId) {
        beginContinueCare(successPayload)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save patient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <AlertDialog open={Boolean(existingLocalPatient)} onOpenChange={(o) => !o && setExistingLocalPatient(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Patient already in HMIS</AlertDialogTitle>
          <AlertDialogDescription>
            Client Registry matched{" "}
            <span className="font-mono text-xs">{crVerifiedNupi || existingLocalPatient?.nupi}</span>.
            {existingLocalPatient ? (
              <>
                {" "}
                Local record: {existingLocalPatient.firstName} {existingLocalPatient.lastName}
                {existingLocalPatient.patientNumber ? ` (${existingLocalPatient.patientNumber})` : ""}.
                Open the chart to continue care (queue, SHR consent, visits).
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogCancel>Stay on form</AlertDialogCancel>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!existingLocalPatient?.patientId) return
                onOpenChange(false)
                setExistingLocalPatient(null)
                navigateAfterCare(existingLocalPatient.patientId)
              }}
            >
              Chart only
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (!existingLocalPatient?.patientId) return
                onOpenChange(false)
                beginContinueCare({
                  patientId: existingLocalPatient.patientId,
                  firstName: existingLocalPatient.firstName,
                  lastName: existingLocalPatient.lastName,
                  patientNumber: existingLocalPatient.patientNumber,
                  nupi: existingLocalPatient.nupi,
                })
                setExistingLocalPatient(null)
              }}
            >
              Continue care (add to queue)
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
          <DialogDescription>
            {patient ? 'Update patient information' : 'Enter patient details to create a new record'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="patientType">Patient Type</Label>
              <Select
                value={formData.patientType}
                onValueChange={(value) => setFormData({ ...formData, patientType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paying">Paying</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="non_paying">Non-paying</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.patientType === 'insurance' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insuranceCompanyId">Insurance Company</Label>
                <Select
                  value={formData.insuranceCompanyId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, insuranceCompanyId: value })}
                  disabled={loadingCompanies}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select insurance company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {insuranceCompanies.map((company) => (
                      <SelectItem key={company.providerId} value={company.providerId.toString()}>
                        {company.providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="insuranceNumber">Insurance Number</Label>
                <Input
                  id="insuranceNumber"
                  value={formData.insuranceNumber}
                  onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                  placeholder="INS-12345678"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                value={formData.bloodGroup}
                onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

            <div>
              <Label htmlFor="address">Residential address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <KenyaLocationSelect
            value={{
              county: formData.county || DEFAULT_FACILITY_COUNTY,
              subcounty: formData.subcounty || "",
              ward: formData.ward || "",
            }}
            onChange={(loc) =>
              setFormData({
                ...formData,
                county: loc.county,
                subcounty: loc.subcounty,
                ward: loc.ward,
              })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => {
                  const v = e.target.value
                  setFormData({ ...formData, idNumber: v })
                  scheduleIdCrLookup(v)
                }}
                onBlur={() => {
                  if (formData.idNumber?.trim().length >= 6) {
                    void lookupClientRegistry({ silent: true })
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="idType">ID Type</Label>
              <Select
                value={formData.idType}
                onValueChange={(value) => {
                  setFormData({ ...formData, idType: value })
                  if (formData.idNumber?.trim().length >= 6) {
                    void lookupClientRegistry({ silent: true })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_ID_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3 bg-muted/30">
            <div className="min-w-[200px] flex-1">
              <Label htmlFor="nupi">NUPI (Client Registry)</Label>
              <Input
                id="nupi"
                value={formData.nupi || ""}
                onChange={(e) => setFormData({ ...formData, nupi: e.target.value })}
                placeholder="Filled when national registry matches"
              />
              {crLookupHint ? (
                <p className="mt-1 text-xs text-muted-foreground">{crLookupHint}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  For dependant UAT preauth: set ID type to{" "}
                  <span className="font-medium">Birth Certificate</span>, enter{" "}
                  <span className="font-mono">3809632980</span>, then Search — or paste NUPI{" "}
                  <span className="font-mono">CR0490482291444-0</span> and Search.
                </p>
              )}
              {crDependantMember && crLinkedParentCrId ? (
                <p className="mt-1 text-xs text-sky-900 dark:text-sky-200">
                  Linked household parent CR:{" "}
                  <span className="font-mono">{crLinkedParentCrId}</span>
                </p>
              ) : null}
              {isPatientMinor(formData.dateOfBirth) ? (
                <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
                  Minor ({ageYearsFromDateOfBirth(formData.dateOfBirth)} yrs): use{" "}
                  <span className="font-medium">Parent</span> or{" "}
                  <span className="font-medium">Guardian</span> as next of kin; claims OTP may go
                  to the guardian contact on file.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mb-0.5"
              disabled={crLookupBusy}
              onClick={() => void lookupClientRegistry()}
            >
              {crLookupBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                "Search Client Registry"
              )}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="nextOfKinName">Next of kin name *</Label>
              <Input
                id="nextOfKinName"
                value={formData.nextOfKinName || ""}
                onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nextOfKinRelationship">Relationship *</Label>
              <Select
                value={formData.nextOfKinRelationship || "Spouse"}
                onValueChange={(value) => setFormData({ ...formData, nextOfKinRelationship: value })}
              >
                <SelectTrigger id="nextOfKinRelationship">
                  <SelectValue placeholder="Relationship" />
                </SelectTrigger>
                <SelectContent>
                  {NEXT_OF_KIN_RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nextOfKinPhone">Next of kin phone *</Label>
              <Input
                id="nextOfKinPhone"
                value={formData.nextOfKinPhone || ""}
                onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                required
              />
            </div>
          </div>

          {!patient?.patientId ? (
            <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
              <Checkbox
                id="continueCareWithQueue"
                checked={continueCareWithQueue}
                onCheckedChange={(v) => setContinueCareWithQueue(v === true)}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="continueCareWithQueue" className="cursor-pointer font-medium">
                  Continue TaifaCare pathway — add to queue after save
                </Label>
                <p className="text-xs text-muted-foreground">
                  After HMIS registration, choose triage (in-person) or telemedicine. The server
                  may also place new patients on triage automatically.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : patient ? 'Update Patient' : 'Register & continue care'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AddToQueueDialog
      open={careQueueOpen}
      onOpenChange={(next) => {
        if (!next && pendingCarePatient && !careQueueBusy) {
          const id = pendingCarePatient.patientId
          setPendingCarePatient(null)
          navigateAfterCare(id)
        }
        if (!careQueueBusy) setCareQueueOpen(next)
      }}
      patientName={
        pendingCarePatient
          ? `${pendingCarePatient.firstName} ${pendingCarePatient.lastName}`.trim()
          : ""
      }
      patientNumber={pendingCarePatient?.patientNumber}
      onConfirm={confirmCareQueue}
      loading={careQueueBusy}
    />
    </>
  )
}








