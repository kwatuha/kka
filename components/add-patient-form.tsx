"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { BirthDatePicker } from "@/components/birth-date-picker"
import { insuranceApi, patientApi, standardsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  DEFAULT_FACILITY_COUNTY,
  NEXT_OF_KIN_RELATIONSHIPS,
  PATIENT_ID_TYPES,
} from "@/lib/patient-demographics"
import { KenyaLocationSelect } from "@/components/kenya-location-select"

const patientFormSchema = z
  .object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  middleName: z.string().optional(),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  dateOfBirth: z.date({
    required_error: "Date of birth is required.",
  }),
  gender: z.string({
    required_error: "Please select a gender.",
  }),
  patientType: z.enum(['paying', 'insurance', 'non_paying'], {
    required_error: "Please select patient type.",
  }),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  nupi: z.string().optional(),
  crReference: z.string().optional(),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 characters.",
  }),
  email: z.union([z.string().email({ message: "Invalid email" }), z.literal("")]).optional(),
  address: z.string().min(3, { message: "Residential address is required." }),
  county: z.string().min(1, { message: "County is required." }),
  subcounty: z.string().min(1, { message: "Sub-county is required." }),
  ward: z.string().min(1, { message: "Ward is required." }),
  emergencyContact: z.string().min(2, { message: "Next of kin name is required." }),
  emergencyPhone: z.string().min(10, { message: "Next of kin phone is required." }),
  nextOfKinRelationship: z.string().min(1, { message: "Relationship is required." }),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
  insuranceCompanyId: z.string().optional(),
  insuranceNumber: z.string().optional(),
  consentToTreatment: z.boolean().refine((v) => v === true, {
    message: "Consent to treatment is required.",
  }),
  consentToShareInfo: z.boolean().refine((v) => v === true, {
    message: "Consent to share clinical information is required.",
  }),
  consentToPhotos: z.boolean().default(false),
})
  .superRefine((data, ctx) => {
    const idNum = String(data.idNumber || "").trim()
    const nupi = String(data.nupi || "").trim()
    if (!nupi && !idNum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idNumber"],
        message: "Enter National ID or NUPI (KENHDD identifier).",
      })
    }
    if (idNum && !String(data.idType || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idType"],
        message: "Select ID type when ID number is provided.",
      })
    }
  })

type PatientFormValues = z.infer<typeof patientFormSchema>

const PATIENT_STORAGE_KEY = 'patient_registration_form_draft'

const defaultValues: Partial<PatientFormValues> = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  patientType: "paying",
  idType: "National ID",
  idNumber: "",
  nupi: "",
  crReference: "",
  phone: "",
  email: "",
  address: "",
  county: DEFAULT_FACILITY_COUNTY,
  subcounty: "",
  ward: "",
  emergencyContact: "",
  emergencyPhone: "",
  nextOfKinRelationship: "Spouse",
  bloodGroup: "",
  allergies: "",
  medicalHistory: "",
  insuranceCompanyId: "",
  insuranceNumber: "",
  consentToTreatment: false,
  consentToShareInfo: false,
  consentToPhotos: false,
}

