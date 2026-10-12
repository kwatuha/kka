"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { PatientCombobox } from "@/components/patient-combobox"
import { LabDestinationPicker } from "@/components/laboratory/lab-destination-picker"
import { patientApi, doctorsApi, laboratoryApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"

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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

const testRequestFormSchema = z.object({
  patientId: z.string({
    required_error: "Please select a patient.",
  }),
  doctorId: z.string({
    required_error: "Please select a doctor.",
  }),
  testDate: z.date({
    required_error: "Test date is required.",
  }),
  testType: z.string({
    required_error: "Please select a test type.",
  }),
  labId: z.string({
    required_error: "Please select a laboratory unit.",
  }),
  priority: z.string({
    required_error: "Please select a priority level.",
  }),
  clinicalInfo: z.string().optional(),
  fasting: z.boolean().default(false),
  notes: z.string().optional(),
})

type TestRequestFormValues = z.infer<typeof testRequestFormSchema>

const defaultValues: Partial<TestRequestFormValues> = {
  patientId: "",
  doctorId: "",
  testType: "",
  labId: "",
  priority: "Routine",
  clinicalInfo: "",
  fasting: false,
  notes: "",
}

interface AddTestRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddTestRequestForm({ open, onOpenChange, onSuccess }: AddTestRequestFormProps) {
  const { currentBranch } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [testTypes, setTestTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<TestRequestFormValues>({
    resolver: zodResolver(testRequestFormSchema),
    defaultValues,
  })
  const selectedTestType = form.watch("testType")
  const selectedLabId = form.watch("labId")

  useEffect(() => {
    if (open) {
      loadData()
      form.reset(defaultValues)
      setError(null)
    }
  }, [open, form])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [doctorsData, testTypesData] = await Promise.all([
        doctorsApi.getAll(),
        laboratoryApi.getTestTypes(),
      ])
      setDoctors(doctorsData)
      setTestTypes(testTypesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
      console.error('Error loading form data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: TestRequestFormValues) {
    try {
      setIsSubmitting(true)
      setError(null)

      const orderData = {
        patientId: parseInt(data.patientId),
        orderedBy: parseInt(data.doctorId),
        orderDate: format(data.testDate, 'yyyy-MM-dd'),
        priority: data.priority.toLowerCase(),
        status: 'pending',
        clinicalIndication: data.clinicalInfo || data.notes || null,
        labId: parseInt(data.labId),
        items: [{
          testTypeId: parseInt(data.testType),
          notes: data.fasting ? 'Fasting required' : null,
        }],
      }

      await laboratoryApi.createOrder(orderData)
      
      if (onSuccess) {
        onSuccess()
      }
      onOpenChange(false)
      form.reset()
    } catch (err: any) {
      setError(err.message || 'Failed to create test request')
      console.error('Error creating test request:', err)
    } finally {
      setIsSubmitting(false)
    }
  }


  const getDoctorName = (doctor: any) => {
    return `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.username || `Doctor ${doctor.userId}`
  }

  const getTestTypeName = (testType: any) => {
    return testType.testName || 'Unknown'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Laboratory Test Request</DialogTitle>
          <DialogDescription>Request a new laboratory test for a patient.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading data...</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>Requesting Doctor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                            {getDoctorName(doctor)} {doctor.department && ` - ${doctor.department}`}
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
                name="testDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Test Date</FormLabel>
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
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue("labId", "")
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testTypes.map((test) => (
                          <SelectItem key={test.testTypeId} value={test.testTypeId.toString()}>
                            {getTestTypeName(test)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="labId"
              render={({ field }) => (
                <FormItem>
                  <LabDestinationPicker
                    testTypeIds={selectedTestType ? [selectedTestType] : []}
                    branchId={currentBranch?.branchId}
                    value={field.value || selectedLabId || ""}
                    onChange={(labId) => field.onChange(labId)}
                  />
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
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Routine" />
                        </FormControl>
                        <FormLabel className="font-normal">Routine</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Urgent" />
                        </FormControl>
                        <FormLabel className="font-normal">Urgent</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="STAT" />
                        </FormControl>
                        <FormLabel className="font-normal">STAT</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clinicalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Information</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Relevant clinical information, symptoms, or diagnosis" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fasting"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Fasting Required</FormLabel>
                    <FormDescription>Check if the patient needs to fast before the test</FormDescription>
                  </div>
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
                    <Textarea placeholder="Any additional information or special instructions" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
