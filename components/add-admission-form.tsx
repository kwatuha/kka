"use client"

import { useState, useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { PatientCombobox } from "@/components/patient-combobox"
import { DiagnosisCombobox } from "@/components/diagnosis-combobox"
import { patientApi, icuApi, doctorsApi, inpatientApi } from "@/lib/api"
import { Loader2, Check, ChevronsUpDown, Search } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// Create a dynamic schema based on admission type
const createFormSchema = (isEditing: boolean, admissionType: "inpatient" | "icu" = "icu") => {
  const baseSchema = {
    patientId: z.string().min(1, { message: "Patient is required" }),
    patientName: z.string().optional(),
    admissionDate: z.string().min(1, { message: "Admission date is required" }),
    admissionTime: z.string().min(1, { message: "Admission time is required" }),
    diagnosis: z.string().min(1, { message: "Diagnosis is required" }),
    doctorId: isEditing
      ? z.string().optional() // Optional when editing since it can't be changed
      : z.string().min(1, { message: "Doctor is required" }),
    admissionNotes: z.string().optional(),
  }

  if (admissionType === "icu") {
    return z.object({
      ...baseSchema,
      icuBedId: z.string().min(1, { message: "ICU Bed is required" }),
      icuAdmissionType: z.string().min(1, { message: "Admission type is required" }),
      requiresVentilator: z.string().min(1, { message: "Please specify if ventilator is required" }),
    })
  } else {
    // Inpatient schema
    return z.object({
      ...baseSchema,
      bedId: z.string().min(1, { message: "Bed is required" }),
      expectedDischargeDate: z.string().optional(),
      depositAmount: z
        .string()
        .optional()
        .refine((val) => {
          if (!val || val.trim() === "") return true
          const parsed = Number(val)
          return Number.isFinite(parsed) && parsed >= 0
        }, { message: "Deposit amount must be a valid number (0 or more)" }),
    })
  }
}

export function AddAdmissionForm({
  open,
  onOpenChange,
  onSuccess,
  admission,
  admissionType = "icu",
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  admission?: any
  admissionType?: "inpatient" | "icu"
  /** Outpatient exit: patient, diagnosis, and doctor already known. */
  prefill?: {
    patientId?: string
    diagnosis?: string
    doctorId?: string
    admissionNotes?: string
  }
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [icuBeds, setIcuBeds] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [allBeds, setAllBeds] = useState<any[]>([]) // Store all beds before filtering
  const [wards, setWards] = useState<any[]>([])
  const [selectedWardId, setSelectedWardId] = useState<string>("")
  const [selectedWardType, setSelectedWardType] = useState<string>("") // Filter by ward type: Female, Male, Pediatric, Other
  const [wardOpen, setWardOpen] = useState(false)
  const [wardSearch, setWardSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<{ diagnosisId: number; icd10Code?: string; diagnosisName: string } | null>(null)
  const isEditing = !!admission
  const isICU = admissionType === "icu"

  // Ward Combobox component (inline for simplicity)
  const WardCombobox = ({ value, onValueChange, wards }: { value: string; onValueChange: (value: string) => void; wards: any[] }) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    const filteredWards = wards.filter((ward) => {
      if (!search) return true
      const searchLower = search.toLowerCase()
      return (
        ward.wardName?.toLowerCase().includes(searchLower) ||
        ward.wardType?.toLowerCase().includes(searchLower) ||
        ward.wardCode?.toLowerCase().includes(searchLower)
      )
    })

    const selectedWard = wards.find((w) => w.wardId?.toString() === value)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            type="button"
          >
            {selectedWard
              ? `${selectedWard.wardName}${selectedWard.wardType ? ` (${selectedWard.wardType})` : ""}`
              : "Select ward (optional)..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search ward by name or type..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No ward found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={() => {
                    onValueChange("")
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  All Wards
                </CommandItem>
                {filteredWards.map((ward) => (
                  <CommandItem
                    key={ward.wardId}
                    value={ward.wardId.toString()}
                    onSelect={() => {
                      onValueChange(ward.wardId.toString())
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === ward.wardId.toString() ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{ward.wardName}</span>
                      {ward.wardType && <span className="text-xs text-muted-foreground">{ward.wardType}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  const getDefaultValues = () => {
    if (isICU) {
      return {
        patientId: "",
        patientName: "",
        admissionDate: "",
        admissionTime: "",
        diagnosis: "",
        doctorId: "",
        icuBedId: "",
        admissionNotes: "",
        icuAdmissionType: "",
        requiresVentilator: "",
      }
    } else {
      return {
        patientId: "",
        patientName: "",
        admissionDate: "",
        admissionTime: "",
        diagnosis: "",
        doctorId: "",
        bedId: "",
        admissionNotes: "",
        expectedDischargeDate: "",
        depositAmount: "",
      }
    }
  }

  const form = useForm({
    resolver: zodResolver(createFormSchema(isEditing, admissionType)),
    defaultValues: getDefaultValues(),
  })

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Watch for patientId changes
  const patientId = form.watch("patientId")

  // Set form values when editing and data is loaded
  useEffect(() => {
    const bedsLoaded = isICU ? icuBeds.length > 0 : beds.length > 0
    if (admission && !loading && doctors.length > 0 && bedsLoaded && open && isMounted) {
      const admissionDate = new Date(admission.admissionDate)
      const doctorId = admission.admittingDoctorId?.toString() || admission.doctorUserId?.toString() || ""
      const bedId = isICU
        ? (admission.icuBedId?.toString() || admission.bedId?.toString() || "")
        : (admission.bedId?.toString() || "")

      console.log("Setting form values - data loaded:", {
        doctorId,
        bedId,
        doctorsAvailable: doctors.length,
        bedsAvailable: isICU ? icuBeds.length : beds.length,
        admission,
        isICU,
      })

      // Use form.reset to set all values at once
      const formValues: any = {
        patientId: admission.patientId?.toString() || "",
        patientName: admission.firstName && admission.lastName
          ? `${admission.firstName} ${admission.lastName}`
          : "",
        admissionDate: admissionDate.toISOString().split("T")[0],
        admissionTime: admissionDate.toTimeString().split(" ")[0].substring(0, 5),
        diagnosis: admission.admissionDiagnosis || admission.admissionReason || "",
        doctorId: doctorId,
        admissionNotes: admission.notes || "",
      }

      if (isICU) {
        formValues.icuBedId = bedId
        formValues.icuAdmissionType = admission.initialCondition || ""
        formValues.requiresVentilator = admission.ventilator || "no"
      } else {
        formValues.bedId = bedId
        formValues.expectedDischargeDate = admission.expectedDischargeDate
          ? new Date(admission.expectedDischargeDate).toISOString().split("T")[0]
          : ""
        formValues.depositAmount = admission.depositAmount != null ? String(admission.depositAmount) : ""
      }

      form.reset(formValues)

      // Also explicitly set the Select values to ensure they're selected
      if (doctorId) {
        setTimeout(() => form.setValue("doctorId", doctorId), 0)
      }
      if (bedId) {
        setTimeout(() => form.setValue(isICU ? "icuBedId" : "bedId", bedId), 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admission, loading, doctors.length, icuBeds.length, beds.length, open, isMounted, isICU])

  // Load patient name when patientId changes
  useEffect(() => {
    const loadPatientName = async () => {
      if (patientId) {
        try {
          const patient = await patientApi.getById(patientId)
          if (patient) {
            const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
            form.setValue("patientName", fullName)
          }
        } catch (error) {
          console.error("Error loading patient:", error)
        }
      } else {
        form.setValue("patientName", "")
      }
    }

    loadPatientName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  // Filter beds based on selected ward only (no age/gender filtering)
  const getFilteredBeds = (bedsList: any[]): any[] => {
    // Filter by selected ward only
    if (selectedWardId) {
      return bedsList.filter((bed) => bed.wardId?.toString() === selectedWardId)
    }
    return bedsList
  }

  // Load doctors and beds when dialog opens, and set dates client-side only
  useEffect(() => {
    if (open && isMounted) {
      loadFormData()
      if (!admission) {
        // New admission mode - set dates client-side only to avoid hydration mismatch
        const now = new Date()
        form.reset({
          ...getDefaultValues(),
          admissionDate: now.toISOString().split("T")[0],
          admissionTime: now.toTimeString().split(" ")[0].substring(0, 5),
          patientId: prefill?.patientId || "",
          diagnosis: prefill?.diagnosis || "",
          doctorId: prefill?.doctorId || "",
          admissionNotes: prefill?.admissionNotes || "",
        })
        setSelectedDiagnosis(null)
      }
    } else if (!open) {
      // Reset form when dialog closes
      form.reset(getDefaultValues())
      setSelectedDiagnosis(null)
      setSelectedWardId("")
      setSelectedWardType("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMounted, admissionType])

  // Re-filter beds when ward selection changes
  useEffect(() => {
    if (allBeds.length > 0) {
      setBeds(getFilteredBeds(allBeds))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBeds, selectedWardId])

  // Calculate available bed counts per ward (for display in ward dropdown)
  // Count beds from allBeds for wards that match the selected ward type
  const wardBedCounts = useMemo(() => {
    const counts: Record<number, number> = {}

    // If ward type is selected, only count beds for wards that match the filter
    // Otherwise, count all beds
    if (selectedWardType) {
      const filterType = String(selectedWardType).trim().toLowerCase()

      // First, get the list of ward IDs that match the ward type filter
      const matchingWardIds = new Set<number>()
      wards.forEach((ward) => {
        const wardType = String(ward.wardType || "").trim()
        if (wardType && wardType.toLowerCase() === filterType) {
          matchingWardIds.add(ward.wardId)
        }
      })

      // Count available beds only for wards that match the filter
      allBeds.forEach((bed) => {
        if (bed.wardId && bed.status === "available" && matchingWardIds.has(bed.wardId)) {
          counts[bed.wardId] = (counts[bed.wardId] || 0) + 1
        }
      })
    } else {
      // No ward type filter - count all available beds
      allBeds.forEach((bed) => {
        if (bed.wardId && bed.status === "available") {
          counts[bed.wardId] = (counts[bed.wardId] || 0) + 1
        }
      })
    }

    return counts
  }, [allBeds, selectedWardType, wards])

  // Filter wards by selected ward type and search term
  const filteredWards = useMemo(() => {
    return wards.filter((ward) => {
      // Filter by selected ward type - use exact matching to prevent "Male" matching "Female"
      if (selectedWardType) {
        const wardType = String(ward.wardType || "").trim()
        const filterType = String(selectedWardType).trim()

        // Exclude wards with no ward type
        if (!wardType || wardType.length === 0) {
          return false
        }

        const wardTypeLower = wardType.toLowerCase()
        const filterTypeLower = filterType.toLowerCase()

        // Exact case-insensitive match - "male" should NOT match "female"
        // This ensures "Male" only matches "Male", not "Female"
        if (wardTypeLower !== filterTypeLower) {
          return false
        }
      }

      // Filter by search term
      if (!wardSearch) return true
      const search = wardSearch.toLowerCase()
      return (
        ward.wardName?.toLowerCase().includes(search) ||
        ward.wardType?.toLowerCase().includes(search) ||
        ward.wardCode?.toLowerCase().includes(search)
      )
    })
  }, [wards, selectedWardType, wardSearch])

  const selectedWard = wards.find((w) => w.wardId?.toString() === selectedWardId)

  const loadFormData = async () => {
    try {
      setLoading(true)
      setError(null)

      // When editing, load all beds; when creating, load only available beds
      const bedsStatus = isEditing ? undefined : "available"

      if (isICU) {
        const [doctorsResult, bedsResult] = await Promise.allSettled([
          doctorsApi.getAll(),
          icuApi.getBeds(bedsStatus, 1, 100),
        ])

        if (doctorsResult.status === "fulfilled") {
          setDoctors(doctorsResult.value || [])
        } else {
          console.error("Error loading doctors:", doctorsResult.reason)
          toast({
            title: "Error loading doctors",
            description: doctorsResult.reason?.message || "Failed to load doctors",
            variant: "destructive",
          })
        }

        if (bedsResult.status === "fulfilled") {
          setIcuBeds(bedsResult.value || [])
        } else {
          console.error("Error loading ICU beds:", bedsResult.reason)
          toast({
            title: "Error loading ICU beds",
            description: bedsResult.reason?.message || "Failed to load ICU beds",
            variant: "destructive",
          })
        }
      } else {
        // Inpatient
        const [doctorsResult, wardsResult, bedsResult] = await Promise.allSettled([
          doctorsApi.getAll(),
          inpatientApi.getWards(),
          inpatientApi.getBeds(undefined, bedsStatus, 1, 100),
        ])

        if (doctorsResult.status === "fulfilled") {
          setDoctors(doctorsResult.value || [])
        } else {
          console.error("Error loading doctors:", doctorsResult.reason)
          toast({
            title: "Error loading doctors",
            description: doctorsResult.reason?.message || "Failed to load doctors",
            variant: "destructive",
          })
        }

        if (wardsResult.status === "fulfilled") {
          const loadedWards = wardsResult.value || []
          // Deduplicate by wardId so each ward appears once
          const byId = new Map((loadedWards as any[]).map((w: any) => [w.wardId, w]))
          setWards(Array.from(byId.values()))
        } else {
          console.error("Error loading wards:", wardsResult.reason)
        }

        if (bedsResult.status === "fulfilled") {
          const loadedBeds = bedsResult.value || []
          setAllBeds(loadedBeds) // Store all beds
          // Filter beds based on patient data and ward selection if available
          setBeds(getFilteredBeds(loadedBeds))
        } else {
          console.error("Error loading beds:", bedsResult.reason)
          toast({
            title: "Error loading beds",
            description: bedsResult.reason?.message || "Failed to load beds",
            variant: "destructive",
          })
        }
      }

      // Form values will be set by the useEffect hook after data loads
    } catch (err: any) {
      setError(err.message || "Failed to load form data")
      console.error("Error loading form data:", err)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(values) {
    try {
      setIsSubmitting(true)
      setError(null)

      // Validate required fields
      const bedId = isICU ? values.icuBedId : values.bedId
      if (!values.patientId || !bedId) {
        throw new Error("Please fill in all required fields")
      }

      // Doctor ID is only required when creating, not when editing (since it can't be changed)
      if (!isEditing && !values.doctorId) {
        throw new Error("Please select a doctor")
      }

      // Parse and validate IDs
      const patientId = parseInt(values.patientId)
      const parsedBedId = parseInt(bedId)

      // When editing, doctorId is optional since it can't be changed
      // We'll use the existing doctorId from the admission
      let admittingDoctorId: number | undefined
      if (isEditing) {
        // Use the existing doctor ID from admission
        admittingDoctorId = admission?.admittingDoctorId || admission?.doctorUserId
      } else {
        // When creating, doctorId is required
        if (!values.doctorId) {
          throw new Error("Please select a doctor")
        }
        admittingDoctorId = parseInt(values.doctorId)
      }

      if (isNaN(patientId) || isNaN(parsedBedId)) {
        throw new Error("Invalid patient or bed ID")
      }

      if (admittingDoctorId && isNaN(admittingDoctorId)) {
        throw new Error("Invalid doctor ID")
      }

      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: string | undefined | null) => {
        if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
          return null
        }
        return typeof value === "string" ? value.trim() : value
      }

      // Ensure date is in DATETIME format (YYYY-MM-DD HH:MM:SS) for MySQL
      // The admissions table expects DATETIME, not just DATE
      let admissionDate = values.admissionDate
      let admissionTime = values.admissionTime || "00:00"

      if (!admissionDate) {
        const now = new Date()
        admissionDate = now.toISOString().split("T")[0]
        admissionTime = now.toTimeString().split(" ")[0].substring(0, 5)
      } else if (admissionDate instanceof Date) {
        admissionDate = admissionDate.toISOString().split("T")[0]
      } else if (typeof admissionDate === "string") {
        // Validate and normalize date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(admissionDate)) {
          throw new Error("Invalid date format. Please use YYYY-MM-DD format.")
        }
      }

      // Combine date and time into DATETIME format (YYYY-MM-DD HH:MM:SS)
      // Ensure time is in HH:MM format, then add :00 for seconds
      const timeParts = admissionTime.split(":")
      const normalizedTime = `${timeParts[0]}:${timeParts[1] || "00"}:00`
      const admissionDateTime = `${admissionDate} ${normalizedTime}`

      if (isICU) {
        // Prepare ICU API payload
        const payload = {
          patientId: Number(patientId),
          icuBedId: Number(parsedBedId),
          admissionDate: admissionDateTime, // DATETIME format: YYYY-MM-DD HH:MM:SS
          admittingDoctorId: admittingDoctorId ? Number(admittingDoctorId) : undefined,
          admissionReason: toNullIfEmpty(values.diagnosis),
          initialCondition: toNullIfEmpty(values.icuAdmissionType),
          status: "critical", // Default status
          notes: toNullIfEmpty(values.admissionNotes),
        }

        // Validate all required numeric fields
        if (!Number.isInteger(payload.patientId) || payload.patientId <= 0) {
          throw new Error("Invalid patient ID")
        }
        if (!Number.isInteger(payload.icuBedId) || payload.icuBedId <= 0) {
          throw new Error("Invalid ICU bed ID")
        }
        // Doctor ID validation only when creating (not editing)
        if (!isEditing && (!payload.admittingDoctorId || !Number.isInteger(payload.admittingDoctorId) || payload.admittingDoctorId <= 0)) {
          throw new Error("Invalid doctor ID")
        }

        console.log("Submitting ICU admission payload:", JSON.stringify(payload, null, 2))

        try {
          if (isEditing && admission?.icuAdmissionId) {
            // For updates, only send fields that can be updated (not patientId, admissionDate, admittingDoctorId)
            const updatePayload = {
              icuBedId: Number(parsedBedId),
              admissionReason: toNullIfEmpty(values.diagnosis),
              initialCondition: toNullIfEmpty(values.icuAdmissionType),
              status: "critical", // Default status
              notes: toNullIfEmpty(values.admissionNotes),
            }
            await icuApi.updateAdmission(admission.icuAdmissionId.toString(), updatePayload)
            toast({
              title: "Admission updated",
              description: `ICU admission has been updated successfully.`,
            })
          } else {
            await icuApi.createAdmission(payload)
            toast({
              title: "Admission created",
              description: `Patient ${values.patientName || "selected patient"} has been admitted to ICU.`,
            })
          }
        } catch (apiError: any) {
          console.error("API Error caught:", apiError)
          console.error("API Error response:", apiError?.response)
          console.error("API Error message:", apiError?.message)
          throw apiError // Re-throw to be caught by outer catch
        }
      } else {
        const parsedDepositAmount = values.depositAmount && values.depositAmount.trim() !== ""
          ? Number(values.depositAmount)
          : null
        if (parsedDepositAmount != null && (!Number.isFinite(parsedDepositAmount) || parsedDepositAmount < 0)) {
          throw new Error("Deposit amount must be a valid number (0 or more)")
        }

        // Prepare Inpatient API payload
        const payload = {
          patientId: Number(patientId),
          bedId: Number(parsedBedId),
          admissionDate: admissionDateTime, // DATETIME format: YYYY-MM-DD HH:MM:SS
          admittingDoctorId: admittingDoctorId ? Number(admittingDoctorId) : undefined,
          admissionDiagnosis: toNullIfEmpty(values.diagnosis),
          admissionReason: toNullIfEmpty(values.diagnosis),
          expectedDischargeDate: values.expectedDischargeDate || null,
          depositAmount: parsedDepositAmount,
          notes: toNullIfEmpty(values.admissionNotes),
        }

        // Validate all required numeric fields
        if (!Number.isInteger(payload.patientId) || payload.patientId <= 0) {
          throw new Error("Invalid patient ID")
        }
        if (!Number.isInteger(payload.bedId) || payload.bedId <= 0) {
          throw new Error("Invalid bed ID")
        }
        // Doctor ID validation only when creating (not editing)
        if (!isEditing && (!payload.admittingDoctorId || !Number.isInteger(payload.admittingDoctorId) || payload.admittingDoctorId <= 0)) {
          throw new Error("Invalid doctor ID")
        }

        console.log("Submitting Inpatient admission payload:", JSON.stringify(payload, null, 2))

        try {
          if (isEditing && admission?.admissionId) {
            // For updates
            const updatePayload = {
              bedId: Number(parsedBedId),
              admissionDiagnosis: toNullIfEmpty(values.diagnosis),
              admissionReason: toNullIfEmpty(values.diagnosis),
              expectedDischargeDate: values.expectedDischargeDate || null,
              depositAmount: parsedDepositAmount,
              notes: toNullIfEmpty(values.admissionNotes),
            }
            await inpatientApi.updateAdmission(admission.admissionId.toString(), updatePayload)
            toast({
              title: "Admission updated",
              description: `Inpatient admission has been updated successfully.`,
            })
          } else {
            await inpatientApi.createAdmission(payload)
            toast({
              title: "Admission created",
              description: `Patient ${values.patientName || "selected patient"} has been admitted.`,
            })
          }
        } catch (apiError: any) {
          console.error("API Error caught:", apiError)
          console.error("API Error response:", apiError?.response)
          console.error("API Error message:", apiError?.message)
          throw apiError // Re-throw to be caught by outer catch
        }
      }

      form.reset()
      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      // Extract error message from API response
      // Check for nested error object from backend
      let errorMessage = `Failed to ${isEditing ? "update" : "create"} ${isICU ? "ICU" : "inpatient"} admission`

      if (err?.response?.error) {
        // Backend returned { message: "...", error: "..." }
        errorMessage = err.response.error
      } else if (err?.response?.message) {
        errorMessage = err.response.message
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.error) {
        errorMessage = err.error
      }

      setError(errorMessage)
      toast({
        title: isEditing ? "Error updating admission" : "Error creating admission",
        description: errorMessage,
        variant: "destructive",
      })
      console.error("Error creating ICU admission:", err)
      console.error("Error details:", {
        message: err?.message,
        error: err?.error,
        response: err?.response,
        status: err?.status,
        stack: err?.stack,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>{isEditing ? `Edit ${isICU ? "ICU" : "Inpatient"} Admission` : `New ${isICU ? "ICU" : "Inpatient"} Admission`}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? `Update the details for this ${isICU ? "ICU" : "inpatient"} admission. Click save when you're done.`
                : `Enter the details for a new ${isICU ? "ICU" : "inpatient"} admission. Click save when you're done.`}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="mt-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading form data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <PatientCombobox
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                      }}
                      placeholder="Search patient by name, ID, or number..."
                      disabled={isEditing}
                    />
                  </FormControl>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">Patient cannot be changed after admission</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="admissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isEditing} />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">Date cannot be changed after admission</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="admissionTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled={isEditing} />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">Time cannot be changed after admission</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <DiagnosisCombobox
                        value={selectedDiagnosis?.diagnosisId.toString() || ""}
                        onValueChange={(value, diagnosis) => {
                          if (diagnosis) {
                            setSelectedDiagnosis(diagnosis)
                            const diagnosisText = diagnosis.icd10Code
                              ? `${diagnosis.icd10Code} - ${diagnosis.diagnosisName}`
                              : diagnosis.diagnosisName
                            field.onChange(diagnosisText)
                          }
                        }}
                        placeholder="Search ICD-10 diagnosis code or name..."
                        disabled={isSubmitting}
                        allowMultiple={false}
                      />
                      <Textarea
                        placeholder="Or enter diagnosis manually (e.g., 'Primary: Migraine headache')"
                        className="min-h-[80px]"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value)
                          // Clear selected diagnosis if user types manually
                          if (e.target.value && selectedDiagnosis) {
                            setSelectedDiagnosis(null)
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Attending Physician {isEditing && <span className="text-muted-foreground font-normal">(Read-only)</span>}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                          {doctor.firstName} {doctor.lastName}
                          {doctor.specialization && ` - ${doctor.specialization}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">Doctor cannot be changed after admission. This field is for display only.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isICU ? (
              <FormField
                control={form.control}
                name="icuBedId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICU Bed</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bed" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {icuBeds.map((bed) => (
                          <SelectItem key={bed.icuBedId} value={bed.icuBedId.toString()}>
                            {bed.bedNumber} ({bed.status === "available" ? "Available" : bed.status})
                            {bed.equipmentList && ` - ${bed.equipmentList}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormItem className="flex flex-col">
                    <FormLabel>Ward Type (Optional)</FormLabel>
                    <Select
                      value={selectedWardType || "all"}
                      onValueChange={(value) => {
                        setSelectedWardType(value === "all" ? "" : value)
                        // Clear ward selection when type changes
                        setSelectedWardId("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Maternity">Maternity</SelectItem>
                        <SelectItem value="Pediatric">Pediatric</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <FormItem className="flex flex-col">
                    <FormLabel>Ward (Optional)</FormLabel>
                    <Popover open={wardOpen} onOpenChange={setWardOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={wardOpen}
                          className="w-full justify-between"
                          type="button"
                        >
                          {selectedWard
                            ? `${selectedWard.wardName}${selectedWard.wardType ? ` (${selectedWard.wardType})` : ""}${wardBedCounts[selectedWard.wardId] !== undefined ? ` - ${wardBedCounts[selectedWard.wardId]} bed${wardBedCounts[selectedWard.wardId] !== 1 ? 's' : ''} available` : " - 0 beds available"}`
                            : "Select ward (optional)..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search ward by name or type..."
                            value={wardSearch}
                            onValueChange={setWardSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No ward found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  setSelectedWardId("")
                                  setWardOpen(false)
                                  setWardSearch("")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !selectedWardId ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                All Wards
                              </CommandItem>
                              {filteredWards.map((ward) => {
                                const availableCount = wardBedCounts[ward.wardId] || 0
                                return (
                                  <CommandItem
                                    key={ward.wardId}
                                    value={ward.wardId.toString()}
                                    onSelect={() => {
                                      setSelectedWardId(ward.wardId.toString())
                                      setWardOpen(false)
                                      setWardSearch("")
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedWardId === ward.wardId.toString() ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{ward.wardName}</span>
                                        <span className="text-xs text-muted-foreground font-medium">
                                          {availableCount} bed{availableCount !== 1 ? 's' : ''} available
                                        </span>
                                      </div>
                                      {ward.wardType && (
                                        <span className="text-xs text-muted-foreground">{ward.wardType}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                </div>
                <FormField
                  control={form.control}
                  name="bedId"
                  render={({ field }) => {
                    const [bedOpen, setBedOpen] = useState(false)
                    const [bedSearch, setBedSearch] = useState("")

                    const filteredBeds = beds.filter((bed) => {
                      if (!bedSearch) return true
                      const search = bedSearch.toLowerCase()
                      return (
                        bed.bedNumber?.toLowerCase().includes(search) ||
                        bed.wardName?.toLowerCase().includes(search) ||
                        bed.wardType?.toLowerCase().includes(search)
                      )
                    })

                    const selectedBed = beds.find((b) => b.bedId?.toString() === field.value)

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Bed</FormLabel>
                        <Popover open={bedOpen} onOpenChange={setBedOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={bedOpen}
                                className="w-full justify-between"
                                type="button"
                                disabled={isSubmitting}
                              >
                                {selectedBed
                                  ? `${selectedBed.bedNumber} - ${selectedBed.wardName} (${selectedBed.status === "available" ? "Available" : selectedBed.status})`
                                  : "Select bed..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search bed by number, ward, or type..."
                                value={bedSearch}
                                onValueChange={setBedSearch}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {beds.length === 0
                                    ? selectedWardId
                                      ? "No beds available in selected ward"
                                      : "No beds available"
                                    : "No bed found matching search"}
                                </CommandEmpty>
                                <CommandGroup>
                                  {filteredBeds.map((bed) => (
                                    <CommandItem
                                      key={bed.bedId}
                                      value={bed.bedId.toString()}
                                      onSelect={() => {
                                        field.onChange(bed.bedId.toString())
                                        setBedOpen(false)
                                        setBedSearch("")
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === bed.bedId.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {bed.bedNumber} - {bed.wardName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {bed.wardType || "General"} • {bed.status === "available" ? "Available" : bed.status}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            )}

            {isICU && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icuAdmissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="transfer">Transfer from Ward</SelectItem>
                          <SelectItem value="post-op">Post-Operative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiresVentilator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requires Ventilator</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {!isICU && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expectedDischargeDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Discharge Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        If entered, a deposit invoice is created and paid amount is deducted from final bill.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="admissionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes about the patient's condition or special requirements"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

                </div>
              </div>
              <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : isEditing ? "Update Admission" : "Save Admission"}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
