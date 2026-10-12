"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
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
import { MedicationCombobox } from "@/components/medication-combobox"
import { patientApi, doctorsApi, pharmacyApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Package, AlertTriangle } from "lucide-react"
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

const medicationSchema = z.object({
  medicationId: z.string({
    required_error: "Please select a medication.",
  }),
  dosage: z.string().min(1, {
    message: "Dosage is required.",
  }),
  frequency: z.string().min(1, {
    message: "Frequency is required.",
  }),
  duration: z.string().min(1, {
    message: "Duration is required.",
  }),
  quantity: z.string().optional(),
  instructions: z.string().optional(),
})

const prescriptionFormSchema = z.object({
  patientId: z.string({
    required_error: "Please select a patient.",
  }),
  doctorId: z.string({
    required_error: "Please select a doctor.",
  }),
  prescriptionDate: z.date({
    required_error: "Prescription date is required.",
  }),
  diagnosis: z.string().optional(),
  medications: z.array(medicationSchema).min(1, {
    message: "At least one medication is required.",
  }),
  notes: z.string().optional(),
})

type MedicationValues = z.infer<typeof medicationSchema>
type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>

const defaultMedication: MedicationValues = {
  medicationId: "",
  dosage: "",
  frequency: "",
  duration: "",
  quantity: "",
  instructions: "",
}

const defaultValues: Partial<PrescriptionFormValues> = {
  patientId: "",
  doctorId: "",
  diagnosis: "",
  medications: [defaultMedication],
  notes: "",
}

interface AddPrescriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const STORAGE_KEY = 'prescription_form_draft'

