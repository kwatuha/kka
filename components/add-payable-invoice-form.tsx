"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
import { formatDateLong } from "@/lib/date-utils"

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
import { toast } from "@/components/ui/use-toast"
import { payableApi } from "@/lib/api"

const invoiceSchema = z.object({
  vendorId: z.string({
    required_error: "Vendor is required.",
  }),
  invoiceNumber: z.string().min(1, {
    message: "Invoice number is required.",
  }),
  reference: z.string().optional(),
  invoiceDate: z.date({
    required_error: "Invoice date is required.",
  }),
  dueDate: z.date().optional(),
  totalAmount: z.coerce.number().min(0.01, {
    message: "Total amount must be greater than 0.",
  }),
  notes: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof invoiceSchema>

interface AddPayableInvoiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
  vendors?: any[]
}

export function AddPayableInvoiceForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  vendors = [],
}: AddPayableInvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const isEditing = !!editData

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorId: "",
      invoiceNumber: "",
      reference: "",
      invoiceDate: new Date(),
      dueDate: undefined,
      totalAmount: 0,
      notes: "",
    },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && isMounted) {
      if (editData) {
        // Reset form with edit data values
        form.reset({
          vendorId: editData.vendorId?.toString() || "",
          invoiceNumber: editData.invoiceNumber || "",
          reference: editData.purchaseOrderId?.toString() || "",
          invoiceDate: editData.invoiceDate ? new Date(editData.invoiceDate) : new Date(),
          dueDate: editData.dueDate ? new Date(editData.dueDate) : undefined,
          totalAmount: parseFloat(editData.totalAmount) || 0,
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          vendorId: "",
          invoiceNumber: "",
          reference: "",
          invoiceDate: new Date(),
          dueDate: undefined,
          totalAmount: 0,
          notes: "",
        })
      }
    }
  }, [open, editData, form, isMounted])

  async function onSubmit(data: InvoiceFormValues) {
    try {
      setIsSubmitting(true)

      // Validate vendorId
      if (!data.vendorId || data.vendorId.trim() === "") {
        toast({
          title: "Error",
          description: "Please select a vendor.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const payload: any = {
        vendorId: parseInt(data.vendorId),
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate.toISOString().split('T')[0],
        dueDate: data.dueDate ? data.dueDate.toISOString().split('T')[0] : null,
        totalAmount: data.totalAmount,
        notes: data.notes || null,
      }

      if (data.reference && data.reference.trim() !== "") {
        payload.purchaseOrderId = parseInt(data.reference)
      }

      if (isEditing && editData?.payableId) {
        await payableApi.update(editData.payableId.toString(), payload)
        toast({
          title: "Success",
          description: `Invoice ${data.invoiceNumber} has been updated.`,
        })
      } else {
        await payableApi.create(payload)
        toast({
          title: "Success",
          description: `Invoice ${data.invoiceNumber} has been created.`,
        })
      }

      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving payable invoice:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Vendor Invoice" : "New Vendor Invoice"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update invoice details." : "Record a new invoice from a vendor."}
          </DialogDescription>
        </DialogHeader>
        {isMounted && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor">
                              {field.value && vendors.find(v => v.vendorId.toString() === field.value)?.vendorName}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors
                            .filter((v) => v.status === "Active" || v.status === "active")
                            .map((vendor) => (
                              <SelectItem key={vendor.vendorId} value={vendor.vendorId.toString()}>
                                {vendor.vendorName}
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
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor's invoice number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Order ID</FormLabel>
                      <FormControl>
                        <Input placeholder="PO ID (optional)" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Invoice Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? formatDateLong(field.value.toISOString()) : <span>Select date</span>}
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? formatDateLong(field.value.toISOString()) : <span>Select date</span>}
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
              </div>

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (KES) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
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
                      <Textarea
                        placeholder="Additional notes or payment instructions"
                        className="min-h-[80px]"
                        {...field}
                      />
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
                  {isEditing ? "Update" : "Save"} Invoice
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
