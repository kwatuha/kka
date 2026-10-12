"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { servicePointApi } from "@/lib/api"
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

const POINT_TYPES = [
  "registration",
  "triage",
  "consultation",
  "cashier",
  "pharmacy",
  "laboratory",
  "radiology",
  "billing",
  "telemedicine",
  "procedure",
] as const

const servicePointSchema = z.object({
  pointCode: z.string().optional(),
  pointName: z.string().min(1, "Name is required"),
  branchId: z.string().min(1, "Branch is required"),
  pointType: z.string().min(1, "Type is required"),
  isDefault: z.boolean().default(false),
  location: z.string().optional(),
  notes: z.string().optional(),
})

type ServicePointFormValues = z.infer<typeof servicePointSchema>

interface ServicePointFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
  branches: any[]
}

export function ServicePointForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  branches,
}: ServicePointFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ServicePointFormValues>({
    resolver: zodResolver(servicePointSchema),
    defaultValues: {
      pointCode: "",
      pointName: "",
      branchId: "",
      pointType: "registration",
      isDefault: false,
      location: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (editData) {
      form.reset({
        pointCode: editData.pointCode || "",
        pointName: editData.pointName || "",
        branchId: String(editData.branchId || ""),
        pointType: editData.pointType || "registration",
        isDefault: Boolean(editData.isDefault),
        location: editData.location || "",
        notes: editData.notes || "",
      })
    } else {
      form.reset({
        pointCode: "",
        pointName: "",
        branchId: branches[0] ? String(branches[0].branchId) : "",
        pointType: "registration",
        isDefault: false,
        location: "",
        notes: "",
      })
    }
  }, [editData, branches, form, open])

  const onSubmit = async (values: ServicePointFormValues) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...values,
        branchId: Number(values.branchId),
        pointCode: values.pointCode || undefined,
      }
      if (editData?.servicePointId) {
        await servicePointApi.update(String(editData.servicePointId), payload)
        toast({ title: "Service point updated" })
      } else {
        if (!payload.pointCode) {
          const branch = branches.find((b) => String(b.branchId) === values.branchId)
          const suffix = values.pointType.slice(0, 3).toUpperCase()
          payload.pointCode = `${(branch?.branchCode || "BR").toUpperCase()}-${suffix}-${Date.now().toString().slice(-4)}`
        }
        await servicePointApi.create(payload)
        toast({ title: "Service point created" })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not save service point",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit service point" : "Add service point"}</DialogTitle>
          <DialogDescription>
            Registration desks, triage bays, cashier windows, and other queue stations per branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pointName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main registration desk" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
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
              <FormField
                control={form.control}
                name="pointType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Queue type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POINT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
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
              name="pointCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-generated if empty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Ground floor, Block A" {...field} />
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
                  <FormLabel>Default for this queue type at branch</FormLabel>
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
                {isSubmitting ? "Saving…" : editData ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
