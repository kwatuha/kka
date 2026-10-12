"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { laboratoryApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const laboratoryUnitSchema = z.object({
  labCode: z.string().optional(),
  labName: z.string().min(1, "Laboratory name is required"),
  branchId: z.string().min(1, "Branch is required"),
  isDefault: z.boolean().default(false),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

type LaboratoryUnitFormValues = z.infer<typeof laboratoryUnitSchema>

interface LaboratoryUnitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
  branches: any[]
}

export function LaboratoryUnitForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  branches,
}: LaboratoryUnitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LaboratoryUnitFormValues>({
    resolver: zodResolver(laboratoryUnitSchema),
    defaultValues: {
      labCode: "",
      labName: "",
      branchId: "",
      isDefault: false,
      location: "",
      contactPerson: "",
      phone: "",
      email: "",
      isActive: true,
      notes: "",
    },
  })

  useEffect(() => {
    if (!open) return
    if (editData) {
      form.reset({
        labCode: editData.labCode || "",
        labName: editData.labName || "",
        branchId: editData.branchId?.toString() || "",
        isDefault: editData.isDefault === 1 || editData.isDefault === true,
        location: editData.location || "",
        contactPerson: editData.contactPerson || "",
        phone: editData.phone || "",
        email: editData.email || "",
        isActive: editData.isActive !== undefined ? (editData.isActive === 1 || editData.isActive === true) : true,
        notes: editData.notes || "",
      })
    } else {
      form.reset({
        labCode: "",
        labName: "",
        branchId: branches.length === 1 ? String(branches[0].branchId) : "",
        isDefault: false,
        location: "",
        contactPerson: "",
        phone: "",
        email: "",
        isActive: true,
        notes: "",
      })
    }
  }, [open, editData, branches, form])

  const onSubmit = async (values: LaboratoryUnitFormValues) => {
    try {
      setIsSubmitting(true)
      const payload = {
        labCode: values.labCode || undefined,
        labName: values.labName,
        branchId: parseInt(values.branchId, 10),
        isDefault: values.isDefault,
        location: values.location || null,
        contactPerson: values.contactPerson || null,
        phone: values.phone || null,
        email: values.email || null,
        isActive: values.isActive,
        notes: values.notes || null,
      }

      if (editData?.labId) {
        await laboratoryApi.updateLaboratory(String(editData.labId), payload)
        toast({ title: "Laboratory updated" })
      } else {
        await laboratoryApi.createLaboratory(payload)
        toast({ title: "Laboratory created" })
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save laboratory",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit laboratory" : "Add laboratory"}</DialogTitle>
          <DialogDescription>
            Configure a laboratory unit within a facility branch (e.g. main lab, hematology, microbiology).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility branch *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.branchId} value={String(branch.branchId)}>
                          {branch.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="labName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Laboratory" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="labCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="LAB-MAIN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Building A, Ground floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact person</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Default laboratory</FormLabel>
                    <FormDescription>
                      New lab orders for this branch default to this unit.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editData ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