export function AddPrescriptionForm({ open, onOpenChange, onSuccess }: AddPrescriptionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMedicationsInventory, setSelectedMedicationsInventory] = useState<Record<number, { totalQuantity: number; hasStock: boolean; sellPrice: number | null }>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showCdsDialog, setShowCdsDialog] = useState(false)
  const [cdsAlerts, setCdsAlerts] = useState<{ severity?: string; message: string }[]>([])
  const [pendingSubmit, setPendingSubmit] = useState<PrescriptionFormValues | null>(null)
  const [lineHptCodes, setLineHptCodes] = useState<Record<number, string>>({})

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  })

  // Load saved draft when form opens
  useEffect(() => {
    if (open) {
      loadData()
      const savedDraft = loadDraftFromStorage()
      if (savedDraft) {
        // Convert date string back to Date object if present
        if (savedDraft.prescriptionDate) {
          savedDraft.prescriptionDate = new Date(savedDraft.prescriptionDate)
        }
        form.reset(savedDraft)
        setHasUnsavedChanges(true)
      } else {
        form.reset({
          patientId: "",
          doctorId: "",
          diagnosis: "",
          medications: [defaultMedication],
          notes: "",
        })
        setHasUnsavedChanges(false)
      }
      setError(null)
    }
  }, [open, form])

  // Auto-save form data to localStorage
  useEffect(() => {
    if (!open) return

    const subscription = form.watch((value) => {
      // Check if form has any meaningful data
      const hasData = value.patientId || value.doctorId || value.diagnosis || 
                      (value.medications && value.medications.some((med: any) => 
                        med.medicationId || med.dosage || med.frequency || med.duration
                      )) || value.notes
      
      if (hasData) {
        saveDraftToStorage(value as any)
        setHasUnsavedChanges(true)
      } else {
        clearDraftFromStorage()
        setHasUnsavedChanges(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, open])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const doctorsData = await doctorsApi.getAll()
      setDoctors(doctorsData)
      await loadInventoryData()
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
      console.error('Error loading form data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadInventoryData = async () => {
    try {
      // Load all drug inventory to calculate totals per medication
      const inventoryItems = await pharmacyApi.getDrugInventory()
      
      // Calculate total quantity and min sellPrice per medication
      const inventoryMap: Record<number, { totalQuantity: number; hasStock: boolean; sellPrice: number | null }> = {}
      
      inventoryItems.forEach((item: any) => {
        const medId = item.medicationId
        const quantity = parseInt(item.quantity || 0)
        const sellPrice = item.sellPrice ? parseFloat(item.sellPrice) : null
        
        if (!inventoryMap[medId]) {
          inventoryMap[medId] = { totalQuantity: 0, hasStock: false, sellPrice: null }
        }
        
        inventoryMap[medId].totalQuantity += quantity
        if (quantity > 0) {
          inventoryMap[medId].hasStock = true
          // Use minimum sellPrice if multiple batches exist
          if (sellPrice && (!inventoryMap[medId].sellPrice || sellPrice < inventoryMap[medId].sellPrice!)) {
            inventoryMap[medId].sellPrice = sellPrice
          }
        }
      })
      
      setSelectedMedicationsInventory(inventoryMap)
    } catch (error) {
      console.error("Error loading inventory data:", error)
    }
  }

  const getInventoryStatus = (medicationId: number) => {
    const inventory = selectedMedicationsInventory[medicationId]
    if (!inventory) {
      return { hasStock: false, quantity: 0, sellPrice: null }
    }
    return {
      hasStock: inventory.hasStock && inventory.totalQuantity > 0,
      quantity: inventory.totalQuantity,
      sellPrice: inventory.sellPrice,
    }
  }

  function validateInventoryQuantities(data: PrescriptionFormValues) {
    let hasValidationError = false
    for (let i = 0; i < data.medications.length; i++) {
      const med = data.medications[i]
      const medId = parseInt(med.medicationId)
      const inventoryStatus = getInventoryStatus(medId)

      if (inventoryStatus?.hasStock && (!med.quantity || med.quantity.trim() === "")) {
        form.setError(`medications.${i}.quantity`, {
          type: "manual",
          message: "Quantity is required for medications in inventory",
        })
        hasValidationError = true
      } else {
        form.clearErrors(`medications.${i}.quantity`)
      }
    }
    return !hasValidationError
  }

  function buildPrescriptionPayload(data: PrescriptionFormValues, cdsAcknowledged?: boolean) {
    const items = data.medications.map((med) => {
      const medId = parseInt(med.medicationId)
      const inventoryStatus = getInventoryStatus(medId)
      const quantity =
        inventoryStatus?.hasStock && med.quantity ? parseInt(med.quantity) : null

      return {
        medicationId: medId,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity,
        instructions: med.instructions || null,
      }
    })

    return {
      patientId: parseInt(data.patientId),
      doctorId: parseInt(data.doctorId),
      prescriptionDate: format(data.prescriptionDate, "yyyy-MM-dd"),
      status: "pending",
      notes: data.notes || data.diagnosis || null,
      items,
      ...(cdsAcknowledged ? { cdsAcknowledged: true } : {}),
    }
  }

  async function finalizePrescriptionSuccess() {
    clearDraftFromStorage()
    setHasUnsavedChanges(false)
    setPendingSubmit(null)
    setCdsAlerts([])
    if (onSuccess) onSuccess()
    onOpenChange(false)
    form.reset()
    setLineHptCodes({})
  }

  async function submitPrescription(data: PrescriptionFormValues, cdsAcknowledged = false) {
    const prescriptionData = buildPrescriptionPayload(data, cdsAcknowledged)
    await pharmacyApi.createPrescription(prescriptionData)
    await finalizePrescriptionSuccess()
  }

  async function onSubmit(data: PrescriptionFormValues) {
    try {
      setError(null)
      if (!validateInventoryQuantities(data)) return

      setIsSubmitting(true)
      await submitPrescription(data, false)
    } catch (err: any) {
      const alerts = err?.response?.cds?.alerts
      if (err?.status === 409 && Array.isArray(alerts) && alerts.length) {
        setPendingSubmit(data)
        setCdsAlerts(alerts)
        setShowCdsDialog(true)
        return
      }
      setError(err.message || "Failed to create prescription")
      console.error("Error creating prescription:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCdsOverrideConfirm() {
    if (!pendingSubmit) return
    try {
      setError(null)
      setIsSubmitting(true)
      setShowCdsDialog(false)
      await submitPrescription(pendingSubmit, true)
    } catch (err: any) {
      setError(err.message || "Failed to create prescription")
      console.error("Error creating prescription after CDS override:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPatientName = (patient: any) => {
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.patientNumber || `Patient ${patient.patientId}`
  }

  const getDoctorName = (doctor: any) => {
    return `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.username || `Doctor ${doctor.userId}`
  }

  const getMedicationName = (medication: any) => {
    return medication.name || medication.medicationName || medication.medicationCode || 'Unknown'
  }

  const handleMedicationSelect = (index: number, medicationId: string, medication?: { hptCode?: string | null }) => {
    form.setValue(`medications.${index}.medicationId`, medicationId)
    const hpt = medication?.hptCode != null ? String(medication.hptCode).trim() : ""
    setLineHptCodes((prev) => {
      const next = { ...prev }
      if (hpt) next[index] = hpt
      else delete next[index]
      return next
    })
    loadInventoryData()
  }

  // Save draft to localStorage
  const saveDraftToStorage = (data: Partial<PrescriptionFormValues>) => {
    if (typeof window === 'undefined') return
    try {
      const dataToSave = {
        ...data,
        // Convert Date to string for storage
        prescriptionDate: data.prescriptionDate instanceof Date 
          ? data.prescriptionDate.toISOString() 
          : data.prescriptionDate,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Error saving draft to localStorage:', error)
    }
  }

  // Load draft from localStorage
  const loadDraftFromStorage = (): Partial<PrescriptionFormValues> | null => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading draft from localStorage:', error)
    }
    return null
  }

  // Clear draft from localStorage
  const clearDraftFromStorage = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing draft from localStorage:', error)
    }
  }

  // Handle dialog close with confirmation if there are unsaved changes
  const handleDialogClose = (shouldClose: boolean) => {
    if (hasUnsavedChanges && shouldClose) {
      setShowCloseConfirm(true)
    } else if (shouldClose) {
      onOpenChange(false)
      setHasUnsavedChanges(false)
    }
  }

  const handleConfirmClose = () => {
    clearDraftFromStorage()
    setHasUnsavedChanges(false)
    setShowCloseConfirm(false)
    onOpenChange(false)
  }

  const handleCancelClose = () => {
    setShowCloseConfirm(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Prescription</DialogTitle>
          <DialogDescription>Enter prescription details for the patient.</DialogDescription>
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
                    <FormLabel>Doctor</FormLabel>
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

            <FormField
              control={form.control}
              name="prescriptionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prescription Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
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

            <div>
              <h3 className="text-md font-medium mb-2">Medications</h3>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Medication {index + 1}</h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove medication</span>
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`medications.${index}.medicationId`}
                        render={({ field }) => {
                          const medicationId = field.value ? parseInt(field.value) : null
                          const inventoryStatus = medicationId ? getInventoryStatus(medicationId) : null
                          
                          return (
                            <FormItem>
                              <FormLabel>Medication *</FormLabel>
                              <FormControl>
                                <MedicationCombobox
                                  value={field.value}
                                  onValueChange={(value) => {
                                    field.onChange(value)
                                    handleMedicationSelect(index, value)
                                  }}
                                  onMedicationSelect={(med) => {
                                    if (med) handleMedicationSelect(index, String(med.medicationId), med)
                                  }}
                                  placeholder="Search medication..."
                                />
                              </FormControl>
                              {medicationId && lineHptCodes[index] ? (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    HPT {lineHptCodes[index]}
                                  </Badge>
                                </div>
                              ) : null}
                              {medicationId && inventoryStatus && (
                                <div className="mt-1">
                                  {inventoryStatus.hasStock ? (
                                    <Badge variant="default" className="text-xs">
                                      <Package className="h-3 w-3 mr-1" />
                                      {inventoryStatus.quantity} in stock
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Out of stock
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                      <FormField
                        control={form.control}
                        name={`medications.${index}.dosage`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dosage *</FormLabel>
                            <FormControl>
                              <Input placeholder="1 tablet" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name={`medications.${index}.frequency`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequency *</FormLabel>
                            <FormControl>
                              <Input placeholder="3 times daily" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`medications.${index}.duration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration *</FormLabel>
                            <FormControl>
                              <Input placeholder="7 days" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`medications.${index}.quantity`}
                        render={({ field }) => {
                          const medicationId = form.watch(`medications.${index}.medicationId`)
                          const medId = medicationId ? parseInt(medicationId) : null
                          const inventoryStatus = medId ? getInventoryStatus(medId) : null
                          const isInInventory = inventoryStatus?.hasStock || false
                          
                          return (
                            <FormItem>
                              <FormLabel>
                                Quantity {isInInventory && <span className="text-destructive">*</span>}
                                {!isInInventory && <span className="text-muted-foreground text-xs"> (Not in inventory)</span>}
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  placeholder={isInInventory ? "Enter quantity" : "Not in inventory"} 
                                  disabled={!isInInventory}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value || undefined)}
                                />
                              </FormControl>
                              {!isInInventory && (
                                <p className="text-xs text-muted-foreground">This medication is not in inventory</p>
                              )}
                              {isInInventory && inventoryStatus?.sellPrice && (
                                <p className="text-xs text-muted-foreground">
                                  Price: KES {inventoryStatus.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per unit
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`medications.${index}.instructions`}
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Special Instructions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Take with food" {...field} />
                          </FormControl>
                          <FormDescription>Optional</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => append(defaultMedication)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medication
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional information" {...field} />
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
                Create Prescription
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showCdsDialog} onOpenChange={setShowCdsDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Clinical decision support alerts
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 pt-2 text-sm text-muted-foreground">
              <p>Review allergy conflicts before prescribing. Acknowledge only if clinically appropriate.</p>
              <ul className="list-disc space-y-1 pl-4">
                {cdsAlerts.map((a, i) => (
                  <li key={i}>
                    <Badge variant="destructive" className="mr-1 text-[10px]">
                      {a.severity || "alert"}
                    </Badge>
                    {a.message}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setPendingSubmit(null)
              setCdsAlerts([])
            }}
          >
            Cancel prescription
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleCdsOverrideConfirm()} disabled={isSubmitting}>
            Acknowledge and prescribe
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes in this prescription form. Your draft has been saved and will be restored when you open the form again.
            <br /><br />
            Do you want to close the form? Your data will be saved as a draft.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelClose}>Continue Editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose}>Close Form</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
