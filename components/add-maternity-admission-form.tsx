"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
import { formatDateLong } from "@/lib/date-utils"

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
import { toast } from "@/components/ui/use-toast"
import { PatientCombobox } from "@/components/patient-combobox"
import { patientApi, doctorsApi, inpatientApi, maternityApi } from "@/lib/api"

const formSchema = z.object({
  patientId: z.string({
    required_error: "Please select a patient.",
  }),
  admittingDoctorId: z.string({
    required_error: "Please select a doctor.",
  }),
  admissionDate: z.date({
    required_error: "Admission date is required.",
  }),
  gestationWeeks: z.string({
    required_error: "Gestation weeks is required.",
  }),
  expectedDeliveryDate: z.date({
    required_error: "Expected delivery date is required.",
  }),
  bedId: z.string({
    required_error: "Please select a bed.",
  }),
  pregnancyNumber: z.string().optional(),
  previousPregnancies: z.string().optional(),
  previousDeliveries: z.string().optional(),
  previousComplications: z.string().optional(),
  bloodGroup: z.string().optional(),
  rhesusFactor: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: Partial<FormValues> = {
  patientId: "",
  admittingDoctorId: "",
  bedId: "",
  pregnancyNumber: "",
  previousPregnancies: "",
  previousDeliveries: "",
  previousComplications: "",
  bloodGroup: "",
  rhesusFactor: "",
  notes: "",
}

export function AddMaternityAdmissionForm({
  open,
  onOpenChange,
  onSuccess,
}: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [maternityWardId, setMaternityWardId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true) // Start as true to prevent rendering empty dropdowns
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Initialize client-side only after mount to avoid hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && isMounted) {
      setError(null)
      // Set dates client-side only to avoid hydration mismatch
      const now = new Date()
      const defaultExpectedDate = new Date(now)
      defaultExpectedDate.setDate(now.getDate() + 14) // Default to 2 weeks from now
      
      // Reset form with dates set client-side
      form.reset({
        ...defaultValues,
        admissionDate: now,
        expectedDeliveryDate: defaultExpectedDate,
        gestationWeeks: "",
      } as FormValues)
      // Load data - this will handle loading state
      loadFormData()
    } else if (!open) {
      // Reset state when dialog closes to prevent stale data on next open
      setLoading(true)
      setPatients([])
      setDoctors([])
      setBeds([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMounted])

  const loadFormData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load data with individual error handling so one failure doesn't block others
      const [patientsResult, doctorsResult, wardsResult] = await Promise.allSettled([
        patientApi.getAll(),
        doctorsApi.getAll(),
        inpatientApi.getWards(),
      ])

      if (patientsResult.status === 'fulfilled') {
        setPatients(patientsResult.value || [])
      } else {
        console.error('Error loading patients:', patientsResult.reason)
        toast({
          title: "Error loading patients",
          description: patientsResult.reason?.message || "Failed to load patients",
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

      if (wardsResult.status === 'fulfilled') {
        const raw = wardsResult.value || []
        const wards = Array.from(new Map((raw as any[]).map((w: any) => [w.wardId, w])).values())
        console.log('Loaded wards:', wards)
        // Find maternity ward
        const maternityWard = wards.find((w: any) => 
          w.wardName?.toLowerCase().includes('maternity') || 
          w.wardType?.toLowerCase().includes('maternity')
        )
        
        if (maternityWard) {
          console.log('Found maternity ward:', maternityWard)
          setMaternityWardId(maternityWard.wardId)
          // Load beds for maternity ward - try both with and without status filter
          try {
            // First try to get available beds
            const bedsData = await inpatientApi.getBeds(maternityWard.wardId.toString(), 'available')
            console.log('Available beds loaded:', bedsData)
            setBeds(bedsData || [])
            
            // If no available beds, try loading all beds for debugging
            if (!bedsData || bedsData.length === 0) {
              console.warn('No available beds found, checking all beds...')
              const allBeds = await inpatientApi.getBeds(maternityWard.wardId.toString())
              console.log('All beds in maternity ward:', allBeds)
            }
          } catch (err: any) {
            console.error('Error loading beds:', err)
            setBeds([])
            setError(`Failed to load beds: ${err.message || 'Unknown error'}`)
          }
        } else {
          console.warn('Maternity ward not found. Available wards:', wards.map((w: any) => ({ name: w.wardName, type: w.wardType })))
          setBeds([])
          setError('Maternity ward not found in the system. Please ensure the ward exists.')
        }
      } else {
        console.error('Error loading wards:', wardsResult.reason)
        setBeds([])
        setError('Failed to load wards. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form data')
      console.error('Error loading form data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePatientChange = (patientId: string) => {
    // Patient ID is already set by PatientCombobox, no need to do anything
    // This function is kept for compatibility but can be removed if not needed
  }

  async function onSubmit(data: FormValues) {
    try {
      setIsSubmitting(true)
      setError(null)

      // Prepare API payload
      const payload = {
        patientId: parseInt(data.patientId),
        bedId: parseInt(data.bedId),
        admittingDoctorId: parseInt(data.admittingDoctorId),
        admissionDate: data.admissionDate.toISOString().split('T')[0],
        gestationWeeks: parseInt(data.gestationWeeks),
        expectedDeliveryDate: data.expectedDeliveryDate.toISOString().split('T')[0],
        pregnancyNumber: data.pregnancyNumber ? parseInt(data.pregnancyNumber) : null,
        previousPregnancies: data.previousPregnancies ? parseInt(data.previousPregnancies) : null,
        previousDeliveries: data.previousDeliveries ? parseInt(data.previousDeliveries) : null,
        previousComplications: data.previousComplications || null,
        bloodGroup: data.bloodGroup || null,
        rhesusFactor: data.rhesusFactor || null,
        notes: data.notes || null,
      }

      await maternityApi.createAdmission(payload)
      
      toast({
        title: "Maternity admission created",
        description: `Patient has been admitted to maternity ward successfully.`,
      })
      
      form.reset()
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create maternity admission'
      setError(errorMessage)
      toast({
        title: "Error creating admission",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error creating maternity admission:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedPatient = patients?.find((p: any) => p.patientId?.toString() === form.watch('patientId')) || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Maternity Admission</DialogTitle>
          <DialogDescription>Admit a patient to the maternity ward.</DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading form data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            handlePatientChange(value)
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
                  name="admittingDoctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attending Doctor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                              Dr. {doctor.firstName} {doctor.lastName} {doctor.department ? `- ${doctor.department}` : ''}
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
                  name="admissionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Admission Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              <span suppressHydrationWarning>
                                {field.value ? formatDateLong(field.value) : "Select date"}
                              </span>
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
                  name="bedId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bed</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                        disabled={beds.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={beds.length === 0 ? "No available beds" : "Select bed"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {beds.length > 0 && beds.map((bed) => (
                            <SelectItem key={bed.bedId} value={bed.bedId.toString()}>
                              {bed.bedNumber} {bed.wardName ? `(${bed.wardName})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {beds.length === 0 && (
                        <p className="text-sm text-muted-foreground">No available beds in the maternity ward</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gestationWeeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gestation (Weeks)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="45" placeholder="e.g., 38" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expected Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              <span suppressHydrationWarning>
                                {field.value ? formatDateLong(field.value) : "Select date"}
                              </span>
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pregnancyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pregnancy Number</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="e.g., 1, 2, 3..." {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="previousPregnancies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Pregnancies</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Number" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="previousDeliveries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Deliveries</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Number" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="AB">AB</SelectItem>
                          <SelectItem value="O">O</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rhesusFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rhesus Factor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rhesus factor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
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
                name="previousComplications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Complications</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Previous pregnancy complications, etc."
                        className="min-h-[80px]"
                        {...field}
                      />
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
                      <Textarea placeholder="Any additional information" className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Admit Patient
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
