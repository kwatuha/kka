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
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const assetSchema = z.object({
  assetName: z.string().min(1, {
    message: "Asset name is required.",
  }),
  category: z.string().optional(),
  assetType: z.string().optional(),
  purchaseDate: z.date().optional(),
  purchaseCost: z.string().min(1, {
    message: "Purchase cost is required.",
  }),
  currentValue: z.string().optional(),
  depreciationMethod: z.string().optional(),
  depreciationRate: z.string().optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  status: z.string().optional(),
  isCritical: z.boolean().optional(),
  notes: z.string().optional(),
})

type AssetFormValues = z.infer<typeof assetSchema>

interface AddAssetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function AddAssetForm({ open, onOpenChange, onSuccess, editData }: AddAssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetName: "",
      category: "",
      assetType: "",
      purchaseCost: "",
      currentValue: "",
      depreciationMethod: "Straight-line",
      depreciationRate: "",
      location: "",
      serialNumber: "",
      manufacturer: "",
      model: "",
      status: "active",
      isCritical: false,
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (editData) {
        // Populate form with edit data
        form.reset({
          assetName: editData.assetName || "",
          category: editData.category || "",
          assetType: editData.assetType || "",
          purchaseDate: editData.purchaseDate ? new Date(editData.purchaseDate) : undefined,
          purchaseCost: editData.purchaseCost?.toString() || "",
          currentValue: editData.currentValue?.toString() || "",
          depreciationMethod: editData.depreciationMethod || "Straight-line",
          depreciationRate: editData.depreciationRate?.toString() || "",
          location: editData.location || "",
          serialNumber: editData.serialNumber || "",
          manufacturer: editData.manufacturer || "",
          model: editData.model || "",
          status: editData.status || "active",
          isCritical: editData.isCritical || false,
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          assetName: "",
          category: "",
          assetType: "",
          purchaseDate: undefined,
          purchaseCost: "",
          currentValue: "",
          depreciationMethod: "Straight-line",
          depreciationRate: "",
          location: "",
          serialNumber: "",
          manufacturer: "",
          model: "",
          status: "active",
          isCritical: false,
          notes: "",
        })
      }
    }
  }, [open, editData, form])

  async function onSubmit(data: AssetFormValues) {
    try {
      setIsSubmitting(true)

      const payload: any = {
        assetName: data.assetName,
        category: data.category || undefined,
        assetType: data.assetType || undefined,
        purchaseDate: data.purchaseDate ? format(data.purchaseDate, "yyyy-MM-dd") : undefined,
        purchaseCost: parseFloat(data.purchaseCost),
        currentValue: data.currentValue ? parseFloat(data.currentValue) : undefined,
        depreciationMethod: data.depreciationMethod || undefined,
        depreciationRate: data.depreciationRate ? parseFloat(data.depreciationRate) : undefined,
        location: data.location || undefined,
        serialNumber: data.serialNumber || undefined,
        manufacturer: data.manufacturer || undefined,
        model: data.model || undefined,
        status: data.status || "active",
        isCritical: data.isCritical || false,
        notes: data.notes || undefined,
      }

      if (editData) {
        await assetApi.update(editData.assetId.toString(), payload)
        toast({
          title: "Success",
          description: "Asset updated successfully",
        })
      } else {
        await assetApi.create(payload)
        toast({
          title: "Success",
          description: "Asset created successfully",
        })
      }

      onOpenChange(false)
      form.reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving asset:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save asset",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Categories for assets
  const categories = ["Equipment", "Furniture", "Vehicle", "Building", "IT Equipment"]

  const statuses = [
    { value: "active", label: "Active" },
    { value: "disposed", label: "Disposed" },
    { value: "maintenance", label: "Maintenance" },
    { value: "retired", label: "Retired" },
  ]

  const depreciationMethods = ["Straight-line", "Declining balance", "Sum of years digits", "Units of production"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {editData ? "Update asset information" : "Add a new asset to the registry"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MRI Machine" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
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
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Medical Imaging" {...field} />
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
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Purchase Date</FormLabel>
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
                    <FormDescription>Optional</FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
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
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Cost (KES) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Optional - defaults to purchase cost</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="depreciationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depreciation Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "Straight-line"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {depreciationMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depreciationRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depreciation Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
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
                    <Input placeholder="e.g. Radiology Department" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. XR-2023-001" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Siemens Healthcare" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Multix Fusion Max" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isCritical"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Critical Asset</FormLabel>
                    <FormDescription>
                      Mark this asset as critical. Critical assets require daily presence verification before hospital close.
                    </FormDescription>
                  </div>
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
                    <Textarea placeholder="Additional notes about the asset" className="min-h-[80px]" {...field} />
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
                {editData ? "Update Asset" : "Create Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
