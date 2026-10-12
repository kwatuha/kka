"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { PatientCombobox } from "@/components/patient-combobox"
import { radiologyApi, patientApi, doctorsApi } from "@/lib/api"
import { Loader2 } from "lucide-react"

const examinationFormSchema = z.object({
  patientId: z.string({
    required_error: "Please select a patient",
  }),
  patientName: z.string().optional(),
  examTypeId: z.string({
    required_error: "Please select an examination type",
  }),
  orderedBy: z.string({
    required_error: "Please select a doctor",
  }),
  priority: z.string({
    required_error: "Please select a priority",
  }),
  clinicalIndication: z.string().min(10, {
    message: "Clinical information must be at least 10 characters",
  }),
  bodyPart: z.string().optional(),
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
})

type ExaminationFormValues = z.infer<typeof examinationFormSchema>

const defaultValues: Partial<ExaminationFormValues> = {
  patientId: "",
  patientName: "",
  examTypeId: "",
  orderedBy: "",
  priority: "routine",
  clinicalIndication: "",
  bodyPart: "",
  scheduledDate: "",
  notes: "",
}

interface AddExaminationFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function AddExaminationForm({ open, onOpenChange, onSuccess }: AddExaminationFormProps) {
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [examTypes, setExamTypes] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const form = useForm<ExaminationFormValues>({
    resolver: zodResolver(examinationFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      loadFormData()
    }
  }, [open])

  const loadFormData = async () => {
    try {
      setLoadingData(true)
      
      // Load data with individual error handling so one failure doesn't block others
      const [examTypesResult, doctorsResult] = await Promise.allSettled([
        radiologyApi.getExamTypes(),
        doctorsApi.getAll(),
      ])
      
      if (examTypesResult.status === 'fulfilled') {
        setExamTypes(examTypesResult.value || [])
      } else {
        console.error('Error loading exam types:', examTypesResult.reason)
        toast({
          title: "Error loading exam types",
          description: examTypesResult.reason?.message || "Failed to load exam types",
          variant: "destructive",
        })
      }
      
      if (doctorsResult.status === 'fulfilled') {
        setDoctors(doctorsResult.value || [])
      } else {
        console.error('Error loading doctors:', doctorsResult.reason)
        toast({
          title: "Error loading doctors",
          description: doctorsResult.reason?.message || "Failed to load doctors",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error('Unexpected error loading form data:', err)
      toast({
        title: "Error loading form data",
        description: err.message || "Failed to load form data",
        variant: "destructive",
      })
    } finally {
      setLoadingData(false)
    }
  }

  async function onSubmit(data: ExaminationFormValues) {
    setLoading(true)
    try {
      const orderData = {
        patientId: parseInt(data.patientId),
        orderedBy: parseInt(data.orderedBy),
        examTypeId: parseInt(data.examTypeId),
        priority: data.priority.toLowerCase(),
        clinicalIndication: data.clinicalIndication,
        bodyPart: data.bodyPart || null,
        scheduledDate: data.scheduledDate || null,
        notes: data.notes || null,
        status: 'pending',
      }

      await radiologyApi.createOrder(orderData)

      toast({
        title: "Examination request submitted",
        description: `Examination request has been submitted successfully.`,
      })

      form.reset()
      if (onSuccess) {
        onSuccess()
      }
      if (onOpenChange) {
        onOpenChange(false)
      }
    } catch (err: any) {
      toast({
        title: "Error submitting request",
        description: err.message || "Failed to submit examination request",
        variant: "destructive",
      })
      console.error('Error submitting examination request:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading form data...</span>
      </div>
    )
  }

  if (patients.length === 0 || examTypes.length === 0 || doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <p className="text-sm text-muted-foreground">Unable to load form data</p>
        <p className="text-xs text-muted-foreground">
          {patients.length === 0 && "No patients found. "}
          {examTypes.length === 0 && "No exam types found. "}
          {doctors.length === 0 && "No doctors found."}
        </p>
        <Button variant="outline" size="sm" onClick={loadFormData} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      // Load patient name when selected
                      if (value) {
                        patientApi.getById(value).then((patient) => {
                          if (patient) {
                            form.setValue("patientName", `${patient.firstName} ${patient.lastName}`)
                          }
                        }).catch(() => {
                          // Ignore errors
                        })
                      }
                    }}
                    placeholder="Search patient by name, ID, or number..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="examTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Examination Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select examination type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {examTypes.map((type) => (
                      <SelectItem key={type.examTypeId} value={type.examTypeId.toString()}>
                        {type.examName} {type.examCode ? `(${type.examCode})` : ''}
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
            name="orderedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requested By</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.userId || doctor.doctorId} value={(doctor.userId || doctor.doctorId).toString()}>
                        {doctor.firstName} {doctor.lastName}
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">Stat</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bodyPart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Part (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Chest, Head, Knee" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="clinicalIndication"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Clinical Indication</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter clinical information and reason for examination..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>Provide relevant clinical information to help with the examination.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any additional notes or instructions..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onOpenChange && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Examination Request"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
