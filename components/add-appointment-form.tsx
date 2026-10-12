"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { PatientCombobox } from "@/components/patient-combobox"
import { appointmentsApi, doctorsApi, departmentApi, isDuplicateAppointmentConflict } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import {
  filterTelemedicineAppointmentDepartments,
  getDefaultAppointmentDepartment,
  isTelemedicineExperiencePack,
} from "@/lib/telemedicine-scope"
import { Loader2 } from "lucide-react"

const appointmentSchema = z.object({
  patientId: z.string().min(1, { message: "Patient is required" }),
  patientName: z.string().optional(),
  doctorId: z.string().optional(), // Doctor is optional in the database schema
  department: z.string().optional(), // Department is optional
  appointmentDate: z.string().min(1, { message: "Appointment date is required" }),
  appointmentTime: z.string().min(1, { message: "Appointment time is required" }),
  reason: z.string().optional(),
  status: z.string().min(1, { message: "Status is required" }),
  notes: z.string().optional(),
})

export type AppointmentFormMode = "create" | "edit" | "reschedule"

function formatAppointmentDateInput(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) return m[1]
  }
  const d = new Date(value as string | number | Date)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}

function formatAppointmentTimeInput(value: unknown): string {
  if (value == null || value === "") return ""
  const s = String(value).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`
  return s.slice(0, 5)
}

function isOtherFacilityError(error: any) {
  const message = String(error?.message || error?.response?.message || "")
  return (
    error?.code === "PATIENT_OTHER_FACILITY" ||
    error?.response?.code === "PATIENT_OTHER_FACILITY" ||
    /another facility/i.test(message)
  )
}

function formatOtherFacilityError(
  error: any,
  selected?: { name: string; branchId: number | null } | null,
  _currentFacilityName?: string | null,
  branches?: Array<{ branchId?: number; branchName?: string }>
) {
  const apiFacility = String(error?.response?.patientFacility || "").trim()
  const selectedId = selected?.branchId != null ? Number(selected.branchId) : Number(error?.response?.patientBranchId)
  const namedFromList =
    Number.isFinite(selectedId) && selectedId > 0
      ? branches?.find((b) => Number(b.branchId) === selectedId)?.branchName
      : undefined
  const patientFacility =
    apiFacility ||
    selected?.name ||
    namedFromList ||
    (Number.isFinite(selectedId) && selectedId > 0 ? `Facility #${selectedId}` : "")

  if (patientFacility) {
    return `This patient belongs to another facility (${patientFacility}). Register or select a patient from your facility.`
  }

  return (
    error?.message ||
    error?.response?.message ||
    "This patient belongs to another facility. Register or select a patient from your facility."
  )
}

interface AddAppointmentFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: (info?: { department?: string | null }) => void
  appointment?: any
  /** Prefill appointment date (YYYY-MM-DD) when creating a new booking */
  defaultDate?: string
  /** Facility to stamp on new appointments (calendar / nurse booking) */
  defaultBranchId?: number | string | null
  /** Prefill department / clinic name */
  defaultDepartment?: string
  /** When true, department is shown as the clinic and cannot be changed */
  lockDepartment?: boolean
  /** Restrict the department/clinic dropdown to these names (e.g. specialist clinics) */
  departmentOptions?: string[]
  /** Override the department field label */
  departmentFieldLabel?: string
  /** Require a department/clinic before saving */
  requireDepartment?: boolean
  /** create | full edit | reschedule (patient locked, date/time focus) */
  formMode?: AppointmentFormMode
}

