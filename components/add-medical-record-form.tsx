"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react"
import { format } from "date-fns"

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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PatientCombobox } from "@/components/patient-combobox"
import { doctorsApi, medicalRecordsApi, clinicalCdsApi } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

const medicalRecordFormSchema = z.object({
  patientId: z.string({
    required_error: "Please select a patient.",
  }),
  doctorId: z.string({
    required_error: "Please select a doctor.",
  }),
  visitDate: z.date({
    required_error: "Visit date is required.",
  }),
  visitType: z.string().optional(),
  department: z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  amendmentReason: z.string().optional(),
})

const CLINICAL_KEYS = ["chiefComplaint", "diagnosis", "treatment", "prescription", "notes"] as const

type MedicalRecordFormValues = z.infer<typeof medicalRecordFormSchema>

interface AddMedicalRecordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  record?: any | null
}

export function AddMedicalRecordForm({ open, onOpenChange, onSuccess, record }: AddMedicalRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [amendments, setAmendments] = useState<any[]>([])
  const [cdsAlerts, setCdsAlerts] = useState<{ message: string }[]>([])
  const clinicalBaseline = useRef<Record<string, string>>({})

  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordFormSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      visitType: "Outpatient",
      department: "",
      chiefComplaint: "",
      diagnosis: "",
      treatment: "",
      prescription: "",
      notes: "",
      amendmentReason: "",
    },
  })

  const chiefComplaintWatch = form.watch("chiefComplaint")
  const diagnosisWatch = form.watch("diagnosis")
  const notesWatch = form.watch("notes")
  const patientIdWatch = form.watch("patientId")

  const recordCdsText = useMemo(
    () =>
      [chiefComplaintWatch, diagnosisWatch, notesWatch]
        .map((s) => String(s || "").trim())
        .filter(Boolean)
        .join(" | "),
    [chiefComplaintWatch, diagnosisWatch, notesWatch]
  )

  useEffect(() => {
    if (!open || recordCdsText.length < 4) {
      setCdsAlerts([])
      return
    }
    const pid = Number(patientIdWatch || 0)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const r = await clinicalCdsApi.evaluate({
            ...(pid > 0 ? { patientId: pid } : {}),
            clinicalText: recordCdsText,
          })
          setCdsAlerts(r.alerts || [])
        } catch {
          setCdsAlerts([])
        }
      })()
    }, 600)
    return () => clearTimeout(timer)
  }, [open, recordCdsText, patientIdWatch])

  useEffect(() => {
    if (open) {
      loadData()
      if (record) {
        const baseline = {
          chiefComplaint: record.chiefComplaint || "",
          diagnosis: record.diagnosis || "",
          treatment: record.treatment || "",
          prescription: record.prescription || "",
          notes: record.notes || "",
        }
        clinicalBaseline.current = baseline
        form.reset({
          patientId: record.patientId?.toString() || "",
          doctorId: record.doctorId?.toString() || "",
          visitDate: record.visitDate ? new Date(record.visitDate) : undefined,
          visitType: record.visitType || "Outpatient",
          department: record.department || "",
          ...baseline,
          amendmentReason: "",
        })
        void medicalRecordsApi
          .getAmendments(record.recordId.toString())
          .then((r) => setAmendments(r.amendments || []))
          .catch(() => setAmendments([]))
      } else {
        clinicalBaseline.current = {}
        setAmendments([])
        form.reset({
          patientId: "",
          doctorId: "",
          visitType: "Outpatient",
          department: "",
          chiefComplaint: "",
          diagnosis: "",
          treatment: "",
          prescription: "",
          notes: "",
        })
      }
    }
  }, [open, record])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const doctorsData = await doctorsApi.getAll("", 1, 100)
      setDoctors(doctorsData || [])
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: MedicalRecordFormValues) {
    setIsSubmitting(true)
    setError(null)
    try {
      const submitData = {
        patientId: parseInt(data.patientId),
        doctorId: data.doctorId ? parseInt(data.doctorId) : null,
        visitDate: format(data.visitDate, "yyyy-MM-dd"),
        visitType: data.visitType || "Outpatient",
        department: data.department || null,
        chiefComplaint: data.chiefComplaint || null,
        diagnosis: data.diagnosis || null,
        treatment: data.treatment || null,
        prescription: data.prescription || null,
        notes: data.notes || null,
      }

      if (record) {
        const clinicalChanged = CLINICAL_KEYS.some(
          (key) =>
            String(data[key as keyof MedicalRecordFormValues] ?? "") !==
            String(clinicalBaseline.current[key] ?? "")
        )
        const reason = String(data.amendmentReason || "").trim()
        if (clinicalChanged && !reason) {
          setError("Amendment reason is required when changing diagnosis, treatment, or other clinical text.")
          setIsSubmitting(false)
          return
        }
        await medicalRecordsApi.update(record.recordId.toString(), {
          ...submitData,
          ...(clinicalChanged ? { amendmentReason: reason } : {}),
        })
      } else {
        await medicalRecordsApi.create(submitData)
      }

      form.reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error("Error saving medical record:", err)
      setError(err.message || "Failed to save medical record")
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? "Edit Medical Record" : "Add New Medical Record"}</DialogTitle>
          <DialogDescription>Enter patient medical record information.</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Patient *</FormLabel>
                    <FormControl>
                      <PatientCombobox
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                        }}
                        placeholder="Search patient by name, ID, or number..."
                        disabled={loading}
                      />
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
                    <FormLabel>Doctor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.userId} value={doctor.userId?.toString() || ""}>
                            Dr. {doctor.firstName} {doctor.lastName} {doctor.department ? `- ${doctor.department}` : ""}
                          </SelectItem>
                        ))}
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
                name="visitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Visit Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Select date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visit type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Outpatient">Outpatient</SelectItem>
                        <SelectItem value="Inpatient">Inpatient</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
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
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cardiology, Gynecology" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {cdsAlerts.length > 0 ? (
              <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950/40">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-1 font-medium">Clinical decision support (encounter chart)</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {cdsAlerts.map((a, i) => (
                      <li key={i}>{a.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaint</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Patient's main complaint" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Patient diagnosis" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Plan</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Treatment details" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescription</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Prescribed medications" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional information, lab results, vital signs, etc." {...field} />
                  </FormControl>
                  <FormDescription>Optional - Include lab results, vital signs, or other notes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {record ? (
              <>
                <FormField
                  control={form.control}
                  name="amendmentReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amendment reason (if changing clinical text)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Required when diagnosis, treatment, complaint, prescription, or notes change"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Recorded in the system audit log with before/after snapshot.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {amendments.length > 0 ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1 max-h-32 overflow-y-auto">
                    <p className="font-medium text-foreground">Recent amendments</p>
                    {amendments.slice(0, 5).map((a) => (
                      <p key={a.auditId} className="text-muted-foreground">
                        {a.occurredAt ? new Date(a.occurredAt).toLocaleString() : ""} — {a.summary || a.action}
                      </p>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {record ? "Update Record" : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
