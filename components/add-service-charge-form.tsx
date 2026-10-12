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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { serviceChargeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  chargeCode: z.string().optional(),
  name: z.string().min(2, { message: "Service name must be at least 2 characters." }),
  category: z.string().optional(),
  department: z.string().optional(),
  cost: z.coerce.number().min(0, { message: "Cost must be a positive number." }),
  description: z.string().optional(),
  chargeType: z.string().optional(),
  duration: z.coerce.number().optional(),
  unit: z.string().optional(),
  status: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

// Sample data for dropdowns
const categories = [
  "Consultation",
  "Laboratory",
  "Radiology",
  "Inpatient",
  "Maternity",
  "Surgery",
  "Dental",
  "Rehabilitation",
  "Pharmacy",
  "Emergency",
  "Other",
]

const departments = [
  "Outpatient",
  "Laboratory",
  "Radiology",
  "Inpatient",
  "Maternity",
  "Surgery",
  "Dental",
  "Physiotherapy",
  "Pharmacy",
  "Emergency",
  "ICU",
  "Other",
]

const chargeTypes = [
  "Service",
  "Procedure",
  "Consumable",
  "Medication",
  "Other",
]

interface ServiceCharge {
  chargeId?: number
  chargeCode?: string
  name: string
  category?: string | null
  department?: string | null
  cost: number
  description?: string | null
  status?: string
  createdAt?: string
  updatedAt?: string
}

interface AddServiceChargeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData: ServiceCharge | null
}

export function AddServiceChargeForm({ open, onOpenChange, onSuccess, editData }: AddServiceChargeFormProps) {
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const isEditing = !!editData

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chargeCode: "",
      name: "",
      category: "",
      department: "",
      cost: 0,
      description: "",
      chargeType: "Service",
      duration: undefined,
      unit: "",
      status: true,
    },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && isMounted) {
      if (editData) {
        form.reset()
        // Use setValue to ensure all fields are properly set
        form.setValue("chargeCode", editData.chargeCode || "")
        form.setValue("name", editData.name || "")
        form.setValue("category", editData.category || "")
        form.setValue("department", editData.department || "")
        form.setValue("cost", editData.cost || 0)
        form.setValue("description", editData.description || "")
        form.setValue("chargeType", (editData as any).chargeType || "Service")
        form.setValue("duration", (editData as any).duration || undefined)
        form.setValue("unit", (editData as any).unit || "")
        form.setValue("status", editData.status === "Active" || true)
      } else {
        form.reset({
          chargeCode: "",
          name: "",
          category: "",
          department: "",
          cost: 0,
          description: "",
          chargeType: "Service",
          duration: undefined,
          unit: "",
          status: true,
        })
      }
    }
  }, [open, editData, form, isMounted])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      const payload: any = {
        name: data.name,
        cost: data.cost,
        description: data.description || null,
        status: data.status ? "Active" : "Inactive",
      }

      if (data.chargeCode) {
        payload.chargeCode = data.chargeCode
      }
      if (data.category) {
        payload.category = data.category
      }
      if (data.department) {
        payload.department = data.department
      }
      if (data.chargeType) {
        payload.chargeType = data.chargeType
      }
      if (data.duration) {
        payload.duration = data.duration
      }
      if (data.unit) {
        payload.unit = data.unit
      }

      if (isEditing && editData?.chargeId) {
        await serviceChargeApi.update(editData.chargeId.toString(), payload)
        toast({
          title: "Success",
          description: "Service charge updated successfully.",
        })
      } else {
        await serviceChargeApi.create(payload)
        toast({
          title: "Success",
          description: "Service charge created successfully.",
        })
      }

      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving service charge:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save service charge.",
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
          <DialogTitle>{isEditing ? "Edit Service Charge" : "Add New Service Charge"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this service charge."
              : "Add a new service charge to the hospital's pricing structure."}
          </DialogDescription>
        </DialogHeader>
        {isMounted && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="chargeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormDescription>Leave empty to auto-generate</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter service name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (KES) *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="100" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department} value={department}>
                            {department}
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
                name="chargeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "Service"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select charge type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {chargeTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Type of charge (Service, Procedure, Consumable, etc.)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Duration in minutes (for procedures)"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Duration in minutes (typically for procedures)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., per item, per box (for consumables)" {...field} />
                    </FormControl>
                    <FormDescription>Unit of measurement (for consumables)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter a description of the service" {...field} />
                  </FormControl>
                  <FormDescription>Provide a brief description of what this service includes.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Set whether this service charge is currently active and available for billing.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Add"} Service Charge
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
