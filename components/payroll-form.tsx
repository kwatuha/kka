"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { employeeApi, payrollApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Calculator, ExternalLink, Loader2 } from "lucide-react"

const formSchema = z.object({
  salaryId: z.string().min(1, "Salary record is required"),
  payPeriodStart: z.string().min(1, "Pay period start is required"),
  payPeriodEnd: z.string().min(1, "Pay period end is required"),
  baseSalary: z.coerce.number().positive("Base salary must be positive"),
  allowances: z.coerce.number().min(0).default(0),
  overtime: z.coerce.number().min(0).default(0),
  bonuses: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  nhif: z.coerce.number().min(0).default(0),
  nssf: z.coerce.number().min(0).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PayrollFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  employeeId: string
  salaryId?: number
  payroll?: any
}

export function PayrollForm({ open, onOpenChange, onSuccess, employeeId, salaryId, payroll }: PayrollFormProps) {
  const [loading, setLoading] = useState(false)
  const [salary, setSalary] = useState<any>(null)
  const isEditing = !!payroll

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salaryId: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      baseSalary: 0,
      allowances: 0,
      overtime: 0,
      bonuses: 0,
      deductions: 0,
      tax: 0,
      nhif: 0,
      nssf: 0,
      otherDeductions: 0,
      paymentDate: "",
      paymentMethod: "Bank Transfer",
      referenceNumber: "",
      notes: "",
    },
  })

  useEffect(() => {
    const loadSalary = async () => {
      if (employeeId && open) {
        try {
          const salaryData = await employeeApi.getSalary(employeeId)
          setSalary(salaryData)
          if (salaryData) {
            form.setValue("salaryId", salaryData.salaryId.toString())
            form.setValue("baseSalary", salaryData.baseSalary || 0)
            form.setValue("allowances", salaryData.allowances || 0)
            form.setValue("deductions", salaryData.deductions || 0)
          }
        } catch (error) {
          console.error("Error loading salary:", error)
        }
      }
    }
    loadSalary()
  }, [employeeId, open, form])

  useEffect(() => {
    if (payroll && open) {
      form.reset({
        salaryId: payroll.salaryId?.toString() || "",
        payPeriodStart: payroll.payPeriodStart ? payroll.payPeriodStart.split("T")[0] : "",
        payPeriodEnd: payroll.payPeriodEnd ? payroll.payPeriodEnd.split("T")[0] : "",
        baseSalary: payroll.baseSalary || 0,
        allowances: payroll.allowances || 0,
        overtime: payroll.overtime || 0,
        bonuses: payroll.bonuses || 0,
        deductions: payroll.deductions || 0,
        tax: payroll.tax || 0,
        nhif: payroll.nhif || 0,
        nssf: payroll.nssf || 0,
        otherDeductions: payroll.otherDeductions || 0,
        paymentDate: payroll.paymentDate ? payroll.paymentDate.split("T")[0] : "",
        paymentMethod: payroll.paymentMethod || "Bank Transfer",
        referenceNumber: payroll.referenceNumber || "",
        notes: payroll.notes || "",
      })
    } else if (!payroll && open && salary) {
      // Set default dates for new payroll
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      form.reset({
        salaryId: salary.salaryId.toString(),
        payPeriodStart: firstDay.toISOString().split("T")[0],
        payPeriodEnd: lastDay.toISOString().split("T")[0],
        baseSalary: salary.baseSalary || 0,
        allowances: salary.allowances || 0,
        paymentDate: today.toISOString().split("T")[0],
      })
    }
  }, [payroll, open, salary, form])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      if (isEditing) {
        await employeeApi.updatePayroll(payroll.payrollId.toString(), data)
        toast({
          title: "Success",
          description: "Payroll updated successfully.",
        })
      } else {
        await employeeApi.createPayroll(employeeId, data)
        toast({
          title: "Success",
          description: "Payroll transaction created successfully.",
        })
      }
      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving payroll:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save payroll.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const baseSalary = form.watch("baseSalary") || 0
  const allowances = form.watch("allowances") || 0
  const overtime = form.watch("overtime") || 0
  const bonuses = form.watch("bonuses") || 0
  const deductions = form.watch("deductions") || 0
  const tax = form.watch("tax") || 0
  const nhif = form.watch("nhif") || 0
  const nssf = form.watch("nssf") || 0
  const otherDeductions = form.watch("otherDeductions") || 0

  const grossSalary = baseSalary + allowances + overtime + bonuses
  const totalDeductions = deductions + tax + nhif + nssf + otherDeductions
  const netSalary = grossSalary - totalDeductions

  const applyKenyaStatutory = async () => {
    if (grossSalary <= 0) {
      toast({
        title: "Enter gross pay first",
        description: "Set base salary, allowances, overtime, or bonuses before calculating deductions.",
        variant: "destructive",
      })
      return
    }
    try {
      setLoading(true)
      const payPeriodEnd = form.getValues("payPeriodEnd")
      const result = await payrollApi.statutoryPreview(grossSalary, payPeriodEnd || undefined)
      form.setValue("tax", result.paye, { shouldDirty: true })
      form.setValue("nhif", result.shif, { shouldDirty: true })
      form.setValue("nssf", result.nssfEmployee, { shouldDirty: true })
      form.setValue("otherDeductions", result.housingLevyEmployee, { shouldDirty: true })
      toast({
        title: "Statutory deductions applied",
        description: `PAYE KES ${result.paye.toLocaleString()}, SHA ${result.shif.toLocaleString()}, NSSF ${result.nssfEmployee.toLocaleString()}, housing levy ${result.housingLevyEmployee.toLocaleString()}. ${result.rateSetLabel}.`,
      })
    } catch (error: any) {
      toast({
        title: "Could not calculate statutory",
        description: error.message || "Check payroll tax tables and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payroll" : "Create Payroll Transaction"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update payroll transaction details." : "Create a new payroll transaction for this employee."}{" "}
            <a
              href="https://ecitizen.kra.go.ke/calculators/tax-calculators"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
            >
              KRA tax calculators
              <ExternalLink className="h-3 w-3" />
            </a>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Period Start *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Period End *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Salary (KES) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowances (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overtime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overtime (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bonuses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bonuses (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Use auto-calculate for PAYE, SHA (SHIF), NSSF, and housing levy — then adjust if needed.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={applyKenyaStatutory}>
                <Calculator className="mr-2 h-4 w-4" />
                Auto-calculate statutory
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="deductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deductions (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nhif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SHA (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nssf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NSSF (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otherDeductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other / housing levy (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Gross Salary:</span>
                <span className="font-bold">KES {grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Deductions:</span>
                <span className="font-bold text-destructive">KES {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold text-lg">Net Salary:</span>
                <span className="font-bold text-lg text-green-600">KES {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Transaction reference" {...field} />
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
                    <Textarea placeholder="Additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"} Payroll
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

