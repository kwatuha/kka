"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"

const billSchema = z.object({
  patientId: z.string({
    required_error: "Patient is required.",
  }),
  billNumber: z.string().min(1, {
    message: "Bill number is required.",
  }),
  date: z.date({
    required_error: "Date is required.",
  }),
  paymentMethod: z.string({
    required_error: "Payment method is required.",
  }),
  items: z
    .array(
      z.object({
        description: z.string().min(1, {
          message: "Description is required.",
        }),
        quantity: z.string().min(1, {
          message: "Quantity is required.",
        }),
        unitPrice: z.string().min(1, {
          message: "Unit price is required.",
        }),
        amount: z.string().min(1, {
          message: "Amount is required.",
        }),
      }),
    )
    .min(1, {
      message: "At least one item is required.",
    }),
  subtotal: z.string().min(1, {
    message: "Subtotal is required.",
  }),
  discount: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().min(1, {
    message: "Total is required.",
  }),
  paymentStatus: z.enum(["Paid", "Pending", "Partial"]),
  amountPaid: z.string().optional(),
  notes: z.string().optional(),
})

type BillFormValues = z.infer<typeof billSchema>

const defaultValues: Partial<BillFormValues> = {
  patientId: "",
  billNumber: "",
  paymentMethod: "",
  items: [{ description: "", quantity: "1", unitPrice: "0", amount: "0" }],
  subtotal: "0",
  discount: "0",
  tax: "0",
  total: "0",
  paymentStatus: "Pending",
  amountPaid: "0",
  notes: "",
}

export function AddBillForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  function onSubmit(data: BillFormValues) {
    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      console.log(data)
      toast({
        title: "Bill created",
        description: `Bill ${data.billNumber} has been created.`,
      })
      setIsSubmitting(false)
      onOpenChange(false)
      form.reset()
    }, 1000)
  }

  // Calculate totals when items change
  const watchedItems = form.watch("items")
  const watchPaymentStatus = form.watch("paymentStatus")

  const calculateItemAmount = (quantity: string, unitPrice: string) => {
    const qty = Number.parseFloat(quantity) || 0
    const price = Number.parseFloat(unitPrice) || 0
    return (qty * price).toFixed(2)
  }

  const updateItemAmount = (index: number) => {
    const item = watchedItems[index]
    const amount = calculateItemAmount(item.quantity, item.unitPrice)
    form.setValue(`items.${index}.amount`, amount)
    updateTotals()
  }

  const updateTotals = () => {
    const subtotal = watchedItems.reduce((sum, item) => {
      return sum + (Number.parseFloat(item.amount) || 0)
    }, 0)

    form.setValue("subtotal", subtotal.toFixed(2))

    const discountAmount = Number.parseFloat(form.watch("discount")) || 0
    const taxAmount = Number.parseFloat(form.watch("tax")) || 0
    const total = subtotal - discountAmount + taxAmount
    form.setValue("total", total.toFixed(2))

    // If payment status is "Paid", set amountPaid to total
    if (watchPaymentStatus === "Paid") {
      form.setValue("amountPaid", total.toFixed(2))
    }
  }

  // Mock data for patients and payment methods
  const patients = [
    { id: "P-1001", name: "John Imbayi" },
    { id: "P-1002", name: "Sarah Lwikane" },
    { id: "P-1003", name: "Michael Imbunya" },
    { id: "P-1004", name: "Emily Kimani" },
    { id: "P-1005", name: "David Kimutai" },
  ]

  const paymentMethods = [
    { id: "PAY-1001", name: "Cash" },
    { id: "PAY-1002", name: "M-Pesa" },
    { id: "PAY-1003", name: "Credit Card" },
    { id: "PAY-1004", name: "Insurance" },
    { id: "PAY-1005", name: "Bank Transfer" },
  ]

  // Mock data for bill items
  const services = [
    { id: "SRV-1001", name: "Consultation", price: "5000" },
    { id: "SRV-1002", name: "Laboratory Test", price: "8000" },
    { id: "SRV-1003", name: "X-Ray", price: "12000" },
    { id: "SRV-1004", name: "Medication", price: "0" },
    { id: "SRV-1005", name: "Procedure", price: "0" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Bill</DialogTitle>
          <DialogDescription>Create a new patient bill.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
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
                name="billNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Number</FormLabel>
                    <FormControl>
                      <Input placeholder="BILL-2023-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Select date</span>}
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
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Bill Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: "1", unitPrice: "0", amount: "0" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">
                        Quantity
                      </th>
                      <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                        Unit Price
                      </th>
                      <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                        Amount
                      </th>
                      <th className="h-10 w-[50px] px-4 align-middle font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b">
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <Select
                                  onValueChange={(value) => {
                                    const service = services.find((s) => s.id === value)
                                    if (service) {
                                      field.onChange(service.name)
                                      form.setValue(`items.${index}.unitPrice`, service.price)
                                      updateItemAmount(index)
                                    }
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select service or enter description" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {services.map((service) => (
                                      <SelectItem key={service.id} value={service.id}>
                                        {service.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    className="text-right"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      updateItemAmount(index)
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="text-right"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      updateItemAmount(index)
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.amount`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input type="number" min="0" step="0.01" className="text-right" {...field} readOnly />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-2 text-center">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                remove(index)
                                updateTotals()
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div></div>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="subtotal"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Subtotal</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right w-[200px]"
                            {...field}
                            readOnly
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Discount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right w-[200px]"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              updateTotals()
                            }}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Tax</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right w-[200px]"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              updateTotals()
                            }}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel className="font-bold">Total</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right w-[200px] font-bold"
                            {...field}
                            readOnly
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value)
                        if (value === "Paid") {
                          form.setValue("amountPaid", form.getValues("total"))
                        } else if (value === "Pending") {
                          form.setValue("amountPaid", "0")
                        }
                      }}
                      defaultValue={field.value}
                      className="flex flex-row space-x-8"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Paid" />
                        </FormControl>
                        <FormLabel className="font-normal">Paid</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Pending" />
                        </FormControl>
                        <FormLabel className="font-normal">Pending</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Partial" />
                        </FormControl>
                        <FormLabel className="font-normal">Partial</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchPaymentStatus === "Partial" && (
              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Bill
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
