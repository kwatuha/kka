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
import { inventoryApi } from "@/lib/api"
import { Loader2 } from "lucide-react"

const inventoryFormSchema = z.object({
  itemCode: z.string().optional(),
  name: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  category: z.string({
    required_error: "Please select a category.",
  }),
  unit: z.string().optional(),
  quantity: z.coerce.number().min(0, {
    message: "Quantity cannot be negative.",
  }),
  reorderLevel: z.coerce.number().min(0, {
    message: "Reorder level cannot be negative.",
  }),
  unitPrice: z.coerce.number().min(0, {
    message: "Unit price cannot be negative.",
  }),
  supplier: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  location: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Expired"]).default("Active"),
})

type InventoryFormValues = z.infer<typeof inventoryFormSchema>

interface InventoryItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: any
  onSuccess: () => void
}

const categories = [
  "Medical Supplies",
  "Pharmaceuticals",
  "Equipment",
  "PPE",
  "Furniture",
  "Hygiene Products",
  "Office Supplies",
  "Laboratory Supplies",
  "Radiology Supplies",
  "Surgical Instruments",
]

export function InventoryItemForm({ open, onOpenChange, item, onSuccess }: InventoryItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      itemCode: "",
      name: "",
      category: "",
      unit: "",
      quantity: 0,
      reorderLevel: 0,
      unitPrice: 0,
      supplier: "",
      expiryDate: null,
      location: "",
      description: "",
      status: "Active",
    },
  })

  useEffect(() => {
    if (!open) return

    if (item) {
      // Handle both API item structure and transformed item structure
      const itemData = item.itemId ? item : item // If it has itemId, it's from API directly
      form.reset({
        itemCode: itemData.itemCode || "",
        name: itemData.name || "",
        category: itemData.category || "",
        unit: itemData.unit || "",
        quantity: itemData.quantity || itemData.currentStock || 0,
        reorderLevel: itemData.reorderLevel || itemData.minStock || 0,
        unitPrice: parseFloat(itemData.unitPrice || 0),
        supplier: itemData.supplier || "",
        expiryDate: itemData.expiryDate && itemData.expiryDate !== "N/A" 
          ? new Date(itemData.expiryDate).toISOString().split('T')[0] 
          : null,
        location: itemData.location || "",
        description: itemData.description || "",
        status: itemData.status || "Active",
      })
    } else {
      form.reset({
        itemCode: "",
        name: "",
        category: "",
        unit: "",
        quantity: 0,
        reorderLevel: 0,
        unitPrice: 0,
        supplier: "",
        expiryDate: null,
        location: "",
        description: "",
        status: "Active",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, open])

  async function onSubmit(data: InventoryFormValues) {
    setIsSubmitting(true)
    try {
      const payload = {
        itemCode: data.itemCode || null,
        name: data.name,
        category: data.category,
        unit: data.unit || null,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        unitPrice: data.unitPrice,
        supplier: data.supplier || null,
        expiryDate: data.expiryDate || null,
        location: data.location || null,
        description: data.description || null,
        status: data.status,
      }

      if (item) {
        await inventoryApi.update(item.itemId.toString(), payload)
        toast({
          title: "Success",
          description: "Inventory item updated successfully.",
        })
      } else {
        await inventoryApi.create(payload)
        toast({
          title: "Success",
          description: "Inventory item created successfully.",
        })
      }

      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      console.error("Error saving inventory item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save inventory item.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
          <DialogDescription>
            {item ? "Update the inventory item details below." : "Add a new inventory item to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="itemCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Surgical Gloves (Medium)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Box, Unit, Pack" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier name" {...field} />
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
                      <Input placeholder="e.g., Main Storage A1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Textarea placeholder="Item description" {...field} />
                  </FormControl>
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
                {item ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

