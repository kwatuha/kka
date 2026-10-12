"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Loader2, MoreVertical, Edit, Trash2, Smartphone } from "lucide-react"
import { billingApi } from "@/lib/api"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

interface MobilePaymentLog {
  logId: number
  name: string
  amount: number
  refNo: string
  phoneNumber: string
  mobileProvider: string
  accountNumber?: string
  transactionDate: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: number
  createdByFirstName?: string
  createdByLastName?: string
}

const MOBILE_PROVIDERS = ["M-Pesa", "Airtel Money", "T-Kash", "Equitel", "Other"]

export function MobilePaymentLogsSection() {
  const [logs, setLogs] = useState<MobilePaymentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<MobilePaymentLog | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 })

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    refNo: "",
    phoneNumber: "",
    mobileProvider: "",
    accountNumber: "",
    transactionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: "",
  })

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, providerFilter, startDate, endDate, pagination.page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      }
      if (searchQuery) params.search = searchQuery
      if (providerFilter !== "all") params.mobileProvider = providerFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await billingApi.getMobilePaymentLogs(params)
      console.log('Mobile Payment Logs API Response:', response)
      // Handle response structure - API returns { data: [...], pagination: {...} }
      if (response && response.data) {
        setLogs(response.data)
        setPagination(response.pagination || pagination)
      } else if (Array.isArray(response)) {
        // Fallback: if response is directly an array
        setLogs(response)
      } else {
        setLogs([])
      }
    } catch (error: any) {
      console.error("Error loading mobile payment logs:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load mobile payment logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      name: "",
      amount: "",
      refNo: "",
      phoneNumber: "",
      mobileProvider: "",
      accountNumber: "",
      transactionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: "",
    })
    setSelectedLog(null)
    setIsAddDialogOpen(true)
  }

  const handleEdit = (log: MobilePaymentLog) => {
    setFormData({
      name: log.name,
      amount: log.amount.toString(),
      refNo: log.refNo,
      phoneNumber: log.phoneNumber,
      mobileProvider: log.mobileProvider,
      accountNumber: log.accountNumber || "",
      transactionDate: format(new Date(log.transactionDate), "yyyy-MM-dd'T'HH:mm"),
      notes: log.notes || "",
    })
    setSelectedLog(log)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (log: MobilePaymentLog) => {
    setSelectedLog(log)
    setIsDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaveLoading(true)

      if (!formData.name || !formData.amount || !formData.refNo || !formData.phoneNumber || !formData.mobileProvider || !formData.transactionDate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        refNo: formData.refNo,
        phoneNumber: formData.phoneNumber,
        mobileProvider: formData.mobileProvider,
        accountNumber: formData.accountNumber || null,
        transactionDate: formData.transactionDate,
        notes: formData.notes || null,
      }

      if (selectedLog) {
        await billingApi.updateMobilePaymentLog(selectedLog.logId.toString(), payload)
        toast({
          title: "Success",
          description: "Mobile payment log updated successfully",
        })
        setIsEditDialogOpen(false)
      } else {
        await billingApi.createMobilePaymentLog(payload)
        toast({
          title: "Success",
          description: "Mobile payment log created successfully",
        })
        setIsAddDialogOpen(false)
      }

      setFormData({
        name: "",
        amount: "",
        refNo: "",
        phoneNumber: "",
        mobileProvider: "",
        accountNumber: "",
        transactionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: "",
      })
      setSelectedLog(null)
      loadLogs()
    } catch (error: any) {
      console.error("Error saving mobile payment log:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save mobile payment log",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedLog) return

    try {
      setDeleteLoading(true)
      await billingApi.deleteMobilePaymentLog(selectedLog.logId.toString())
      toast({
        title: "Success",
        description: "Mobile payment log deleted successfully",
      })
      setIsDeleteDialogOpen(false)
      setSelectedLog(null)
      loadLogs()
    } catch (error: any) {
      console.error("Error deleting mobile payment log:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete mobile payment log",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm")
    } catch {
      return dateString
    }
  }

  // Use logs directly since filtering is handled by the API
  const filteredLogs = logs

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Payment Logs
              </CardTitle>
              <CardDescription>Track and manage mobile money transaction history</CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, ref number, phone..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {MOBILE_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Reference No</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading logs...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No mobile payment logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.logId}>
                      <TableCell className="font-medium">{log.name}</TableCell>
                      <TableCell>{log.refNo}</TableCell>
                      <TableCell>{log.phoneNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.mobileProvider}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(typeof log.amount === 'string' ? parseFloat(log.amount) : log.amount)}</TableCell>
                      <TableCell>{log.accountNumber || "-"}</TableCell>
                      <TableCell>{formatDateTime(log.transactionDate)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(log)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(log)} className="text-destructive">
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

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        setIsEditDialogOpen(open)
        if (!open) {
          setFormData({
            name: "",
            amount: "",
            refNo: "",
            phoneNumber: "",
            mobileProvider: "",
            accountNumber: "",
            transactionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            notes: "",
          })
          setSelectedLog(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLog ? "Edit Mobile Payment Log" : "Add Mobile Payment Log"}</DialogTitle>
            <DialogDescription>
              {selectedLog ? "Update the mobile payment log details" : "Enter the mobile payment transaction details"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refNo">
                  Reference Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="refNo"
                  value={formData.refNo}
                  onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                  placeholder="Enter reference number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobileProvider">
                  Mobile Provider <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.mobileProvider} onValueChange={(value) => setFormData({ ...formData, mobileProvider: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILE_PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Enter account number (optional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionDate">
                Transaction Date & Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transactionDate"
                type="datetime-local"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter notes (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
                setIsEditDialogOpen(false)
              }}
              disabled={saveLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                selectedLog ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mobile Payment Log?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mobile payment log? This action cannot be undone.
              {selectedLog && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Name: {selectedLog.name}</p>
                  <p className="text-sm">Reference: {selectedLog.refNo}</p>
                  <p className="text-sm">Amount: {formatCurrency(selectedLog.amount)}</p>
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
    </div>
  )
}

