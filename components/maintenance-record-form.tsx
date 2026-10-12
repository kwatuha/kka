"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
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
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-context"

const maintenanceSchema = z.object({
  assetId: z.string().min(1, { message: "Asset is required." }),
  maintenanceType: z.string().min(1, { message: "Maintenance type is required." }),
  maintenanceDate: z.date({
    required_error: "Maintenance date is required.",
  }),
  scheduledDate: z.date().optional(),
  status: z.string().min(1, { message: "Status is required." }),
  description: z.string().optional(),
  workPerformed: z.string().optional(),
  cost: z.string().optional(),
  performedBy: z.string().optional(),
  serviceProvider: z.string().optional(),
  partsReplaced: z.string().optional(),
  nextMaintenanceDate: z.date().optional(),
  maintenanceIntervalDays: z.string().optional(),
  notes: z.string().optional(),
})

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>

interface MaintenanceRecordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  maintenance?: any
  assetId?: string
}

export function MaintenanceRecordForm({
  open,
  onOpenChange,
  onSuccess,
  maintenance,
  assetId: propAssetId,
}: MaintenanceRecordFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      assetId: propAssetId || "",
      maintenanceType: "repair",
      maintenanceDate: new Date(),
      scheduledDate: undefined,
      status: "scheduled",
      description: "",
      workPerformed: "",
      cost: "",
      performedBy: "",
      serviceProvider: "",
      partsReplaced: "",
      nextMaintenanceDate: undefined,
      maintenanceIntervalDays: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      loadFormData()
    }
  }, [open, maintenance])

  const loadFormData = async () => {
    try {
      // Load assets
      const assetsData = await assetApi.getAll()
      setAssets(assetsData || [])

      // Load staff (users) - you may need to create a users API endpoint
      // For now, we'll skip this or use a placeholder
      // const staffData = await usersApi.getAll()
      // setStaff(staffData || [])

      if (maintenance) {
        form.reset({
          assetId: maintenance.assetId?.toString() || "",
          maintenanceType: maintenance.maintenanceType || "repair",
          maintenanceDate: maintenance.maintenanceDate ? new Date(maintenance.maintenanceDate) : new Date(),
          scheduledDate: maintenance.scheduledDate ? new Date(maintenance.scheduledDate) : undefined,
          status: maintenance.status || "scheduled",
          description: maintenance.description || "",
          workPerformed: maintenance.workPerformed || "",
          cost: maintenance.cost?.toString() || "",
          performedBy: maintenance.performedBy?.toString() || "",
          serviceProvider: maintenance.serviceProvider || "",
          partsReplaced: maintenance.partsReplaced || "",
          nextMaintenanceDate: maintenance.nextMaintenanceDate ? new Date(maintenance.nextMaintenanceDate) : undefined,
          maintenanceIntervalDays: maintenance.maintenanceIntervalDays?.toString() || "",
          notes: maintenance.notes || "",
        })
      } else if (propAssetId) {
        form.reset({
          assetId: propAssetId,
          maintenanceType: "repair",
          maintenanceDate: new Date(),
          scheduledDate: undefined,
          status: "scheduled",
          description: "",
          workPerformed: "",
          cost: "",
          performedBy: "",
          serviceProvider: "",
          partsReplaced: "",
          nextMaintenanceDate: undefined,
          maintenanceIntervalDays: "",
          notes: "",
        })
      }
    } catch (error: any) {
      console.error("Error loading form data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load form data",
        variant: "destructive",
      })
    }
  }

  async function onSubmit(data: MaintenanceFormValues) {
    try {
      setIsSubmitting(true)

      const userId = user?.id ? parseInt(user.id) : undefined

      const payload: any = {
        assetId: parseInt(data.assetId),
        maintenanceType: data.maintenanceType,
        maintenanceDate: format(data.maintenanceDate, "yyyy-MM-dd"),
        scheduledDate: data.scheduledDate ? format(data.scheduledDate, "yyyy-MM-dd") : null,
        status: data.status,
        description: data.description || null,
        workPerformed: data.workPerformed || null,
        cost: data.cost ? parseFloat(data.cost) : 0,
        performedBy: data.performedBy ? parseInt(data.performedBy) : null,
        serviceProvider: data.serviceProvider || null,
        partsReplaced: data.partsReplaced || null,
        nextMaintenanceDate: data.nextMaintenanceDate ? format(data.nextMaintenanceDate, "yyyy-MM-dd") : null,
        maintenanceIntervalDays: data.maintenanceIntervalDays ? parseInt(data.maintenanceIntervalDays) : null,
        notes: data.notes || null,
        createdBy: userId,
      }

      if (maintenance) {
        await assetApi.updateMaintenance(maintenance.maintenanceId.toString(), payload)
        toast({
          title: "Success",
          description: "Maintenance record updated successfully",
        })
      } else {
        await assetApi.createMaintenance(payload)
        toast({
          title: "Success",
          description: "Maintenance record created successfully",
        })
      }

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving maintenance record:", error)
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to save maintenance record"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const maintenanceTypes = [
    { value: "scheduled", label: "Scheduled" },
    { value: "repair", label: "Repair" },
    { value: "inspection", label: "Inspection" },
    { value: "calibration", label: "Calibration" },
    { value: "cleaning", label: "Cleaning" },
    { value: "upgrade", label: "Upgrade" },
    { value: "other", label: "Other" },
  ]

  const statuses = [
    { value: "scheduled", label: "Scheduled" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "overdue", label: "Overdue" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{maintenance ? "Edit Maintenance Record" : "New Maintenance Record"}</DialogTitle>
          <DialogDescription>
            {maintenance
              ? "Update the maintenance record details. Click save when you're done."
              : "Create a new maintenance record for an asset. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!propAssetId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.assetId} value={asset.assetId.toString()}>
                          {asset.assetCode} - {asset.assetName}
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
                name="maintenanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "repair"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "scheduled"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="maintenanceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Maintenance Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Optional - for scheduled maintenance</FormDescription>
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
                    <Textarea placeholder="Brief description of the maintenance..." className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workPerformed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Performed</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed description of work performed..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormDescription>Optional - detailed work description</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Internal or external provider" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="partsReplaced"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parts Replaced</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List of parts replaced (comma-separated)..." className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nextMaintenanceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Maintenance Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Optional - for recurring maintenance</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceIntervalDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Interval (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="e.g., 90" {...field} />
                    </FormControl>
                    <FormDescription>Optional - days until next maintenance</FormDescription>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." className="min-h-[60px]" {...field} />
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
                {maintenance ? "Update Record" : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
