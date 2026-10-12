"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/date-utils"

interface ViewPayableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payable: any
}

export function ViewPayableDialog({ open, onOpenChange, payable }: ViewPayableDialogProps) {
  if (!payable) return null

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
      case "partial":
        return "secondary"
      case "pending":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Payable Invoice Details</DialogTitle>
          <DialogDescription>View complete invoice information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
              <p className="text-sm font-semibold">{payable.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vendor</p>
              <p className="text-sm font-semibold">{payable.vendorName || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-sm font-semibold">{formatCurrency(parseFloat(payable.totalAmount))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
              <p className="text-sm font-semibold">{formatCurrency(parseFloat(payable.paidAmount || 0))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
              <p className="text-sm font-semibold">{formatCurrency(parseFloat(payable.outstandingAmount))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeVariant(payable.status)}>
                {payable.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Date</p>
              <p className="text-sm">{payable.invoiceDate ? formatDate(payable.invoiceDate) : "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Due Date</p>
              <p className="text-sm">{payable.dueDate ? formatDate(payable.dueDate) : "—"}</p>
            </div>
            {payable.purchaseOrderNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Purchase Order</p>
                <p className="text-sm">{payable.purchaseOrderNumber}</p>
              </div>
            )}
          </div>
          {payable.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm">{payable.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

