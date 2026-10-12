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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { icuApi } from "@/lib/api"
import { Loader2 } from "lucide-react"

const equipmentSchema = z.object({
  equipmentName: z.string().min(1, { message: "Equipment name is required" }),
  equipmentType: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.string().min(1, { message: "Status is required" }),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  notes: z.string().optional(),
})

interface AddEquipmentFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  equipment?: any
}

export function AddEquipmentForm({ open, onOpenChange, onSuccess, equipment }: AddEquipmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const isEditing = !!equipment

  const form = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      equipmentName: "",
      equipmentType: "",
      serialNumber: "",
      status: "available",
      lastMaintenanceDate: "",
      nextMaintenanceDate: "",
      notes: "",
    },
  })

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Set form values when editing (dates set client-side only)
  useEffect(() => {
    if (open && isMounted) {
      if (equipment) {
        // Set dates client-side only to avoid hydration mismatch
        const lastMaintenance = equipment.lastMaintenanceDate
          ? new Date(equipment.lastMaintenanceDate).toISOString().split("T")[0]
          : ""
        const nextMaintenance = equipment.nextMaintenanceDate
          ? new Date(equipment.nextMaintenanceDate).toISOString().split("T")[0]
          : ""
        
        form.reset({
          equipmentName: equipment.equipmentName || "",
          equipmentType: equipment.equipmentType || "",
          serialNumber: equipment.serialNumber || "",
          status: equipment.status || "available",
          lastMaintenanceDate: lastMaintenance,
          nextMaintenanceDate: nextMaintenance,
          notes: equipment.notes || "",
        })
      } else {
        form.reset({
          equipmentName: "",
          equipmentType: "",
          serialNumber: "",
          status: "available",
          lastMaintenanceDate: "",
          nextMaintenanceDate: "",
          notes: "",
        })
      }
    } else if (!open) {
      form.reset({
        equipmentName: "",
        equipmentType: "",
        serialNumber: "",
        status: "available",
        lastMaintenanceDate: "",
        nextMaintenanceDate: "",
        notes: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment, open, isMounted])

  const onSubmit = async (values: z.infer<typeof equipmentSchema>) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const payload = {
        equipmentName: values.equipmentName,
        equipmentType: values.equipmentType || null,
        serialNumber: values.serialNumber || null,
        status: values.status,
        lastMaintenanceDate: values.lastMaintenanceDate || null,
        nextMaintenanceDate: values.nextMaintenanceDate || null,
        notes: values.notes || null,
      }

      if (isEditing) {
        await icuApi.updateEquipment(equipment.equipmentId.toString(), payload)
        toast({
          title: "Equipment updated",
          description: "The ICU equipment has been updated successfully.",
        })
      } else {
        await icuApi.createEquipment(payload)
        toast({
          title: "Equipment created",
          description: "The ICU equipment has been created successfully.",
        })
      }

      form.reset()
      onOpenChange?.(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Error saving equipment:", error)
      const errorMessage = error.message || error.response?.message || "Failed to save equipment"
      setError(errorMessage)
      toast({
        title: isEditing ? "Error updating equipment" : "Error creating equipment",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit ICU Equipment" : "Add New ICU Equipment"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the ICU equipment details below."
              : "Add a new piece of ICU equipment to the system."}
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
              name="equipmentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ventilator Model XYZ" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="equipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Type (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Ventilator, Monitor" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SN123456" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastMaintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Maintenance Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextMaintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Maintenance Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the equipment"
                      {...field}
                      disabled={isSubmitting}
                      rows={3}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditing ? "Update Equipment" : "Create Equipment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

