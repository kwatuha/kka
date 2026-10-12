"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { assetApi, ledgerApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface CompleteMaintenanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  maintenance: any
}

export function CompleteMaintenanceDialog({
  open,
  onOpenChange,
  onSuccess,
  maintenance,
}: CompleteMaintenanceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recordExpense, setRecordExpense] = useState(false)
  const [completedDate, setCompletedDate] = useState<Date>(new Date())
  const [expenseAccountId, setExpenseAccountId] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([])

  useEffect(() => {
    if (open && maintenance) {
      setCompletedDate(new Date())
      setRecordExpense(maintenance.cost > 0)
      loadExpenseAccounts()
    }
  }, [open, maintenance])

  const loadExpenseAccounts = async () => {
    try {
      const accounts = await ledgerApi.getAccounts(undefined, "Expense")
      // Filter for maintenance-related accounts
      const maintenanceAccounts = accounts.filter((acc: any) =>
        acc.accountCode?.startsWith("52") || // Equipment and Maintenance (5200-5299)
        acc.accountName?.toLowerCase().includes("maintenance") ||
        acc.accountName?.toLowerCase().includes("repair") ||
        acc.accountName?.toLowerCase().includes("equipment")
      )
      setExpenseAccounts(maintenanceAccounts || [])

      // Auto-select appropriate account based on maintenance type
      if (maintenance) {
        const accountMap: Record<string, string> = {
          repair: "5202", // Equipment Repairs
          calibration: "5205", // Equipment Calibration
          inspection: "5201", // Equipment Maintenance
          scheduled: "5201",
          cleaning: "5201",
          upgrade: "5201",
          other: "5201",
        }
        const accountCode = accountMap[maintenance.maintenanceType] || "5201"
        const account = maintenanceAccounts.find((acc: any) => acc.accountCode === accountCode)
        if (account) {
          setExpenseAccountId(account.accountId.toString())
        }
      }
    } catch (error: any) {
      console.error("Error loading expense accounts:", error)
    }
  }

  async function handleComplete() {
    try {
      setIsSubmitting(true)

      const payload: any = {
        completedDate: format(completedDate, "yyyy-MM-dd"),
        recordExpense: recordExpense && maintenance.cost > 0,
        paymentMethod,
      }

      if (recordExpense && expenseAccountId) {
        payload.expenseAccountId = parseInt(expenseAccountId)
      }

      await assetApi.completeMaintenance(maintenance.maintenanceId.toString(), payload)

      toast({
        title: "Success",
        description: recordExpense && maintenance.cost > 0
          ? "Maintenance completed and expense recorded successfully"
          : "Maintenance completed successfully",
      })

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error completing maintenance:", error)
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to complete maintenance"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!maintenance) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Maintenance</DialogTitle>
          <DialogDescription>
            Mark this maintenance record as completed and optionally record the expense in financial records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <div className="text-sm font-medium">
              {maintenance.assetCode} - {maintenance.assetName}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Maintenance Type</Label>
            <div className="text-sm font-medium capitalize">
              {maintenance.maintenanceType}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Completion Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`w-full justify-start text-left font-normal ${!completedDate ? "text-muted-foreground" : ""}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {completedDate ? format(completedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={completedDate} onSelect={(date) => date && setCompletedDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {maintenance.cost > 0 && (
            <>
              <div className="space-y-2">
                <Label>Maintenance Cost</Label>
                <div className="text-sm font-medium">
                  {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(parseFloat(maintenance.cost || 0))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recordExpense"
                  checked={recordExpense}
                  onCheckedChange={(checked) => setRecordExpense(checked === true)}
                />
                <Label htmlFor="recordExpense" className="text-sm font-normal cursor-pointer">
                  Record expense in financial records
                </Label>
              </div>

              {recordExpense && (
                <div className="space-y-4 pl-6 border-l-2">
                  <div className="space-y-2">
                    <Label>Expense Account *</Label>
                    <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense account" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseAccounts.map((account) => (
                          <SelectItem key={account.accountId} value={account.accountId.toString()}>
                            {account.accountCode} - {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={isSubmitting || (recordExpense && !expenseAccountId)}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Maintenance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