export function AddPatientForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lookingUpNupi, setLookingUpNupi] = useState(false)
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues,
  })

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

  // Load saved draft when form opens
  useEffect(() => {
    if (open) {
      const savedDraft = loadDraftFromStorage()
      if (savedDraft) {
        // Normalize draft values to ensure all fields are defined (not undefined)
        // Convert date string back to Date object if present
        const normalizedDraft = {
          firstName: savedDraft.firstName ?? "",
          middleName: savedDraft.middleName ?? "",
          lastName: savedDraft.lastName ?? "",
          dateOfBirth: savedDraft.dateOfBirth
            ? (typeof savedDraft.dateOfBirth === 'string'
                ? new Date(savedDraft.dateOfBirth)
                : savedDraft.dateOfBirth)
            : undefined,
          gender: savedDraft.gender ?? "",
          patientType: savedDraft.patientType ?? "paying",
          idType: savedDraft.idType ?? "National ID",
          idNumber: savedDraft.idNumber ?? "",
          phone: savedDraft.phone ?? "",
          email: savedDraft.email ?? "",
          address: savedDraft.address ?? "",
          county: savedDraft.county ?? DEFAULT_FACILITY_COUNTY,
          subcounty: savedDraft.subcounty ?? "",
          ward: savedDraft.ward ?? "",
          emergencyContact: savedDraft.emergencyContact ?? "",
          emergencyPhone: savedDraft.emergencyPhone ?? "",
          nextOfKinRelationship: savedDraft.nextOfKinRelationship ?? "Spouse",
          bloodGroup: savedDraft.bloodGroup ?? "",
          allergies: savedDraft.allergies ?? "",
          medicalHistory: savedDraft.medicalHistory ?? "",
          insuranceCompanyId: savedDraft.insuranceCompanyId ?? "",
          insuranceNumber: savedDraft.insuranceNumber ?? "",
          consentToTreatment: Boolean(savedDraft.consentToTreatment),
          consentToShareInfo: Boolean(savedDraft.consentToShareInfo),
          consentToPhotos: Boolean(savedDraft.consentToPhotos),
        }
        form.reset(normalizedDraft)
      } else {
        form.reset(defaultValues)
      }
    }
  }, [open, form])

  // Clear insurance fields when patient type changes to "paying"
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'patientType' && value.patientType !== 'insurance') {
        form.setValue('insuranceCompanyId', '')
        form.setValue('insuranceNumber', '')
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Auto-save form data to localStorage
  useEffect(() => {
    if (!open) return

    const subscription = form.watch((value) => {
      const hasData = value.firstName || value.lastName || value.phone ||
                      value.email || value.address || value.idNumber ||
                      value.emergencyContact || value.emergencyPhone ||
                      value.bloodGroup || value.allergies || value.medicalHistory ||
                      value.insuranceCompanyId || value.insuranceNumber || value.patientType

      if (hasData) {
        saveDraftToStorage(value as any)
      } else {
        clearDraftFromStorage()
      }
    })

    return () => subscription.unsubscribe()
  }, [form, open])

  async function onSubmit(data: PatientFormValues) {
    setIsSubmitting(true)
    try {
      // Format data for API
      const patientData = {
        firstName: data.firstName,
        middleName: data.middleName?.trim() || null,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth.toISOString().split('T')[0],
        gender: data.gender,
        patientType: data.patientType,
        phone: data.phone,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        county: data.county?.trim() || null,
        subcounty: data.subcounty?.trim() || null,
        ward: data.ward?.trim() || null,
        idNumber: data.idNumber?.trim() || null,
        idType: data.idType?.trim() || null,
        nupi: data.nupi || null,
        crReference: data.crReference || null,
        bloodGroup: data.bloodGroup || null,
        allergies: data.allergies || null,
        medicalHistory: data.medicalHistory || null,
        nextOfKinName: data.emergencyContact || null,
        nextOfKinPhone: data.emergencyPhone || null,
        nextOfKinRelationship: data.nextOfKinRelationship || null,
        insuranceCompanyId: data.insuranceCompanyId ? parseInt(data.insuranceCompanyId) : null,
        insuranceNumber: data.insuranceNumber || null,
        consent: {
          consentToTreatment: data.consentToTreatment,
          consentToShareInfo: data.consentToShareInfo,
          consentToPhotos: data.consentToPhotos,
          signature: `${data.firstName} ${data.lastName}`.trim(),
        },
      }

      const created = await patientApi.create(patientData)
      const newPatientId = created?.patientId ?? created?.id

      if (newPatientId) {
        try {
          const kenhdd = await standardsApi.validateKenhddPatient(newPatientId)
          toast({
            title: "Patient registered",
            description: `KENHDD demographics readiness: ${kenhdd.overallScore}% (see FHIR panel for full report).`,
          })
        } catch {
          toast({ title: "Patient registered", description: "Registration saved successfully." })
        }
      } else {
        toast({ title: "Patient registered", description: "Registration saved successfully." })
      }

      // Clear draft after successful submission
      clearDraftFromStorage()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      console.error('Error creating patient:', error)
      alert(error.message || 'Failed to register patient. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Draft management functions
  const saveDraftToStorage = (data: Partial<PatientFormValues>) => {
    if (typeof window === 'undefined') return
    try {
      const dataToSave = {
        ...data,
        dateOfBirth: data.dateOfBirth instanceof Date
          ? data.dateOfBirth.toISOString()
          : data.dateOfBirth,
      }
      localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Error saving draft to localStorage:', error)
    }
  }

  const loadDraftFromStorage = (): Partial<PatientFormValues> | null => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(PATIENT_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading draft from localStorage:', error)
    }
    return null
  }

  const clearDraftFromStorage = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(PATIENT_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing draft from localStorage:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Capture KENHDD demographics: identifier, residence (county), contact, and next of kin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Imbayi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle name</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <BirthDatePicker date={field.value} onSelect={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "paying"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paying">Paying</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="non_paying">Non-paying</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="idType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "National ID"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PATIENT_ID_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID number</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormDescription>Required unless NUPI is known</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input placeholder="+254 712 345 678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <FormField
                control={form.control}
                name="nupi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NUPI (Client Registry)</FormLabel>
                    <FormControl>
                      <Input placeholder="Resolved from ID/phone or enter if known" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional — auto-resolved on save when ID or phone is present
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                className="mb-6"
                disabled={lookingUpNupi}
                onClick={async () => {
                  const idNumber = form.getValues("idNumber")
                  const phone = form.getValues("phone")
                  if (!idNumber && !phone) {
                    alert("Enter national ID or phone before looking up NUPI.")
                    return
                  }
                  try {
                    setLookingUpNupi(true)
                    const token =
                      localStorage.getItem("token") ||
                      localStorage.getItem("jwt_token") ||
                      localStorage.getItem("auth_token")
                    const res = await fetch("/api/integrations/cr/resolve", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        idNumber: idNumber || undefined,
                        phone: phone || undefined,
                        firstName: form.getValues("firstName") || undefined,
                        lastName: form.getValues("lastName") || undefined,
                      }),
                    })
                    const data = await res.json()
                    if (!res.ok || !data.nupi) {
                      alert(data.reason || data.message || "NUPI not found — will register on save if enabled.")
                      return
                    }
                    form.setValue("nupi", data.nupi)
                    if (data.crReference) form.setValue("crReference", data.crReference)
                    if (data.patient?.firstName && !form.getValues("firstName")) {
                      form.setValue("firstName", data.patient.firstName)
                    }
                    if (data.patient?.lastName && !form.getValues("lastName")) {
                      form.setValue("lastName", data.patient.lastName)
                    }
                  } catch (err: any) {
                    alert(err.message || "NUPI lookup failed")
                  } finally {
                    setLookingUpNupi(false)
                  }
                }}
              >
                {lookingUpNupi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup NUPI"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.imbayi@example.com" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residential address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Village, landmark, or street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <KenyaLocationSelect
              value={{
                county: form.watch("county") || DEFAULT_FACILITY_COUNTY,
                subcounty: form.watch("subcounty") || "",
                ward: form.watch("ward") || "",
              }}
              onChange={(loc) => {
                form.setValue("county", loc.county, { shouldValidate: true })
                form.setValue("subcounty", loc.subcounty, { shouldValidate: true })
                form.setValue("ward", loc.ward, { shouldValidate: true })
              }}
            />
            {form.formState.errors.county?.message ? (
              <p className="text-sm text-destructive">{String(form.formState.errors.county.message)}</p>
            ) : null}
            {form.formState.errors.subcounty?.message ? (
              <p className="text-sm text-destructive">{String(form.formState.errors.subcounty.message)}</p>
            ) : null}
            {form.formState.errors.ward?.message ? (
              <p className="text-sm text-destructive">{String(form.formState.errors.ward.message)}</p>
            ) : null}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next of kin name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Imbayi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextOfKinRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "Spouse"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NEXT_OF_KIN_RELATIONSHIPS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next of kin phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+254 723 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List any known allergies" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicalHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical History</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief medical history" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('patientType') === 'insurance' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="insuranceCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Company</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={loadingCompanies}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select insurance company"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {insuranceCompanies.map((company) => (
                            <SelectItem key={company.providerId} value={company.providerId.toString()}>
                              {company.providerName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insuranceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Number</FormLabel>
                      <FormControl>
                        <Input placeholder="INS-12345678" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Patient consent</p>
              <FormField
                control={form.control}
                name="consentToTreatment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Consent to examination and treatment *</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consentToShareInfo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Consent to share clinical information for care continuity *</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consentToPhotos"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Consent to clinical photos (optional)</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Patient
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
