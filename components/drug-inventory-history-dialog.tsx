"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, History, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface DrugInventoryHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drugInventoryId?: string | number
  batchNumber?: string
}

interface Transaction {
  transactionId: number
  transactionType: string
  transactionDate: string
  transactionTime: string
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  balanceAfter: number
  unitPrice?: string
  sellPrice?: string
  totalValue?: string
  totalSellValue?: string
  referenceType?: string
  referenceNumber?: string
  patientId?: number
  patientFirstName?: string
  patientLastName?: string
  patientNumber?: string
  prescriptionId?: number
  prescriptionNumber?: string
  performedByFirstName?: string
  performedByLastName?: string
  notes?: string
}

export function DrugInventoryHistoryDialog({
  open,
  onOpenChange,
  drugInventoryId,
  batchNumber,
}: DrugInventoryHistoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [batch, setBatch] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && (drugInventoryId || batchNumber)) {
      loadTransactions()
    } else {
      setTransactions([])
      setBatch(null)
      setSummary(null)
      setError(null)
    }
  }, [open, drugInventoryId, batchNumber])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      let data: any
      if (batchNumber) {
        data = await pharmacyApi.getDrugInventoryTransactionsByBatch(batchNumber)
      } else if (drugInventoryId) {
        data = await pharmacyApi.getDrugInventoryTransactions(drugInventoryId.toString())
      }

      if (data) {
        setTransactions(data.transactions || [])
        setBatch(data.batch || null)
        setSummary(data.summary || null)
      }
    } catch (err: any) {
      console.error("Error loading transaction history:", err)
      setError(err.message || "Failed to load transaction history")
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      RECEIPT: "default",
      DISPENSATION: "destructive",
      ADJUSTMENT: "secondary",
      TRANSFER: "outline",
      EXPIRY: "destructive",
      DAMAGE: "destructive",
      RETURN: "outline",
      CORRECTION: "secondary",
    }
    return (
      <Badge variant={variants[type] || "outline"}>
        {type}
      </Badge>
    )
  }

  const getQuantityChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    const time = timeString ? new Date(timeString) : date
    return `${formatDate(dateString)} ${time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Drug Inventory Transaction History
          </DialogTitle>
          <DialogDescription>
            {batch
              ? `Complete transaction history for batch: ${batch.batchNumber} - ${batch.medicationName || "N/A"}`
              : "View all stock movements and transactions"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Batch Summary */}
            {batch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Quantity</p>
                    <p className="text-lg font-semibold">{batch.originalQuantity || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Quantity</p>
                    <p className="text-lg font-semibold">{batch.currentQuantity || batch.quantity || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold">
                      <Badge variant={batch.status === "active" ? "default" : "secondary"}>
                        {batch.status || "active"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="text-lg font-semibold">
                      {batch.expiryDate ? formatDate(batch.expiryDate) : "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Buy Price (Cost)</p>
                    <p className="text-lg font-semibold">
                      {batch.unitPrice || batch.costPrice
                        ? `KES ${parseFloat(batch.unitPrice || batch.costPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sell Price</p>
                    <p className="text-lg font-semibold">
                      {batch.sellPrice
                        ? `KES ${parseFloat(batch.sellPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Batch Number</p>
                    <p className="text-lg font-semibold font-mono">{batch.batchNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-lg font-semibold">{batch.location || "-"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Summary */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Received</p>
                  <p className="text-lg font-semibold text-green-600">
                    {summary.totalReceived || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Dispensed</p>
                  <p className="text-lg font-semibold text-red-600">
                    {summary.totalDispensed || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-lg font-semibold">{transactions.length}</p>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            {transactions.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity Change</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Buy Price</TableHead>
                      <TableHead className="text-right">Sell Price</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.transactionId}>
                        <TableCell className="font-mono text-sm">
                          {formatDateTime(transaction.transactionDate, transaction.transactionTime)}
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeBadge(transaction.transactionType)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getQuantityChangeIcon(transaction.quantityChange)}
                            <span
                              className={
                                transaction.quantityChange > 0
                                  ? "text-green-600 font-semibold"
                                  : transaction.quantityChange < 0
                                  ? "text-red-600 font-semibold"
                                  : ""
                              }
                            >
                              {transaction.quantityChange > 0 ? "+" : ""}
                              {transaction.quantityChange}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{transaction.quantityBefore}</TableCell>
                        <TableCell className="text-right">{transaction.quantityAfter}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {transaction.balanceAfter}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.unitPrice 
                            ? `KES ${parseFloat(transaction.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.sellPrice 
                            ? `KES ${parseFloat(transaction.sellPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.totalValue 
                            ? `KES ${parseFloat(transaction.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.totalSellValue 
                            ? `KES ${parseFloat(transaction.totalSellValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {transaction.patientFirstName || transaction.patientLastName ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {transaction.patientFirstName || ""} {transaction.patientLastName || ""}
                              </span>
                              {transaction.patientNumber && (
                                <span className="text-xs text-muted-foreground">
                                  {transaction.patientNumber}
                                </span>
                              )}
                              {transaction.prescriptionNumber && (
                                <span className="text-xs text-muted-foreground">
                                  Rx: {transaction.prescriptionNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {transaction.referenceNumber && (
                              <span className="text-sm font-medium">
                                {transaction.referenceNumber}
                              </span>
                            )}
                            {transaction.referenceType && (
                              <span className="text-xs text-muted-foreground">
                                {transaction.referenceType}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.performedByFirstName || transaction.performedByLastName
                            ? `${transaction.performedByFirstName || ""} ${
                                transaction.performedByLastName || ""
                              }`.trim()
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={transaction.notes || ""}>
                          {transaction.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transaction history found</p>
                <p className="text-sm mt-2">Transactions will appear here when stock is received or dispensed</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

