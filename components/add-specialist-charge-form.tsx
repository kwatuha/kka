"use client"
import { useState, useEffect } from "react"
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { specialistChargeApi, serviceChargeApi, doctorsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  chargeId: z.coerce.number().min(1, { message: "Please select a charge." }),
  doctorId: z.coerce.number().min(1, { message: "Please select a doctor." }),
  amount: z.coerce.number().min(0, { message: "Amount must be a positive number." }),
  effectiveFrom: z.string().min(1, { message: "Effective from date is required." }),
  effectiveTo: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ServiceCharge {
  chargeId: number
  chargeCode?: string
  name: string
}

interface Doctor {
  userId: number
  firstName: string
  lastName: string
}

interface SpecialistCharge {
  specialistChargeId?: number
  chargeId: number
  doctorId: number
  amount: number
  effectiveFrom: string
  effectiveTo?: string | null
  chargeName?: string
  doctorFirstName?: string
  doctorLastName?: string
}

interface AddSpecialistChargeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData: SpecialistCharge | null
}

export function AddSpecialistChargeForm({ open, onOpenChange, onSuccess, editData }: AddSpecialistChargeFormProps) {
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const isEditing = !!editData

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chargeId: 0,
      doctorId: 0,
      amount: 0,
      effectiveFrom: "",
      effectiveTo: "",
    },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load service charges and doctors
  useEffect(() => {
    if (open && isMounted) {
      loadServiceCharges()
      loadDoctors()
    }
  }, [open, isMounted])

  const loadServiceCharges = async () => {
    try {
      setLoadingCharges(true)
      const data = await serviceChargeApi.getAll("Active")
      setServiceCharges(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading service charges:", error)
      toast({
        title: "Error",
        description: "Failed to load service charges.",
        variant: "destructive",
      })
    } finally {
      setLoadingCharges(false)
    }
  }

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true)
      const data = await doctorsApi.getAll()
      setDoctors(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading doctors:", error)
      toast({
        title: "Error",
        description: "Failed to load doctors.",
        variant: "destructive",
      })
    } finally {
      setLoadingDoctors(false)
    }
  }

  useEffect(() => {
    if (open && isMounted) {
      if (editData) {
        form.reset()
        // Format dates for input fields (YYYY-MM-DD)
        const formatDate = (dateStr: string | null | undefined) => {
          if (!dateStr) return ""
          const date = new Date(dateStr)
          return date.toISOString().split("T")[0]
        }
        form.setValue("chargeId", editData.chargeId || 0)
        form.setValue("doctorId", editData.doctorId || 0)
        form.setValue("amount", editData.amount || 0)
        form.setValue("effectiveFrom", formatDate(editData.effectiveFrom))
        form.setValue("effectiveTo", formatDate(editData.effectiveTo))
      } else {
        form.reset({
          chargeId: 0,
          doctorId: 0,
          amount: 0,
          effectiveFrom: "",
          effectiveTo: "",
        })
      }
    }
  }, [open, editData, form, isMounted])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      const payload: any = {
        chargeId: data.chargeId,
        doctorId: data.doctorId,
        amount: data.amount,
        effectiveFrom: data.effectiveFrom,
      }

      if (data.effectiveTo) {
        payload.effectiveTo = data.effectiveTo
      }

      if (isEditing && editData?.specialistChargeId) {
        await specialistChargeApi.update(editData.specialistChargeId.toString(), payload)
        toast({
          title: "Success",
          description: "Specialist charge updated successfully.",
        })
      } else {
        await specialistChargeApi.create(payload)
        toast({
          title: "Success",
          description: "Specialist charge created successfully.",
        })
      }

      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving specialist charge:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save specialist charge.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Specialist Charge" : "Add New Specialist Charge"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the specialist charge details."
              : "Add a new specialist charge that adjusts fees for specific doctors and charges."}
          </DialogDescription>
        </DialogHeader>
        {isMounted && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="chargeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charge *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value && field.value > 0 ? field.value.toString() : undefined}
                        disabled={loadingCharges}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a charge" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingCharges ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading charges...</div>
                          ) : serviceCharges.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No charges available</div>
                          ) : (
                            serviceCharges.map((charge) => (
                              <SelectItem key={charge.chargeId} value={charge.chargeId.toString()}>
                                {charge.chargeCode ? `${charge.chargeCode} - ` : ""}{charge.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value && field.value > 0 ? field.value.toString() : undefined}
                        disabled={loadingDoctors}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingDoctors ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading doctors...</div>
                          ) : doctors.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No doctors available</div>
                          ) : (
                            doctors.map((doctor) => (
                              <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                                {doctor.firstName?.startsWith('Dr.') ? doctor.firstName : `Dr. ${doctor.firstName}`} {doctor.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (KES) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>The charge amount for this specialist</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective From *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Date when this charge becomes effective</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="effectiveTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective To</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>Date when this charge expires (leave empty for ongoing)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update" : "Add"} Specialist Charge
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

