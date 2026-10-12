"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Loader2, MoreVertical, Eye, Edit, Trash2, DollarSign } from "lucide-react"
import { receivableApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ViewReceivableDialog } from "@/components/receivable-view-dialog"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"

export default function AccountsReceivablePage() {
  const [isMounted, setIsMounted] = useState(false)
  const [receivables, setReceivables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingReceivable, setDeletingReceivable] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentReference, setPaymentReference] = useState("")
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadReceivables()
      loadStats()
    }
  }, [isMounted, statusFilter])

  const loadReceivables = async () => {
    try {
      setLoading(true)
      const data = await receivableApi.getAll(statusFilter || undefined)
      setReceivables(data || [])
    } catch (error: any) {
      console.error("Error loading receivables:", error)
      toast({
        title: "Error loading receivables",
        description: error.message || "Failed to load receivable invoices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await receivableApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleView = async (receivable: any) => {
    try {
      const details = await receivableApi.getById(receivable.receivableId.toString())
      setSelectedReceivable(details)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load receivable details",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (receivable: any) => {
    setDeletingReceivable(receivable)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingReceivable) return

    try {
      setDeleteLoading(true)
      await receivableApi.delete(deletingReceivable.receivableId.toString())
      toast({
        title: "Success",
        description: "Receivable invoice deleted successfully",
      })
      setDeleteDialogOpen(false)
      setDeletingReceivable(null)
      loadReceivables()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete receivable",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRecordPaymentClick = (receivable: any) => {
    setSelectedReceivable(receivable)
    setPaymentAmount("")
    setPaymentDate(format(new Date(), "yyyy-MM-dd"))
    setPaymentMethod("cash")
    setPaymentReference("")
    setPaymentDialogOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedReceivable || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      })
      return
    }

    try {
      setRecordingPayment(true)
      await receivableApi.recordPayment(selectedReceivable.receivableId.toString(), {
        paymentAmount: parseFloat(paymentAmount),
        paymentDate,
        paymentMethod,
        referenceNumber: paymentReference || undefined,
      })
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      })
      setPaymentDialogOpen(false)
      setSelectedReceivable(null)
      loadReceivables()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      })
    } finally {
      setRecordingPayment(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const getStatusBadge = (status: string) => {
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

  const filteredReceivables = receivables.filter((receivable) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      receivable.invoiceNumber?.toLowerCase().includes(query) ||
      `${receivable.firstName} ${receivable.lastName}`.toLowerCase().includes(query) ||
      receivable.patientNumber?.toLowerCase().includes(query)
    )
  })

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
          <p className="text-muted-foreground">Manage patient and insurance invoices</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
          <p className="text-muted-foreground">Manage patient and insurance invoices</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            getPayload={() => {
              if (filteredReceivables.length === 0) return null
              return {
                filenamePrefix: "accounts-receivable",
                pdfTitle: "Accounts Receivable",
                pdfSubtitle: "Patient and insurance receivables",
                pdfLandscape: true,
                numberColumns: [3, 4, 5],
                headers: ["Invoice #", "Patient", "Patient #", "Amount", "Paid", "Outstanding", "Due Date", "Status"],
                rows: filteredReceivables.map((r) => [
                  r.invoiceNumber || "",
                  `${r.firstName || ""} ${r.lastName || ""}`.trim(),
                  r.patientNumber || "",
                  parseFloat(String(r.totalAmount ?? r.amount ?? 0)) || 0,
                  parseFloat(String(r.paidAmount ?? 0)) || 0,
                  parseFloat(String(r.outstandingAmount ?? r.balance ?? 0)) || 0,
                  r.dueDate ? format(new Date(r.dueDate), "yyyy-MM-dd") : "",
                  r.status || "",
                ]),
              }
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency((parseFloat(stats?.currentAmount || 0) + parseFloat(stats?.overdueAmount || 0)))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "Loading..." : `${stats?.currentCount + stats?.overdueCount || 0} outstanding invoices`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(parseFloat(stats?.currentAmount || 0))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "Loading..." : `${stats?.currentCount || 0} pending invoices`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(parseFloat(stats?.overdueAmount || 0))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "Loading..." : `${stats?.overdueCount || 0} overdue invoice${stats?.overdueCount !== 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(parseFloat(stats?.paidThisMonthAmount || 0))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "Loading..." : `${stats?.paidThisMonthCount || 0} paid invoice${stats?.paidThisMonthCount !== 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Invoices</CardTitle>
          <CardDescription>View and manage patient invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button
                variant={statusFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(null)}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "current" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("current")}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "overdue" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("overdue")}
              >
                Overdue
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
              >
                Paid
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search invoices..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading receivables...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No receivables found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceivables.map((receivable) => (
                    <TableRow key={receivable.receivableId}>
                      <TableCell className="font-medium">{receivable.invoiceNumber || "-"}</TableCell>
                      <TableCell>
                        {receivable.firstName || receivable.lastName
                          ? `${receivable.firstName || ""} ${receivable.lastName || ""}`.trim()
                          : "-"}
                        {receivable.patientNumber && (
                          <div className="text-xs text-muted-foreground">{receivable.patientNumber}</div>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(parseFloat(receivable.totalAmount))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(receivable.paidAmount || 0))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(receivable.outstandingAmount))}</TableCell>
                      <TableCell>{formatDate(receivable.invoiceDate)}</TableCell>
                      <TableCell>{formatDate(receivable.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(receivable.status)}>
                          {receivable.status?.charAt(0).toUpperCase() + receivable.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(receivable)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {receivable.status !== "paid" && receivable.outstandingAmount > 0 && (
                              <DropdownMenuItem onClick={() => handleRecordPaymentClick(receivable)}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Record Payment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(receivable)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedReceivable && (
        <ViewReceivableDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          receivable={selectedReceivable}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receivable Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receivable invoice? This action cannot be undone.
              {deletingReceivable && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Invoice: {deletingReceivable.invoiceNumber}</p>
                  <p className="text-sm">
                    Patient: {deletingReceivable.firstName} {deletingReceivable.lastName}
                  </p>
                  <p className="text-sm">Outstanding: {formatCurrency(parseFloat(deletingReceivable.outstandingAmount))}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedReceivable?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedReceivable && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(selectedReceivable.totalAmount))}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Paid:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(selectedReceivable.paidAmount || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(selectedReceivable.outstandingAmount))}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedReceivable?.outstandingAmount || undefined}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <select
                id="paymentMethod"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="insurance">Insurance</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference Number</Label>
              <Input
                id="paymentReference"
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Optional reference number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={recordingPayment}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}>
              {recordingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
