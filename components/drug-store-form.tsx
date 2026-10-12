"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { pharmacyApi } from "@/lib/api"
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

const drugStoreSchema = z.object({
  storeCode: z.string().optional(),
  storeName: z.string().min(1, "Store name is required"),
  branchId: z.string().min(1, "Branch is required"),
  isDispensingStore: z.boolean().default(false),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

type DrugStoreFormValues = z.infer<typeof drugStoreSchema>

interface DrugStoreFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
  branches: any[]
}

export function DrugStoreForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  branches,
}: DrugStoreFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<DrugStoreFormValues>({
    resolver: zodResolver(drugStoreSchema),
    defaultValues: {
      storeCode: "",
      storeName: "",
      branchId: "",
      isDispensingStore: false,
      location: "",
      contactPerson: "",
      phone: "",
      email: "",
      isActive: true,
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (editData) {
        console.log('DrugStoreForm: Setting edit data', editData)
        form.reset({
          storeCode: editData.storeCode || "",
          storeName: editData.storeName || "",
          branchId: editData.branchId?.toString() || "",
          isDispensingStore: editData.isDispensingStore === 1 || editData.isDispensingStore === true,
          location: editData.location || "",
          contactPerson: editData.contactPerson || "",
          phone: editData.phone || "",
          email: editData.email || "",
          isActive: editData.isActive !== undefined ? (editData.isActive === 1 || editData.isActive === true) : true,
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          storeCode: "",
          storeName: "",
          branchId: "",
          isDispensingStore: false,
          location: "",
          contactPerson: "",
          phone: "",
          email: "",
          isActive: true,
          notes: "",
        })
      }
    }
  }, [open, editData, form])

  async function onSubmit(data: DrugStoreFormValues) {
    try {
      setIsSubmitting(true)

      const payload: any = {
        storeName: data.storeName,
        branchId: parseInt(data.branchId),
        isDispensingStore: data.isDispensingStore,
        location: data.location || undefined,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        isActive: data.isActive,
        notes: data.notes || undefined,
      }

      if (data.storeCode) {
        payload.storeCode = data.storeCode
      }

      console.log('DrugStoreForm: Submitting', { editData, payload, isEdit: !!editData })

      if (editData && editData.storeId) {
        console.log('DrugStoreForm: Updating store', editData.storeId)
        await pharmacyApi.updateDrugStore(editData.storeId.toString(), payload)
        toast({
          title: "Success",
          description: "Drug store updated successfully",
        })
      } else {
        console.log('DrugStoreForm: Creating new store')
        await pharmacyApi.createDrugStore(payload)
        toast({
          title: "Success",
          description: "Drug store created successfully",
        })
      }

      onOpenChange(false)
      form.reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving drug store:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save drug store",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Drug Store" : "Add New Drug Store"}</DialogTitle>
          <DialogDescription>
            {editData
              ? "Update drug store information"
              : "Register a new drug store/location within a branch"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="storeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormDescription>Optional - will be auto-generated if not provided</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Pharmacy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.branchId} value={branch.branchId.toString()}>
                          {branch.branchName}
                          {branch.isMainBranch && " (Main)"}
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Physical location/address within branch" {...field} />
                  </FormControl>
                  <FormDescription>Physical location or address of the store within the branch</FormDescription>
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
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
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
                      <Input placeholder="e.g., +254 712 345 678" {...field} />
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
                    <Input type="email" placeholder="e.g., store@hospital.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isDispensingStore"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Dispensing Store</FormLabel>
                      <FormDescription>
                        Set as the dispensing store for this branch. Only one store per branch can be the dispensing store.
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Set whether this store is active or inactive.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                    <Textarea placeholder="Additional notes" {...field} rows={3} />
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
                {isSubmitting ? "Saving..." : editData ? "Update Store" : "Create Store"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

