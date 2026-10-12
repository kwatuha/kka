"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { purchaseOrderApi } from "@/lib/api"
import { cn } from "@/lib/utils"

const itemSchema = z.object({
  itemDescription: z.string().min(1, "Item description is required"),
  quantity: z.string().min(1, "Quantity is required").refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Quantity must be a positive number",
  }),
  unit: z.string().optional(),
  unitPrice: z.string().min(1, "Unit price is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Unit price must be a valid positive number",
  }),
  notes: z.string().optional(),
})

const purchaseOrderFormSchema = z.object({
  orderDate: z.date({
    required_error: "Order date is required.",
  }),
  expectedDeliveryDate: z.date().optional(),
  status: z.string().default("draft"),
  currency: z.string().default("KES"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
})

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>

interface VendorPurchaseOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  order?: any
  onSuccess: () => void
}

export function VendorPurchaseOrderForm({ open, onOpenChange, vendorId, order, onSuccess }: VendorPurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      orderDate: new Date(),
      expectedDeliveryDate: undefined,
      status: "draft",
      currency: "KES",
      notes: "",
      items: [{ itemDescription: "", quantity: "1", unit: "", unitPrice: "0", notes: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  useEffect(() => {
    if (order && open) {
      form.reset({
        orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
        status: order.status || "draft",
        currency: order.currency || "KES",
        notes: order.notes || "",
        items: order.items?.map((item: any) => ({
          itemDescription: item.itemDescription || "",
          quantity: item.quantity?.toString() || "1",
          unit: item.unit || "",
          unitPrice: item.unitPrice?.toString() || "0",
          notes: item.notes || "",
        })) || [{ itemDescription: "", quantity: "1", unit: "", unitPrice: "0", notes: "" }],
      })
    } else if (open) {
      form.reset({
        orderDate: new Date(),
        expectedDeliveryDate: undefined,
        status: "draft",
        currency: "KES",
        notes: "",
        items: [{ itemDescription: "", quantity: "1", unit: "", unitPrice: "0", notes: "" }],
      })
    }
  }, [order, open, form])

  const calculateItemTotal = (index: number) => {
    const items = form.watch("items")
    const item = items[index]
    if (item) {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unitPrice) || 0
      return qty * price
    }
    return 0
  }

  const calculateTotal = () => {
    const items = form.watch("items")
    return items.reduce((sum, _, index) => sum + calculateItemTotal(index), 0)
  }

  async function onSubmit(data: PurchaseOrderFormValues) {
    setIsSubmitting(true)
    try {
      const items = data.items.map((item) => ({
        itemDescription: item.itemDescription,
        quantity: parseInt(item.quantity),
        unit: item.unit || null,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseInt(item.quantity) * parseFloat(item.unitPrice),
        notes: item.notes || null,
      }))

      const subtotal = calculateTotal()
      const tax = 0 // Can be calculated if needed
      const totalAmount = subtotal + tax

      const payload = {
        vendorId: parseInt(vendorId),
        orderDate: format(data.orderDate, "yyyy-MM-dd"),
        expectedDeliveryDate: data.expectedDeliveryDate ? format(data.expectedDeliveryDate, "yyyy-MM-dd") : null,
        status: data.status,
        subtotal,
        tax,
        totalAmount,
        currency: data.currency,
        notes: data.notes || null,
        createdBy: 1, // TODO: Get from auth context
        items,
      }

      if (order) {
        await purchaseOrderApi.update(order.purchaseOrderId.toString(), payload)
        toast({
          title: "Success",
          description: "Purchase order updated successfully",
        })
      } else {
        await purchaseOrderApi.create(payload)
        toast({
          title: "Success",
          description: "Purchase order created successfully",
        })
      }

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save purchase order",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle>
          <DialogDescription>
            {order ? "Update purchase order information" : "Create a new purchase order for this vendor"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Order Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("orderDate") || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="acknowledged">Acknowledged</SelectItem>
                          <SelectItem value="partial_received">Partial Received</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="KES">KES</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <FormLabel>Order Items *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemDescription: "", quantity: "1", unit: "", unitPrice: "0", notes: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Description</TableHead>
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="w-[100px]">Unit</TableHead>
                      <TableHead className="w-[120px]">Unit Price</TableHead>
                      <TableHead className="w-[120px]">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.itemDescription`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Item description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="1"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      form.trigger(`items.${index}.unitPrice`)
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Unit" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      form.trigger(`items.${index}.quantity`)
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {form.watch("currency")} {calculateItemTotal(index).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-2">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Subtotal:</div>
                  <div className="text-lg font-semibold">
                    {form.watch("currency")} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" {...field} />
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
                {order ? "Update" : "Create"} Order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}