export function AddAppointmentForm({
  open,
  onOpenChange,
  onSuccess,
  appointment,
  defaultDate,
  defaultBranchId,
  defaultDepartment,
  lockDepartment = false,
  departmentOptions,
  departmentFieldLabel,
  requireDepartment = false,
  formMode: formModeProp,
}: AddAppointmentFormProps) {
  const { currentBranch, accessibleBranches } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedPatientFacility, setSelectedPatientFacility] = useState<{
    name: string
    branchId: number | null
  } | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string
    payload: any
  } | null>(null)
  const isEditing = !!appointment
  const formMode: AppointmentFormMode =
    formModeProp || (isEditing ? "edit" : "create")
  const isReschedule = formMode === "reschedule" && isEditing

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      patientName: "",
      doctorId: "",
      department: "",
      appointmentDate: "",
      appointmentTime: "",
      reason: "",
      status: "scheduled",
      notes: "",
    },
  })

  // Watch for patientId changes
  const patientId = form.watch("patientId")
  const selectedDepartment = form.watch("department")
  const clinicSelectEnabled = Boolean(departmentOptions?.length) && !lockDepartment
  const clinicLabel =
    departmentFieldLabel ||
    (lockDepartment || clinicSelectEnabled ? "Specialist clinic" : "Department (Optional)")
  const selectedClinicName =
    (selectedDepartment && selectedDepartment !== "none" ? selectedDepartment : "") || defaultDepartment || ""
  const facilityMismatch = Boolean(
    selectedPatientFacility &&
      currentBranch?.branchId &&
      selectedPatientFacility.branchId != null &&
      Number(selectedPatientFacility.branchId) !== Number(currentBranch.branchId)
  )
  const patientUnassigned = Boolean(selectedPatientFacility && selectedPatientFacility.branchId == null)

  // Define load functions with useCallback to keep them stable
  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true)
      const data = await doctorsApi.getAll()
      setDoctors(data || [])
    } catch (error: any) {
      console.error("Error loading doctors:", error)
      toast({
        title: "Error loading doctors",
        description: error.message || "Failed to load doctors",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDepartments = useCallback(async () => {
    try {
      if (departmentOptions && departmentOptions.length > 0) {
        const unique = Array.from(new Set(departmentOptions.map((name) => String(name || "").trim()).filter(Boolean)))
        setDepartments(unique.map((name) => ({ departmentId: `clinic-${name}`, departmentName: name })))
        return
      }

      const data = await departmentApi.getAll()
      let list = filterTelemedicineAppointmentDepartments(Array.isArray(data) ? [...data] : [])

      if (defaultDepartment && !list.some((d) => String(d?.departmentName || "") === defaultDepartment)) {
        list.push({ departmentId: `clinic-${defaultDepartment}`, departmentName: defaultDepartment })
      }

      if (isTelemedicineExperiencePack()) {
        const hasTelemedicine = list.some(
          (d) => String(d?.departmentName || "").toLowerCase() === "telemedicine"
        )
        if (!hasTelemedicine) {
          list.push({ departmentId: "telemedicine", departmentName: "Telemedicine" })
        }
      }

      list.sort((a, b) =>
        String(a.departmentName || "").localeCompare(String(b.departmentName || ""), undefined, {
          sensitivity: "base",
        })
      )
      setDepartments(list)
    } catch (error: any) {
      console.error("Error loading departments:", error)
      if (departmentOptions && departmentOptions.length > 0) {
        setDepartments(
          departmentOptions
            .map((name) => String(name || "").trim())
            .filter(Boolean)
            .map((name) => ({ departmentId: `clinic-${name}`, departmentName: name })),
        )
        return
      }
      setDepartments(
        isTelemedicineExperiencePack()
          ? [{ departmentId: "telemedicine", departmentName: "Telemedicine" }]
          : defaultDepartment
            ? [{ departmentId: `clinic-${defaultDepartment}`, departmentName: defaultDepartment }]
            : []
      )
    }
  }, [defaultDepartment, departmentOptions])

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load doctors and departments when dialog opens, and set dates client-side only
  useEffect(() => {
    if (open && isMounted) {
      loadDoctors()
      loadDepartments()
      if (appointment) {
        return
      }
      const now = new Date()
      const prefillDate =
        defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate)
          ? defaultDate
          : now.toISOString().split("T")[0]
      const optionNames = (departmentOptions ?? [])
        .map((name) => String(name || "").trim())
        .filter(Boolean)
      const requestedDepartment = (defaultDepartment && String(defaultDepartment).trim()) || ""
      const defaultDepartmentName = optionNames.length
        ? optionNames.includes(requestedDepartment)
          ? requestedDepartment
          : optionNames[0]
        : requestedDepartment || getDefaultAppointmentDepartment()
      form.reset({
        patientId: "",
        patientName: "",
        doctorId: "",
        department: defaultDepartmentName,
        appointmentDate: prefillDate,
        appointmentTime: now.toTimeString().split(" ")[0].substring(0, 5),
        reason: "",
        status: "scheduled",
        notes: "",
      })
    } else if (!open) {
      // Reset form when dialog closes
      setDuplicateWarning(null)
      setSelectedPatientFacility(null)
      form.reset({
        patientId: "",
        patientName: "",
        doctorId: "",
        department: "",
        appointmentDate: "",
        appointmentTime: "",
        reason: "",
        status: "scheduled",
        notes: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMounted, defaultDate, defaultDepartment, departmentOptions, appointment])

  // Set form values when editing / rescheduling
  useEffect(() => {
    if (appointment && open && isMounted) {
      const doctorId = appointment.doctorId?.toString() || ""
      const department = appointment.department || ""
      form.reset({
        patientId: appointment.patientId?.toString() || "",
        patientName: appointment.patientFirstName && appointment.patientLastName
          ? `${appointment.patientFirstName} ${appointment.patientLastName}`
          : appointment.patientName || "",
        doctorId,
        department,
        appointmentDate: formatAppointmentDateInput(appointment.appointmentDate),
        appointmentTime: formatAppointmentTimeInput(appointment.appointmentTime),
        reason: appointment.reason || "",
        status: appointment.status || "scheduled",
        notes: appointment.notes || "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, open, isMounted])

  const buildPayload = (values: z.infer<typeof appointmentSchema>) => {
    const payload: any = {
      patientId: parseInt(values.patientId),
      appointmentDate: values.appointmentDate,
      appointmentTime: values.appointmentTime,
      status: values.status || "scheduled",
    }

    if (values.doctorId && values.doctorId !== "none") {
      payload.doctorId = parseInt(values.doctorId)
    } else {
      payload.doctorId = null
    }

    if (lockDepartment && defaultDepartment) {
      payload.department = defaultDepartment
    } else if (values.department && values.department !== "none") {
      payload.department = values.department
    } else {
      payload.department = null
    }

    payload.reason = values.reason || null
    payload.notes = values.notes || null

    if (isReschedule && appointment) {
      const oldDate = formatAppointmentDateInput(appointment.appointmentDate)
      const oldTime = formatAppointmentTimeInput(appointment.appointmentTime)
      const changed =
        oldDate !== values.appointmentDate ||
        oldTime !== formatAppointmentTimeInput(values.appointmentTime)
      if (changed) {
        const stamp = new Date().toISOString().slice(0, 10)
        const line = `[Rescheduled ${stamp}] from ${oldDate} ${oldTime} → ${values.appointmentDate} ${formatAppointmentTimeInput(values.appointmentTime)}`
        payload.notes = [values.notes, line].filter(Boolean).join("\n")
      }
    }

    if (!isEditing && defaultBranchId != null && defaultBranchId !== "") {
      const bid = Number(defaultBranchId)
      if (Number.isFinite(bid) && bid > 0) payload.branchId = bid
    }

    return payload
  }

  const saveAppointment = async (payload: any, force = false) => {
    const body = force ? { ...payload, force: true } : payload
    if (isEditing) {
      await appointmentsApi.update(appointment.appointmentId.toString(), body)
      toast({
        title: isReschedule ? "Appointment rescheduled" : "Appointment updated",
        description: isReschedule
          ? "Date and time updated. The patient can be notified via SMS from online bookings if applicable."
          : "The appointment has been updated successfully.",
      })
    } else {
      await appointmentsApi.create(body)
      toast({
        title: "Appointment scheduled",
        description: "The appointment has been scheduled successfully.",
      })
    }
    form.reset()
    setDuplicateWarning(null)
    onOpenChange?.(false)
    onSuccess?.({ department: payload.department ?? null })
  }

  const onSubmit = async (values: z.infer<typeof appointmentSchema>) => {
    try {
      setIsSubmitting(true)
      setError(null)
      if (requireDepartment && !(lockDepartment && defaultDepartment)) {
        const selected = values.department && values.department !== "none" ? values.department : ""
        if (!selected) {
          form.setError("department", { message: "Specialist clinic is required" })
          return
        }
      }
      const payload = buildPayload(values)
      await saveAppointment(payload, false)
    } catch (error: any) {
      console.error("Error saving appointment:", error)
      if (isDuplicateAppointmentConflict(error)) {
        setDuplicateWarning({
          message:
            error?.response?.message ||
            error.message ||
            "This patient already has an appointment for this service at the same date and time.",
          payload: buildPayload(values),
        })
        return
      }
      const errorMessage = isOtherFacilityError(error)
        ? formatOtherFacilityError(
            error,
            selectedPatientFacility,
            currentBranch?.branchName,
            accessibleBranches
          )
        : error.message || error.response?.message || "Failed to save appointment"
      setError(errorMessage)
      toast({
        title: isEditing ? "Error updating appointment" : "Error scheduling appointment",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForceSave = async () => {
    if (!duplicateWarning) return
    try {
      setIsSubmitting(true)
      setError(null)
      await saveAppointment(duplicateWarning.payload, true)
    } catch (error: any) {
      console.error("Error force-saving appointment:", error)
      const errorMessage = error.message || error.response?.message || "Failed to save appointment"
      setError(errorMessage)
      setDuplicateWarning(null)
      toast({
        title: isEditing ? "Error updating appointment" : "Error scheduling appointment",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle patient selection from combobox
  const handlePatientChange = (value: string) => {
    form.setValue("patientId", value)
    // Optionally fetch and set patient name
    if (value) {
      const patientIdNum = parseInt(value)
      // You could fetch patient details here if needed
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isReschedule
              ? "Reschedule appointment"
              : isEditing
              ? "Edit Appointment"
              : clinicSelectEnabled
                ? selectedClinicName
                  ? `Schedule ${selectedClinicName} appointment`
                  : "Schedule specialist clinic appointment"
                : defaultDepartment
                  ? `Schedule ${defaultDepartment} appointment`
                  : "Schedule New Appointment"}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "Change the booked date and time when the patient requests a new slot. Patient cannot be changed here."
              : isEditing
              ? "Update the appointment details below."
              : clinicSelectEnabled
                ? "Choose the specialist clinic, then book a registered patient. The visit will appear on that clinic list and on Appointments."
                : defaultDepartment
                  ? `This visit is saved under ${defaultDepartment}. The patient will appear on that specialist clinic list and on Appointments.`
                  : "Create a new appointment for a patient with a doctor."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <PatientCombobox
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        handlePatientChange(value)
                      }}
                      onPatientSelect={(patient) => {
                        if (!patient) {
                          setSelectedPatientFacility(null)
                          return
                        }
                        const name = String(patient.registeredBranchName || "").trim()
                        const id = Number(patient.registeredBranchId)
                        const branchId = Number.isFinite(id) && id > 0 ? id : null
                        const fromAuth =
                          branchId != null
                            ? accessibleBranches.find((b) => Number(b.branchId) === branchId)?.branchName
                            : undefined
                        setSelectedPatientFacility({
                          name: name || fromAuth || (branchId ? `Facility #${branchId}` : "Unassigned facility"),
                          branchId,
                        })
                      }}
                      placeholder="Search patient by name, ID, or number..."
                      disabled={isEditing || isReschedule}
                    />
                  </FormControl>
                  <FormDescription
                    className={
                      facilityMismatch || patientUnassigned
                        ? "text-amber-700 dark:text-amber-400"
                        : undefined
                    }
                  >
                    {selectedPatientFacility
                      ? facilityMismatch
                        ? `This patient is registered at ${selectedPatientFacility.name}. You are booking from ${currentBranch?.branchName}. Switch facility or pick a patient from ${currentBranch?.branchName}.`
                        : patientUnassigned
                          ? `This patient has no registered facility. You are booking from ${currentBranch?.branchName || "your current facility"}.`
                          : `This patient is registered at ${selectedPatientFacility.name}${
                              currentBranch?.branchName ? `. You are booking from ${currentBranch.branchName}` : ""
                            }.`
                      : currentBranch?.branchName
                        ? `Booking from ${currentBranch.branchName}. Only patients registered at this facility can be queued.`
                        : "Only patients registered at your current facility can be queued."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === "none" ? "" : value)
                      }}
                      value={field.value || undefined}
                      disabled={loading || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                            {doctor.firstName} {doctor.lastName}
                            {doctor.specialization && ` - ${doctor.specialization}`}
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
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {clinicLabel}
                      {requireDepartment || clinicSelectEnabled ? " *" : ""}
                    </FormLabel>
                    {lockDepartment && defaultDepartment ? (
                      <FormControl>
                        <Input value={defaultDepartment} readOnly className="bg-muted/50" />
                      </FormControl>
                    ) : (
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === "none" ? "" : value)
                      }}
                      value={field.value || undefined}
                      disabled={loading || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              clinicSelectEnabled
                                ? "Select specialist clinic"
                                : "Select department (optional)"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinicSelectEnabled || requireDepartment ? null : (
                          <SelectItem value="none">None</SelectItem>
                        )}
                        {departments.map((dept) => (
                          <SelectItem key={dept.departmentId} value={dept.departmentName}>
                            {dept.departmentName}
                          </SelectItem>
                        ))}
                        {departments.length === 0 && !clinicSelectEnabled && (
                          <>
                            {isTelemedicineExperiencePack() ? (
                              <SelectItem value="Telemedicine">Telemedicine</SelectItem>
                            ) : (
                              <>
                                <SelectItem value="Consultation">Consultation</SelectItem>
                                <SelectItem value="Cardiology">Cardiology</SelectItem>
                                <SelectItem value="Neurology">Neurology</SelectItem>
                                <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                                <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                              </>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Appointment reason"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions or notes"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  onOpenChange?.(false)
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isReschedule ? "Saving…" : isEditing ? "Updating..." : "Scheduling..."}
                  </>
                ) : isReschedule ? (
                  "Save new date & time"
                ) : isEditing ? (
                  "Update Appointment"
                ) : (
                  "Schedule Appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={!!duplicateWarning}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) setDuplicateWarning(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Possible duplicate appointment</AlertDialogTitle>
          <AlertDialogDescription>
            {duplicateWarning?.message ||
              "This patient already has an appointment for the same service on this day."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Go back</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault()
              void handleForceSave()
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Book anyway"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
