"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cashApi, userApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const transactionFormSchema = z.object({
  transactionDate: z.date({
    required_error: "Date is required.",
  }),
  transactionType: z.enum(["receipt", "payment", "transfer", "adjustment"], {
    required_error: "Transaction type is required.",
  }),
  amount: z.coerce.number().min(0.01, {
    message: "Amount must be greater than 0.",
  }),
  referenceNumber: z.string().optional(),
  referenceType: z.string().optional(),
  cashRegister: z.string().optional(),
  handledBy: z.string().min(1, {
    message: "Handled by is required.",
  }),
  notes: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

interface AddTransactionFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function AddTransactionForm({ open, setOpen, onSuccess, editData }: AddTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionDate: new Date(),
      transactionType: "receipt",
      amount: 0,
      referenceNumber: "",
      referenceType: "",
      cashRegister: "",
      handledBy: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      loadUsers()
      if (editData) {
        // Populate form with edit data
        form.reset({
          transactionDate: editData.transactionDate ? new Date(editData.transactionDate) : new Date(),
          transactionType: editData.transactionType || "receipt",
          amount: parseFloat(editData.amount || 0),
          referenceNumber: editData.referenceNumber || "",
          referenceType: editData.referenceType || "",
          cashRegister: editData.cashRegister || "",
          handledBy: editData.handledBy?.toString() || "",
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          transactionDate: new Date(),
          transactionType: "receipt",
          amount: 0,
          referenceNumber: "",
          referenceType: "",
          cashRegister: "",
          handledBy: "",
          notes: "",
        })
      }
    }
  }, [open, editData, form])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const data = await userApi.getAll()
      setUsers(data || [])
    } catch (error: any) {
      console.error("Error loading users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  async function onSubmit(data: TransactionFormValues) {
    try {
      setIsSubmitting(true)

      const payload = {
        transactionDate: format(data.transactionDate, "yyyy-MM-dd"),
        transactionType: data.transactionType,
        amount: data.amount,
        referenceNumber: data.referenceNumber || undefined,
        referenceType: data.referenceType || undefined,
        cashRegister: data.cashRegister || undefined,
        handledBy: parseInt(data.handledBy),
        notes: data.notes || undefined,
      }

      if (editData) {
        await cashApi.updateTransaction(editData.cashTransactionId.toString(), payload)
        toast({
          title: "Success",
          description: "Transaction updated successfully",
        })
      } else {
        await cashApi.createTransaction(payload)
        toast({
          title: "Success",
          description: "Transaction created successfully",
        })
      }

      setOpen(false)
      form.reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving transaction:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save transaction",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Transaction" : "Record New Transaction"}</DialogTitle>
          <DialogDescription>Record a new cash transaction. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
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
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="receipt">Receipt (Income)</SelectItem>
                        <SelectItem value="payment">Payment (Expense)</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cashRegister"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Register</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Cash Register" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="handledBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handled By *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={loadingUsers}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingUsers ? "Loading..." : "Select user"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.userId} value={user.userId.toString()}>
                            {user.firstName} {user.lastName}
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
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., INV-2023-1001" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="purchase_order">Purchase Order</SelectItem>
                        <SelectItem value="claim">Claim</SelectItem>
                        <SelectItem value="payroll">Payroll</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Optional</FormDescription>
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
                    <Textarea placeholder="Enter transaction description or notes" className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editData ? "Update Transaction" : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
