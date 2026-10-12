"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Edit, Trash2, Eye, DollarSign, Loader2, Printer, Copy, FileText, MoreVertical, CheckCircle2, Mail, History } from "lucide-react"
import { AddPayableInvoiceForm } from "@/components/add-payable-invoice-form"
import { payableApi, vendorApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Dynamically import ViewDialog to prevent SSR hydration issues
const ViewPayableDialog = dynamic(
  () => import("@/components/payable-view-dialog").then((mod) => mod.ViewPayableDialog),
  { ssr: false }
)
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
import { formatDate } from "@/lib/date-utils"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import { downloadVendorPayableInvoicePdf } from "@/lib/payable-invoice-pdf"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function AccountsPayablePage() {
  const [payables, setPayables] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openAddInvoiceForm, setOpenAddInvoiceForm] = useState(false)
  const [editingPayable, setEditingPayable] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedPayable, setSelectedPayable] = useState<any>(null)
  const [payableToDelete, setPayableToDelete] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [vendorFilter, setVendorFilter] = useState<string>("all")
  const [summary, setSummary] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadPayables()
      loadVendors()
      loadSummary()
    }
  }, [statusFilter, vendorFilter, searchTerm, isMounted])

  const loadPayables = async () => {
    try {
      setLoading(true)
      const data = await payableApi.getAll(
        statusFilter !== "all" ? statusFilter : undefined,
        vendorFilter !== "all" ? vendorFilter : undefined,
        searchTerm || undefined
      )
      setPayables(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading payables:", error)
      toast({
        title: "Error",
        description: "Failed to load payable invoices.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadVendors = async () => {
    try {
      const data = await vendorApi.getAll()
      setVendors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading vendors:", error)
    }
  }

  const loadSummary = async () => {
    try {
      const data = await payableApi.getSummary()
      setSummary(data)
    } catch (error) {
      console.error("Error loading summary:", error)
    }
  }

  const handleAdd = () => {
    setEditingPayable(null)
    setOpenAddInvoiceForm(true)
  }

  const handleEdit = (payable: any) => {
    setEditingPayable(payable)
    setOpenAddInvoiceForm(true)
  }

  const handleView = (payable: any) => {
    setSelectedPayable(payable)
    setViewDialogOpen(true)
  }

  const handleDelete = (payable: any) => {
    setPayableToDelete(payable)
    setDeleteDialogOpen(true)
  }

  const handlePay = (payable: any) => {
    setSelectedPayable(payable)
    setPayDialogOpen(true)
  }

  const handleDuplicate = async (payable: any) => {
    try {
      const newInvoiceNumber = `${payable.invoiceNumber}-COPY-${Date.now()}`
      const payload = {
        vendorId: payable.vendorId,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: payable.dueDate || null,
        totalAmount: payable.totalAmount,
        notes: `Duplicated from ${payable.invoiceNumber}. ${payable.notes || ''}`,
        purchaseOrderId: payable.purchaseOrderId || null,
      }

      await payableApi.create(payload)
      toast({
        title: "Success",
        description: `Invoice duplicated successfully.`,
      })
      loadPayables()
      loadSummary()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate invoice.",
        variant: "destructive",
      })
    }
  }

  const handleMarkAsPaid = async (payable: any) => {
    try {
      const paymentAmount = parseFloat(payable.outstandingAmount)
      await payableApi.recordPayment(payable.payableId.toString(), {
        paymentAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "manual",
        referenceNumber: `MANUAL-${Date.now()}`,
        notes: "Marked as paid manually",
      })
      toast({
        title: "Success",
        description: "Invoice marked as paid successfully.",
      })
      loadPayables()
      loadSummary()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark invoice as paid.",
        variant: "destructive",
      })
    }
  }

  const handlePrint = (payable: any) => {
    // Create a print-friendly window
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${payable.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .header img { max-width: 250px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
              .invoice-details { margin: 20px 0; }
              .invoice-details table { width: 100%; border-collapse: collapse; }
              .invoice-details td { padding: 8px; border-bottom: 1px solid #ddd; }
              .invoice-details td:first-child { font-weight: bold; width: 30%; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${window.location.origin}/az-careplus-logo.svg" alt="Facility logo" style="max-width: 250px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div style="display: none;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
                <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
              </div>
              <h1 style="margin-top: 15px;">Vendor Invoice</h1>
              <p>Invoice Number: ${payable.invoiceNumber}</p>
            </div>
            <div class="invoice-details">
              <table>
                <tr><td>Vendor:</td><td>${payable.vendorName || '—'}</td></tr>
                <tr><td>Invoice Date:</td><td>${formatDate(payable.invoiceDate)}</td></tr>
                <tr><td>Due Date:</td><td>${payable.dueDate ? formatDate(payable.dueDate) : '—'}</td></tr>
                <tr><td>Total Amount:</td><td>${formatCurrency(parseFloat(payable.totalAmount))}</td></tr>
                <tr><td>Paid Amount:</td><td>${formatCurrency(parseFloat(payable.paidAmount || 0))}</td></tr>
                <tr><td>Outstanding:</td><td>${formatCurrency(parseFloat(payable.outstandingAmount))}</td></tr>
                <tr><td>Status:</td><td>${payable.status}</td></tr>
                ${payable.purchaseOrderNumber ? `<tr><td>Purchase Order:</td><td>${payable.purchaseOrderNumber}</td></tr>` : ''}
                ${payable.notes ? `<tr><td>Notes:</td><td>${payable.notes}</td></tr>` : ''}
              </table>
            </div>
            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDownloadPDF = async (payable: any) => {
    try {
      await downloadVendorPayableInvoicePdf(payable)
    } catch (error) {
      console.error("Payable invoice PDF:", error)
      toast({
        title: "Export failed",
        description: "Could not generate the invoice PDF.",
        variant: "destructive",
      })
    }
  }

  const handleSendReminder = (payable: any) => {
    if (!payable.vendorEmail) {
      toast({
        title: "Error",
        description: "Vendor email not available.",
        variant: "destructive",
      })
      return
    }
    // In production, this would send an email
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${payable.vendorEmail}`,
    })
  }

  const confirmDelete = async () => {
    if (!payableToDelete) return

    try {
      await payableApi.delete(payableToDelete.payableId.toString())
      toast({
        title: "Success",
        description: "Payable invoice deleted successfully.",
      })
      setDeleteDialogOpen(false)
      setPayableToDelete(null)
      loadPayables()
      loadSummary()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payable invoice.",
        variant: "destructive",
      })
    }
  }

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

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Payable</h1>
          <p className="text-muted-foreground">Manage vendor invoices and payments</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            disabled={payables.length === 0}
            getPayload={() => {
              if (payables.length === 0) return null
              return {
                filenamePrefix: "accounts-payable",
                pdfTitle: "Accounts Payable",
                pdfSubtitle: "Vendor invoices",
                pdfLandscape: true,
                numberColumns: [3, 4, 5],
                headers: ["Invoice #", "Vendor", "PO #", "Total", "Paid", "Outstanding", "Issue Date", "Due Date", "Status"],
                rows: payables.map((p) => [
                  p.invoiceNumber || "",
                  p.vendorName || "",
                  p.purchaseOrderNumber || "",
                  parseFloat(String(p.totalAmount ?? 0)) || 0,
                  parseFloat(String(p.paidAmount ?? 0)) || 0,
                  parseFloat(String(p.outstandingAmount ?? 0)) || 0,
                  p.invoiceDate ? formatDate(p.invoiceDate) : "",
                  p.dueDate ? formatDate(p.dueDate) : "",
                  p.status || "",
                ]),
              }
            }}
          />
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(parseFloat(summary?.pendingAmount || 0) + parseFloat(summary?.overdueAmount || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.pendingCount || 0} outstanding invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(summary?.pendingAmount || 0))}</div>
            <p className="text-xs text-muted-foreground">{summary?.pendingCount || 0} pending invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(summary?.overdueAmount || 0))}</div>
            <p className="text-xs text-muted-foreground">{summary?.overdueCount || 0} overdue invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(summary?.paidThisMonthAmount || 0))}</div>
            <p className="text-xs text-muted-foreground">{summary?.paidThisMonthCount || 0} paid invoices</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Invoices</CardTitle>
              <CardDescription>View and manage vendor invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.vendorId} value={vendor.vendorId.toString()}>
                          {vendor.vendorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search invoices..."
                    className="w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {payables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payable invoices found.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payables.map((payable) => (
                        <TableRow key={payable.payableId}>
                          <TableCell className="font-medium">{payable.invoiceNumber}</TableCell>
                          <TableCell>
                            <div>{payable.vendorName || "—"}</div>
                            {payable.purchaseOrderNumber && (
                              <div className="text-xs text-muted-foreground">
                                PO: {payable.purchaseOrderNumber}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(parseFloat(payable.totalAmount))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(payable.paidAmount || 0))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(payable.outstandingAmount))}</TableCell>
                          <TableCell>{formatDate(payable.invoiceDate)}</TableCell>
                          <TableCell>
                            {payable.dueDate ? formatDate(payable.dueDate) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(payable.status)}>
                              {payable.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleView(payable)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(payable)}
                                title="Edit Invoice"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {payable.status !== "paid" && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handlePay(payable)}
                                  title="Record Payment"
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" title="More Actions">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handlePrint(payable)}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadPDF(payable)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(payable)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate Invoice
                                  </DropdownMenuItem>
                                  {payable.status !== "paid" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleMarkAsPaid(payable)}
                                        className="text-green-600"
                                      >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                      {payable.vendorEmail && (
                                        <DropdownMenuItem onClick={() => handleSendReminder(payable)}>
                                          <Mail className="mr-2 h-4 w-4" />
                                          Send Reminder
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(payable)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Invoice
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Directory</CardTitle>
              <CardDescription>View vendors with outstanding balances</CardDescription>
            </CardHeader>
            <CardContent>
              {vendors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No vendors found.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map((vendor) => (
                        <TableRow key={vendor.vendorId}>
                          <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                          <TableCell>
                            <div>{vendor.contactPerson || "—"}</div>
                            {vendor.email && (
                              <div className="text-xs text-muted-foreground">{vendor.email}</div>
                            )}
                          </TableCell>
                          <TableCell>{vendor.category || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={vendor.status === "Active" ? "default" : "secondary"}>
                              {vendor.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddPayableInvoiceForm
        open={openAddInvoiceForm}
        onOpenChange={(open) => {
          setOpenAddInvoiceForm(open)
          if (!open) {
            setEditingPayable(null)
          }
        }}
        onSuccess={() => {
          loadPayables()
          loadSummary()
          setEditingPayable(null)
        }}
        editData={editingPayable}
        vendors={vendors}
      />

      {/* View Dialog */}
      {selectedPayable && (
        <ViewPayableDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          payable={selectedPayable}
        />
      )}

      {/* Pay Dialog */}
      {isMounted && selectedPayable && (
        <PayablePaymentDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          payable={selectedPayable}
          onSuccess={() => {
            loadPayables()
            loadSummary()
            setSelectedPayable(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payable Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {payableToDelete?.invoiceNumber}?
              {payableToDelete?.status === "paid" && (
                <span className="block mt-2 text-destructive">
                  This invoice has been paid. It will be marked as cancelled instead of deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Payment Dialog Component
function PayablePaymentDialog({ open, onOpenChange, payable, onSuccess }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payable: any
  onSuccess?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && payable && isMounted) {
      setPaymentAmount(payable.outstandingAmount.toString())
      // Use client-side date only after mount
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentMethod("")
      setReferenceNumber("")
      setNotes("")
    }
  }, [open, payable, isMounted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (parseFloat(paymentAmount) > parseFloat(payable.outstandingAmount)) {
      toast({
        title: "Error",
        description: "Payment amount cannot exceed outstanding amount.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await payableApi.recordPayment(payable.payableId.toString(), {
        paymentAmount: parseFloat(paymentAmount),
        paymentDate,
        paymentMethod: paymentMethod || null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
      })
      toast({
        title: "Success",
        description: "Payment recorded successfully.",
      })
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {payable?.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        {isMounted && (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Outstanding Amount</label>
            <Input
              value={formatCurrency(parseFloat(payable?.outstandingAmount || 0))}
              readOnly
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Payment Amount *</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              max={payable?.outstandingAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Payment Date *</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Reference Number</label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Receipt/Transaction number"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
