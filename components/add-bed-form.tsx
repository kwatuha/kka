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

const bedSchema = z.object({
  bedNumber: z.string().min(1, { message: "Bed number is required" }),
  bedType: z.string().min(1, { message: "Bed type is required" }),
  status: z.string().min(1, { message: "Status is required" }),
  equipmentList: z.string().optional(),
})

interface AddBedFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  bed?: any
}

export function AddBedForm({ open, onOpenChange, onSuccess, bed }: AddBedFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const isEditing = !!bed

  const form = useForm({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      bedNumber: "",
      bedType: "standard",
      status: "available",
      equipmentList: "",
    },
  })

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Set form values when editing
  useEffect(() => {
    if (open && isMounted) {
      if (bed) {
        form.reset({
          bedNumber: bed.bedNumber || "",
          bedType: bed.bedType || "standard",
          status: bed.status || "available",
          equipmentList: bed.equipmentList || "",
        })
      } else {
        form.reset({
          bedNumber: "",
          bedType: "standard",
          status: "available",
          equipmentList: "",
        })
      }
    } else if (!open) {
      form.reset({
        bedNumber: "",
        bedType: "standard",
        status: "available",
        equipmentList: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bed, open, isMounted])

  const onSubmit = async (values: z.infer<typeof bedSchema>) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const payload = {
        bedNumber: values.bedNumber,
        bedType: values.bedType,
        status: values.status,
        equipmentList: values.equipmentList || null,
      }

      if (isEditing) {
        await icuApi.updateBed(bed.icuBedId.toString(), payload)
        toast({
          title: "Bed updated",
          description: "The ICU bed has been updated successfully.",
        })
      } else {
        await icuApi.createBed(payload)
        toast({
          title: "Bed created",
          description: "The ICU bed has been created successfully.",
        })
      }

      form.reset()
      onOpenChange?.(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Error saving bed:", error)
      const errorMessage = error.message || error.response?.message || "Failed to save bed"
      setError(errorMessage)
      toast({
        title: isEditing ? "Error updating bed" : "Error creating bed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit ICU Bed" : "Add New ICU Bed"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the ICU bed details below."
              : "Create a new ICU bed with equipment information."}
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
              name="bedNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ICU-01" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bed type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="isolation">Isolation</SelectItem>
                        <SelectItem value="burns">Burns</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipmentList"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment List (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Ventilator, Cardiac Monitor, Infusion Pump"
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
                  isEditing ? "Update Bed" : "Create Bed"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

