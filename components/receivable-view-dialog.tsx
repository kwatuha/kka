"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/date-utils"

interface ViewReceivableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receivable: any
}

export function ViewReceivableDialog({ open, onOpenChange, receivable }: ViewReceivableDialogProps) {
  if (!receivable) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { 
      style: "currency", 
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "default"
      case "overdue":
        return "destructive"
      case "current":
        return "secondary"
      case "written_off":
        return "outline"
      default:
        return "secondary"
    }
  }

  const patientName = `${receivable.firstName || ''} ${receivable.lastName || ''}`.trim() || '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Receivable Invoice Details</DialogTitle>
          <DialogDescription>View complete invoice information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
              <p className="text-sm font-semibold">{receivable.invoiceNumber || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Patient</p>
              <p className="text-sm font-semibold">{patientName}</p>
              {receivable.patientNumber && (
                <p className="text-xs text-muted-foreground">{receivable.patientNumber}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-sm font-semibold">{formatCurrency(parseFloat(receivable.totalAmount))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
              <p className="text-sm font-semibold">{formatCurrency(parseFloat(receivable.paidAmount || 0))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
              <p className="text-sm font-semibold">{formatCurrency(parseFloat(receivable.outstandingAmount))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeVariant(receivable.status)}>
                {receivable.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Date</p>
              <p className="text-sm">{receivable.invoiceDate ? formatDate(receivable.invoiceDate) : "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Due Date</p>
              <p className="text-sm">{receivable.dueDate ? formatDate(receivable.dueDate) : "—"}</p>
            </div>
            {receivable.patientPhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient Phone</p>
                <p className="text-sm">{receivable.patientPhone}</p>
              </div>
            )}
            {receivable.patientEmail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient Email</p>
                <p className="text-sm">{receivable.patientEmail}</p>
              </div>
            )}
            {receivable.paymentMethod && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="text-sm">{receivable.paymentMethod}</p>
              </div>
            )}
            {receivable.lastPaymentDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Payment Date</p>
                <p className="text-sm">{formatDate(receivable.lastPaymentDate)}</p>
              </div>
            )}
          </div>
          {receivable.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm">{receivable.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

