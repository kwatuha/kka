"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Loader2, MoreVertical, Eye, CheckCircle, XCircle, ImageIcon, Edit, Trash2, FileText, Printer, AlertCircle, Smartphone } from "lucide-react"
import { MpesaInvoicePayDialog } from "@/components/mpesa-invoice-pay-dialog"
import { AddExaminationForm } from "@/components/add-examination-form"
import { radiologyApi, doctorsApi, clinicalCdsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { printRadiologyOrder, downloadRadiologyOrderPDF, printCombinedRadiologyReport, downloadCombinedRadiologyReportPDF } from "@/lib/radiology-results-pdf"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RadiologyOrder {
  orderId: number
  orderNumber: string
  patientId: number
  orderedBy: number
  examTypeId: number
  orderDate: string
  priority: string
  status: string
  clinicalIndication?: string
  bodyPart?: string
  firstName?: string
  lastName?: string
  patientNumber?: string
  doctorFirstName?: string
  doctorLastName?: string
  examCode?: string
  examName?: string
  category?: string
}

interface ExamType {
  examTypeId: number
  examCode: string
  examName: string
  category: string
  bodyPart?: string
  duration?: string
  cost?: number
  unitPrice?: number // For backwards compatibility
  description?: string
}

export default function RadiologyPage() {
  const { user } = useAuth()
  const [addExaminationOpen, setAddExaminationOpen] = useState(false)
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrder[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const loadOrdersSeq = useRef(0)
  const loadExamTypesSeq = useRef(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const [catalogSearch, setCatalogSearch] = useState("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [doctorFilter, setDoctorFilter] = useState<string>("")
  const [doctors, setDoctors] = useState<any[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [printingReport, setPrintingReport] = useState(false)

  // Order actions state
  const [viewOrderOpen, setViewOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [resultsFormOpen, setResultsFormOpen] = useState(false)
  const [orderForResults, setOrderForResults] = useState<RadiologyOrder | null>(null)
  const [savingResults, setSavingResults] = useState(false)
  const [editOrderOpen, setEditOrderOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<RadiologyOrder | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  // Exam type form state
  const [examTypeFormOpen, setExamTypeFormOpen] = useState(false)
  const [editingExamType, setEditingExamType] = useState<ExamType | null>(null)
  const [deletingExamType, setDeletingExamType] = useState<ExamType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [payOrder, setPayOrder] = useState<RadiologyOrder | null>(null)

  const [storedReports, setStoredReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportSearch, setReportSearch] = useState("")

  const loadStoredReports = useCallback(async () => {
    try {
      setReportsLoading(true)
      const data = await radiologyApi.getReports({
        search: reportSearch.trim() || undefined,
        limit: 150,
        page: 1,
      })
      setStoredReports(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setStoredReports([])
    } finally {
      setReportsLoading(false)
    }
  }, [reportSearch])

  const loadOrders = useCallback(async () => {
    const seq = ++loadOrdersSeq.current
    try {
      setLoading(true)
      setOrdersError(null)
      const data = await radiologyApi.getOrders(undefined, statusFilter || undefined)
      if (seq !== loadOrdersSeq.current) return
      setRadiologyOrders(data)
    } catch (err: any) {
      if (seq !== loadOrdersSeq.current) return
      setOrdersError(err.message || 'Failed to load radiology orders')
      console.error('Error loading radiology orders:', err)
    } finally {
      if (seq === loadOrdersSeq.current) setLoading(false)
    }
  }, [statusFilter])

  const loadExamTypes = useCallback(async () => {
    const seq = ++loadExamTypesSeq.current
    try {
      setLoadingCatalog(true)
      setCatalogError(null)
      const data = await radiologyApi.getExamTypes(catalogSearch || undefined, categoryFilter || undefined)
      if (seq !== loadExamTypesSeq.current) return
      setExamTypes(data)
    } catch (err: any) {
      if (seq !== loadExamTypesSeq.current) return
      setCatalogError(err.message || 'Failed to load exam types')
      console.error('Error loading exam types:', err)
    } finally {
      if (seq === loadExamTypesSeq.current) setLoadingCatalog(false)
    }
  }, [categoryFilter, catalogSearch])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    loadExamTypes()
  }, [loadExamTypes])

  useEffect(() => {
    loadDoctors()
  }, [])

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true)
      const data = await doctorsApi.getAll()
      setDoctors(data)
    } catch (err: any) {
      console.error('Error loading doctors:', err)
    } finally {
      setLoadingDoctors(false)
    }
  }

  const filteredOrders = radiologyOrders.filter((order) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch = (
        order.orderNumber.toLowerCase().includes(searchLower) ||
        `${order.firstName || ''} ${order.lastName || ''}`.toLowerCase().includes(searchLower) ||
        order.patientNumber?.toLowerCase().includes(searchLower) ||
        order.clinicalIndication?.toLowerCase().includes(searchLower) ||
        order.examName?.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const orderDate = new Date(order.orderDate)
      orderDate.setHours(0, 0, 0, 0)

      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (orderDate < fromDate) return false
      }

      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (orderDate > toDate) return false
      }
    }

    // Doctor filter
    if (doctorFilter) {
      if (order.orderedBy.toString() !== doctorFilter) return false
    }

    return true
  })

  const filteredExamTypes = examTypes.filter((exam) => {
    if (catalogSearch) {
      const searchLower = catalogSearch.toLowerCase()
      return (
        exam.examName.toLowerCase().includes(searchLower) ||
        exam.examCode?.toLowerCase().includes(searchLower) ||
        exam.category?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const getPatientName = (order: RadiologyOrder) => {
    return `${order.firstName || ''} ${order.lastName || ''}`.trim() || `Patient ${order.patientId}`
  }

  const getDoctorName = (order: RadiologyOrder) => {
    const firstName = order.doctorFirstName || ''
    const lastName = order.doctorLastName || ''
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return `Doctor ${order.orderedBy}`
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd')
    } catch {
      return dateString
    }
  }

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1)
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const handleViewOrder = async (order: RadiologyOrder) => {
    setSelectedOrder(order)
    setViewOrderOpen(true)
    setLoadingOrderDetails(true)
    try {
      const details = await radiologyApi.getOrder(order.orderId.toString())
      setSelectedOrder(details)
    } catch (err: any) {
      toast({
        title: "Error loading order",
        description: err.message || 'Failed to load order details',
        variant: "destructive",
      })
      console.error('Error loading order details:', err)
    } finally {
      setLoadingOrderDetails(false)
    }
  }

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    setUpdatingStatus(orderId.toString())
    try {
      await radiologyApi.updateOrder(orderId.toString(), { status })
      await loadOrders()
      toast({
        title: "Order status updated",
        description: `Order status has been updated successfully.`,
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update order status'
      toast({
        title: "Error updating status",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating order status:', err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleEditOrder = async (order: RadiologyOrder) => {
    // Load full order details for editing
    try {
      setLoadingOrderDetails(true)
      const fullOrder = await radiologyApi.getOrder(order.orderId.toString())
      setEditingOrder(fullOrder)
      setEditOrderOpen(true)
    } catch (err: any) {
      toast({
        title: "Error loading order",
        description: err.message || "Failed to load order details",
        variant: "destructive",
      })
      console.error('Error loading order details:', err)
    } finally {
      setLoadingOrderDetails(false)
    }
  }

  const handleSaveOrder = async (data: any) => {
    if (!editingOrder) return

    setSavingOrder(true)
    try {
      await radiologyApi.updateOrder(editingOrder.orderId.toString(), data)
      toast({
        title: "Order updated",
        description: `Order ${editingOrder.orderNumber} has been updated successfully.`,
      })
      setEditOrderOpen(false)
      setEditingOrder(null)
      await loadOrders()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update order'
      toast({
        title: "Error updating order",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating order:', err)
    } finally {
      setSavingOrder(false)
    }
  }

  const handleAddResults = (order: RadiologyOrder) => {
    setOrderForResults(order)
    setResultsFormOpen(true)
  }

  const handleSaveResults = async (payload: {
    findings?: string
    impression?: string
    recommendations?: string
  }) => {
    if (!orderForResults) return
    if (
      !payload.findings?.trim() &&
      !payload.impression?.trim() &&
      !payload.recommendations?.trim()
    ) {
      toast({
        title: "Enter report content",
        description: "Add at least findings, impression, or recommendations.",
        variant: "destructive",
      })
      return
    }
    const uid = user?.id ? parseInt(String(user.id), 10) : NaN
    if (!user?.id || Number.isNaN(uid)) {
      toast({
        title: "Sign in required",
        description: "Cannot record reporter identity.",
        variant: "destructive",
      })
      return
    }

    setSavingResults(true)
    try {
      await radiologyApi.completeOrderReport(orderForResults.orderId.toString(), {
        findings: payload.findings,
        impression: payload.impression,
        recommendations: payload.recommendations,
        reportedBy: uid,
      })
      toast({ title: "Report saved", description: "Findings stored in radiology reports; order completed." })
      await loadOrders()
      await loadStoredReports()
      setResultsFormOpen(false)
      setOrderForResults(null)
    } catch (err: any) {
      toast({
        title: "Error saving results",
        description: err.message || 'Failed to save results',
        variant: "destructive",
      })
      console.error('Error saving results:', err)
    } finally {
      setSavingResults(false)
    }
  }

  const handlePrintOrder = async (order: RadiologyOrder) => {
    try {
      // Load full order details
      const orderDetails = await radiologyApi.getOrder(order.orderId.toString())
      const orderData = {
        orderNumber: orderDetails.orderNumber,
        orderDate: orderDetails.orderDate,
        patientName: getPatientName(orderDetails),
        patientNumber: orderDetails.patientNumber,
        doctorName: getDoctorName(orderDetails),
        priority: orderDetails.priority,
        status: orderDetails.status,
        clinicalIndication: orderDetails.clinicalIndication,
        examName: orderDetails.examName,
        examCode: orderDetails.examCode,
        category: orderDetails.category,
        bodyPart: orderDetails.bodyPart,
        scheduledDate: orderDetails.scheduledDate,
        notes: orderDetails.notes,
      }
      printRadiologyOrder(orderData)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load order details for printing",
        variant: "destructive",
      })
      console.error('Error printing order:', err)
    }
  }

  const handleDownloadOrderPDF = async (order: RadiologyOrder) => {
    try {
      // Load full order details
      const orderDetails = await radiologyApi.getOrder(order.orderId.toString())
      const orderData = {
        orderNumber: orderDetails.orderNumber,
        orderDate: orderDetails.orderDate,
        patientName: getPatientName(orderDetails),
        patientNumber: orderDetails.patientNumber,
        doctorName: getDoctorName(orderDetails),
        priority: orderDetails.priority,
        status: orderDetails.status,
        clinicalIndication: orderDetails.clinicalIndication,
        examName: orderDetails.examName,
        examCode: orderDetails.examCode,
        category: orderDetails.category,
        bodyPart: orderDetails.bodyPart,
        scheduledDate: orderDetails.scheduledDate,
        notes: orderDetails.notes,
      }
      downloadRadiologyOrderPDF(orderData)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load order details for PDF",
        variant: "destructive",
      })
      console.error('Error downloading PDF:', err)
    }
  }

  const handlePrintFiltered = async () => {
    if (filteredOrders.length === 0) {
      toast({
        title: "No orders to print",
        description: "Please adjust your filters to include at least one order.",
        variant: "destructive",
      })
      return
    }

    setPrintingReport(true)
    try {
      // Load full details for all filtered orders
      const ordersWithDetails = await Promise.all(
        filteredOrders.map(async (order) => {
          try {
            const orderDetails = await radiologyApi.getOrder(order.orderId.toString())
            return {
              orderNumber: orderDetails.orderNumber,
              orderDate: orderDetails.orderDate,
              patientName: getPatientName(orderDetails),
              patientNumber: orderDetails.patientNumber,
              doctorName: getDoctorName(orderDetails),
              priority: orderDetails.priority,
              status: orderDetails.status,
              clinicalIndication: orderDetails.clinicalIndication,
              examName: orderDetails.examName,
              examCode: orderDetails.examCode,
              category: orderDetails.category,
              bodyPart: orderDetails.bodyPart,
              scheduledDate: orderDetails.scheduledDate,
              notes: orderDetails.notes,
            }
          } catch (err) {
            console.error('Error loading order details:', order.orderId, err)
            // Return basic order info if details can't be loaded
            return {
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              patientName: getPatientName(order),
              patientNumber: order.patientNumber,
              doctorName: getDoctorName(order),
              priority: order.priority,
              status: order.status,
              clinicalIndication: order.clinicalIndication,
              examName: order.examName,
              examCode: order.examCode,
              category: order.category,
              bodyPart: order.bodyPart,
              scheduledDate: undefined,
              notes: undefined,
            }
          }
        })
      )

      const selectedDoctor = doctorFilter
        ? doctors.find(d => d.userId.toString() === doctorFilter)
        : null
      const doctorName = selectedDoctor
        ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}`.trim()
        : undefined

      printCombinedRadiologyReport(ordersWithDetails, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        doctorName: doctorName,
      })

      toast({
        title: "Report generated",
        description: `Printing ${ordersWithDetails.length} order(s) with results.`,
      })
    } catch (err: any) {
      toast({
        title: "Error generating report",
        description: err.message || "Failed to generate the report. Please try again.",
        variant: "destructive",
      })
      console.error('Error generating report:', err)
    } finally {
      setPrintingReport(false)
    }
  }

  const handleDownloadFilteredPDF = async () => {
    if (filteredOrders.length === 0) {
      toast({
        title: "No orders to download",
        description: "Please adjust your filters to include at least one order.",
        variant: "destructive",
      })
      return
    }

    setPrintingReport(true)
    try {
      // Load full details for all filtered orders
      const ordersWithDetails = await Promise.all(
        filteredOrders.map(async (order) => {
          try {
            const orderDetails = await radiologyApi.getOrder(order.orderId.toString())
            return {
              orderNumber: orderDetails.orderNumber,
              orderDate: orderDetails.orderDate,
              patientName: getPatientName(orderDetails),
              patientNumber: orderDetails.patientNumber,
              doctorName: getDoctorName(orderDetails),
              priority: orderDetails.priority,
              status: orderDetails.status,
              clinicalIndication: orderDetails.clinicalIndication,
              examName: orderDetails.examName,
              examCode: orderDetails.examCode,
              category: orderDetails.category,
              bodyPart: orderDetails.bodyPart,
              scheduledDate: orderDetails.scheduledDate,
              notes: orderDetails.notes,
            }
          } catch (err) {
            console.error('Error loading order details:', order.orderId, err)
            // Return basic order info if details can't be loaded
            return {
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              patientName: getPatientName(order),
              patientNumber: order.patientNumber,
              doctorName: getDoctorName(order),
              priority: order.priority,
              status: order.status,
              clinicalIndication: order.clinicalIndication,
              examName: order.examName,
              examCode: order.examCode,
              category: order.category,
              bodyPart: order.bodyPart,
              scheduledDate: undefined,
              notes: undefined,
            }
          }
        })
      )

      const selectedDoctor = doctorFilter
        ? doctors.find(d => d.userId.toString() === doctorFilter)
        : null
      const doctorName = selectedDoctor
        ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}`.trim()
        : undefined

      downloadCombinedRadiologyReportPDF(ordersWithDetails, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        doctorName: doctorName,
      })

      toast({
        title: "Report generated",
        description: `Downloading PDF for ${ordersWithDetails.length} order(s) with results.`,
      })
    } catch (err: any) {
      toast({
        title: "Error generating report",
        description: err.message || "Failed to generate the report. Please try again.",
        variant: "destructive",
      })
      console.error('Error generating report:', err)
    } finally {
      setPrintingReport(false)
    }
  }

  const getStatusActionLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Mark as Scheduled'
      case 'in_progress':
        return 'Mark as In Progress'
      case 'completed':
        return 'Mark as Completed'
      case 'cancelled':
        return 'Cancel Order'
      default:
        return status
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'awaiting_payment':
        return null
      case 'pending':
        return 'scheduled'
      case 'scheduled':
        return 'in_progress'
      case 'in_progress':
        return 'completed'
      default:
        return null
    }
  }

  const handleCreateExamType = () => {
    setEditingExamType(null)
    setExamTypeFormOpen(true)
  }

  const handleEditExamType = (examType: ExamType) => {
    setEditingExamType(examType)
    setExamTypeFormOpen(true)
  }

  const handleDeleteExamType = async () => {
    if (!deletingExamType) return

    setDeleteLoading(true)
    try {
      await radiologyApi.deleteExamType(deletingExamType.examTypeId.toString())
      toast({
        title: "Exam type deleted",
        description: `"${deletingExamType.examName}" has been deleted successfully.`,
      })
      setDeletingExamType(null)
      loadExamTypes()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete exam type'
      toast({
        title: "Error deleting exam type",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error deleting exam type:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSaveExamType = async (data: any) => {
    try {
      if (editingExamType) {
        await radiologyApi.updateExamType(editingExamType.examTypeId.toString(), data)
        toast({
          title: "Exam type updated",
          description: `"${data.examName || editingExamType.examName}" has been updated successfully.`,
        })
      } else {
        await radiologyApi.createExamType(data)
        toast({
          title: "Exam type created",
          description: `"${data.examName}" has been created successfully.`,
        })
      }
      setExamTypeFormOpen(false)
      setEditingExamType(null)
      loadExamTypes()
    } catch (err: any) {
      const errorMessage = err.message || `Failed to ${editingExamType ? 'update' : 'create'} exam type`
      toast({
        title: `Error ${editingExamType ? 'updating' : 'creating'} exam type`,
        description: errorMessage,
        variant: "destructive",
      })
      console.error(`Error ${editingExamType ? 'updating' : 'creating'} exam type:`, err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Radiology</h1>
          <p className="text-muted-foreground">Manage radiology examinations and results</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintFiltered}
            disabled={printingReport || filteredOrders.length === 0}
          >
            {printingReport ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Print Filtered ({filteredOrders.length})
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadFilteredPDF}
            disabled={printingReport || filteredOrders.length === 0}
          >
            {printingReport ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF ({filteredOrders.length})
              </>
            )}
          </Button>
          <Button onClick={() => setAddExaminationOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Examination
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="examinations"
        className="w-full"
        onValueChange={(v) => {
          if (v !== "examinations") setOrdersError(null)
          if (v !== "catalog") setCatalogError(null)
          if (v === "reports") loadStoredReports()
        }}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="examinations">Examination Requests</TabsTrigger>
          <TabsTrigger value="reports">Stored reports</TabsTrigger>
          <TabsTrigger value="catalog">Examination Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="examinations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Radiology Examination Requests</CardTitle>
              <CardDescription>
                View and manage imaging work. <strong>All</strong> excludes orders still awaiting payment at cashier;
                use <strong>Awaiting payment</strong> to see those.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersError && (
                <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {ordersError}
                  <Button variant="link" size="sm" onClick={loadOrders} className="ml-2 h-auto p-0">
                    Retry
                  </Button>
                </div>
              )}
              <div className="space-y-4 mb-4">
                {/* Filters Row */}
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={statusFilter === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("")}
                      title="Imaging work queue: excludes unpaid (awaiting payment at cashier)"
                    >
                      All (imaging queue)
                    </Button>
                    <Button
                      variant={statusFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("pending")}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={statusFilter === "awaiting_payment" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("awaiting_payment")}
                    >
                      Awaiting payment
                    </Button>
                    <Button
                      variant={statusFilter === "scheduled" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("scheduled")}
                    >
                      Scheduled
                    </Button>
                    <Button
                      variant={statusFilter === "in_progress" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("in_progress")}
                    >
                      In Progress
                    </Button>
                    <Button
                      variant={statusFilter === "completed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("completed")}
                    >
                      Completed
                    </Button>
                  </div>

                  {/* Date and Doctor Filters */}
                  <div className="flex gap-2 flex-wrap items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">From Date</label>
                      <Input
                        type="date"
                        className="w-40"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">To Date</label>
                      <Input
                        type="date"
                        className="w-40"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Doctor</label>
                      <Select value={doctorFilter || "all"} onValueChange={(value) => setDoctorFilter(value === "all" ? "" : value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All Doctors" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Doctors</SelectItem>
                          {loadingDoctors ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            doctors.map((doctor) => (
                              <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                                {doctor.firstName} {doctor.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {(dateFrom || dateTo || doctorFilter) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateFrom("")
                          setDateTo("")
                          setDoctorFilter("")
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search examinations..."
                    className="w-full pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading orders...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Examination</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No radiology orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.orderId}>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>
                              {getPatientName(order)}
                              {order.patientNumber && (
                                <div className="text-xs text-muted-foreground">{order.patientNumber}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.examName || `Exam ${order.examTypeId}`}
                              {order.category && (
                                <div className="text-xs text-muted-foreground">{order.category}</div>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(order.orderDate)}</TableCell>
                            <TableCell>
                              <Badge variant={order.priority === "urgent" || order.priority === "stat" ? "destructive" : "outline"}>
                                {formatPriority(order.priority)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.status === "completed"
                                    ? "default"
                                    : order.status === "in_progress"
                                      ? "secondary"
                                      : order.status === "awaiting_payment"
                                        ? "destructive"
                                        : "outline"
                                }
                              >
                                {formatStatus(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrintOrder(order)}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadOrderPDF(order)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {order.status === 'awaiting_payment' && (
                                        <DropdownMenuItem onClick={() => setPayOrder(order)}>
                                          <Smartphone className="mr-2 h-4 w-4" />
                                          Pay with M-Pesa
                                        </DropdownMenuItem>
                                      )}
                                      {order.status !== 'awaiting_payment' && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Order
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          {getNextStatus(order.status) && (
                                            <DropdownMenuItem
                                              onClick={() => handleUpdateOrderStatus(order.orderId, getNextStatus(order.status)!)}
                                              disabled={updatingStatus === order.orderId.toString()}
                                            >
                                              <ImageIcon className="mr-2 h-4 w-4" />
                                              {updatingStatus === order.orderId.toString() ? 'Updating...' : getStatusActionLabel(getNextStatus(order.status)!)}
                                            </DropdownMenuItem>
                                          )}
                                          {/* Only show "Mark as Completed" if getNextStatus doesn't already provide it */}
                                          {order.status !== 'cancelled' && getNextStatus(order.status) !== 'completed' && (
                                            <DropdownMenuItem
                                              onClick={() => handleUpdateOrderStatus(order.orderId, 'completed')}
                                              disabled={updatingStatus === order.orderId.toString()}
                                            >
                                              <CheckCircle className="mr-2 h-4 w-4" />
                                              {updatingStatus === order.orderId.toString() ? 'Marking...' : 'Mark as Completed'}
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleUpdateOrderStatus(order.orderId, 'cancelled')}
                                        disabled={updatingStatus === order.orderId.toString()}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        {updatingStatus === order.orderId.toString() ? 'Cancelling...' : 'Cancel Order'}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {order.status === 'completed' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleAddResults(order)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Add Results/Notes
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stored radiology reports</CardTitle>
              <CardDescription>
                Final reports from <code className="text-xs">radiology_reports</code> (findings, impression, recommendations) linked to orders and patients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col gap-1 max-w-sm flex-1">
                  <label className="text-xs text-muted-foreground">Search</label>
                  <Input
                    placeholder="Patient, order #, exam, findings…"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadStoredReports()}
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => loadStoredReports()}>
                  Search
                </Button>
              </div>
              {reportsLoading ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : storedReports.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No stored reports yet. Complete an order with “Add Results” or from the radiology queue.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report date</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Impression</TableHead>
                        <TableHead>Reporter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storedReports.map((r: any) => (
                        <TableRow key={r.reportId}>
                          <TableCell className="whitespace-nowrap">
                            {r.reportDate ? format(new Date(r.reportDate), "yyyy-MM-dd") : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.orderNumber || r.orderId}</TableCell>
                          <TableCell>
                            {r.firstName || r.lastName
                              ? `${r.firstName || ""} ${r.lastName || ""}`.trim()
                              : r.patientNumber || `#${r.patientId}`}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <span className="line-clamp-2 text-sm">{r.examName || "—"}</span>
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <span className="line-clamp-3 text-sm text-muted-foreground">{r.impression || "—"}</span>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {r.reportedByFirstName || r.reportedByLastName
                              ? `${r.reportedByFirstName || ""} ${r.reportedByLastName || ""}`.trim()
                              : "—"}
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

        <TabsContent value="catalog" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Examination Catalog</CardTitle>
                  <CardDescription>View available radiology examinations and their details</CardDescription>
                </div>
                <Button onClick={handleCreateExamType}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Exam Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {catalogError && (
                <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {catalogError}
                  <Button variant="link" size="sm" onClick={loadExamTypes} className="ml-2 h-auto p-0">
                    Retry
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={categoryFilter === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("")}
                  >
                    All
                  </Button>
                  <Button
                    variant={categoryFilter === "X-Ray" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("X-Ray")}
                  >
                    X-Ray
                  </Button>
                  <Button
                    variant={categoryFilter === "Ultrasound" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("Ultrasound")}
                  >
                    Ultrasound
                  </Button>
                  <Button
                    variant={categoryFilter === "CT Scan" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("CT Scan")}
                  >
                    CT Scan
                  </Button>
                  <Button
                    variant={categoryFilter === "MRI" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("MRI")}
                  >
                    MRI
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search catalog..."
                    className="w-full pl-8"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingCatalog ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading exam types...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Examination Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExamTypes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {loadingCatalog ? 'Loading...' : 'No exam types found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredExamTypes.map((exam) => (
                          <TableRow key={exam.examTypeId}>
                            <TableCell className="font-medium">{exam.examCode || '-'}</TableCell>
                            <TableCell>{exam.examName}</TableCell>
                            <TableCell>{exam.category || '-'}</TableCell>
                            <TableCell>{exam.duration || '-'}</TableCell>
                            <TableCell>{(exam.cost || exam.unitPrice) ? formatCurrency(exam.cost || exam.unitPrice || 0) : '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{exam.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditExamType(exam)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingExamType(exam)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addExaminationOpen} onOpenChange={setAddExaminationOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Radiology Examination</DialogTitle>
            <DialogDescription>Create a new radiology examination request for a patient.</DialogDescription>
          </DialogHeader>
          <AddExaminationForm
            open={addExaminationOpen}
            onOpenChange={setAddExaminationOpen}
            onSuccess={() => {
              loadOrders()
              setAddExaminationOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={viewOrderOpen} onOpenChange={setViewOrderOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Radiology Examination Order Details</DialogTitle>
            <DialogDescription>
              Order {selectedOrder?.orderNumber || ''}
            </DialogDescription>
          </DialogHeader>
          {loadingOrderDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">
                    {selectedOrder.firstName} {selectedOrder.lastName}
                  </p>
                  {selectedOrder.patientNumber && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.patientNumber}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ordering Doctor</p>
                  <p className="font-medium">
                    {selectedOrder.doctorFirstName} {selectedOrder.doctorLastName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Examination</p>
                  <p className="font-medium">{selectedOrder.examName || `Exam ${selectedOrder.examTypeId}`}</p>
                  {selectedOrder.examCode && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.examCode}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge variant={selectedOrder.priority === "urgent" || selectedOrder.priority === "stat" ? "destructive" : "outline"}>
                    {formatPriority(selectedOrder.priority)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedOrder.status === "completed"
                        ? "default"
                        : selectedOrder.status === "in_progress"
                          ? "secondary"
                          : selectedOrder.status === "awaiting_payment"
                            ? "destructive"
                            : "outline"
                    }
                  >
                    {formatStatus(selectedOrder.status)}
                  </Badge>
                </div>
              </div>

              {selectedOrder.bodyPart && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Body Part</p>
                  <p className="text-sm">{selectedOrder.bodyPart}</p>
                </div>
              )}

              {selectedOrder.clinicalIndication && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Clinical Indication</p>
                  <p className="text-sm">{selectedOrder.clinicalIndication}</p>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedOrder) {
                      const orderData = {
                        orderNumber: selectedOrder.orderNumber,
                        orderDate: selectedOrder.orderDate,
                        patientName: `${selectedOrder.firstName || ''} ${selectedOrder.lastName || ''}`.trim() || `Patient ${selectedOrder.patientId}`,
                        patientNumber: selectedOrder.patientNumber,
                        doctorName: `${selectedOrder.doctorFirstName || ''} ${selectedOrder.doctorLastName || ''}`.trim() || `Doctor ${selectedOrder.orderedBy}`,
                        priority: selectedOrder.priority,
                        status: selectedOrder.status,
                        clinicalIndication: selectedOrder.clinicalIndication,
                        examName: selectedOrder.examName,
                        examCode: selectedOrder.examCode,
                        category: selectedOrder.category,
                        bodyPart: selectedOrder.bodyPart,
                        scheduledDate: selectedOrder.scheduledDate,
                        notes: selectedOrder.notes,
                      }
                      printRadiologyOrder(orderData)
                    }
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedOrder) {
                      const orderData = {
                        orderNumber: selectedOrder.orderNumber,
                        orderDate: selectedOrder.orderDate,
                        patientName: `${selectedOrder.firstName || ''} ${selectedOrder.lastName || ''}`.trim() || `Patient ${selectedOrder.patientId}`,
                        patientNumber: selectedOrder.patientNumber,
                        doctorName: `${selectedOrder.doctorFirstName || ''} ${selectedOrder.doctorLastName || ''}`.trim() || `Doctor ${selectedOrder.orderedBy}`,
                        priority: selectedOrder.priority,
                        status: selectedOrder.status,
                        clinicalIndication: selectedOrder.clinicalIndication,
                        examName: selectedOrder.examName,
                        examCode: selectedOrder.examCode,
                        category: selectedOrder.category,
                        bodyPart: selectedOrder.bodyPart,
                        scheduledDate: selectedOrder.scheduledDate,
                        notes: selectedOrder.notes,
                      }
                      downloadRadiologyOrderPDF(orderData)
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Exam Type Form Dialog */}
      <Dialog open={examTypeFormOpen} onOpenChange={(open) => {
        setExamTypeFormOpen(open)
        if (!open) setEditingExamType(null)
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingExamType ? 'Edit Exam Type' : 'Add Exam Type'}</DialogTitle>
            <DialogDescription>
              {editingExamType ? 'Update the exam type details' : 'Create a new radiology exam type'}
            </DialogDescription>
          </DialogHeader>
          <ExamTypeForm
            examType={editingExamType}
            onSave={handleSaveExamType}
            onCancel={() => {
              setExamTypeFormOpen(false)
              setEditingExamType(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Exam Type Confirmation */}
      <AlertDialog open={!!deletingExamType} onOpenChange={(open) => !open && setDeletingExamType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the exam type "{deletingExamType?.examName}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExamType}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Results/Notes Dialog */}
      <Dialog open={resultsFormOpen} onOpenChange={setResultsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Examination Results/Notes</DialogTitle>
            <DialogDescription>
              Record findings, impressions, and results for this radiology examination order
            </DialogDescription>
          </DialogHeader>
          <ExaminationResultsForm
            order={orderForResults}
            onSave={handleSaveResults}
            onCancel={() => {
              setResultsFormOpen(false)
              setOrderForResults(null)
            }}
            saving={savingResults}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editOrderOpen} onOpenChange={(open) => {
        setEditOrderOpen(open)
        if (!open) {
          setEditingOrder(null)
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Radiology Examination Order</DialogTitle>
            <DialogDescription>
              Update order details for {editingOrder?.orderNumber || ''}
            </DialogDescription>
          </DialogHeader>
          {loadingOrderDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : editingOrder ? (
            <EditOrderForm
              order={editingOrder}
              onSave={handleSaveOrder}
              onCancel={() => {
                setEditOrderOpen(false)
                setEditingOrder(null)
              }}
              saving={savingOrder}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <MpesaInvoicePayDialog
        open={!!payOrder}
        onOpenChange={(open) => !open && setPayOrder(null)}
        serviceOrder={
          payOrder
            ? {
                kind: "radiology",
                orderNumber: payOrder.orderNumber,
                patientId: payOrder.patientId,
                patientName: `${payOrder.firstName || ""} ${payOrder.lastName || ""}`.trim(),
              }
            : null
        }
        onPaid={() => void loadOrders()}
      />
    </div>
  )
}

// Exam Type Form Component
function ExamTypeForm({ examType, onSave, onCancel }: { examType: ExamType | null, onSave: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    examCode: examType?.examCode || '',
    examName: examType?.examName || '',
    category: examType?.category || '',
    duration: examType?.duration || '',
    cost: (examType?.cost || examType?.unitPrice)?.toString() || '',
    description: examType?.description || '',
  })

  // Update form data when examType changes (for edit mode)
  useEffect(() => {
    if (examType) {
      setFormData({
        examCode: examType.examCode || '',
        examName: examType.examName || '',
        category: examType.category || '',
        duration: examType.duration || '',
        cost: (examType.cost || examType.unitPrice)?.toString() || '',
        description: examType.description || '',
      })
    } else {
      // Reset form for create mode
      setFormData({
        examCode: '',
        examName: '',
        category: '',
        duration: '',
        cost: '',
        description: '',
      })
    }
  }, [examType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Exam Code</label>
          <Input
            value={formData.examCode}
            onChange={(e) => setFormData({ ...formData, examCode: e.target.value })}
            placeholder="e.g., XR-CHEST"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Exam Name *</label>
          <Input
            value={formData.examName}
            onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
            placeholder="e.g., Chest X-Ray"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <Input
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., X-Ray, Ultrasound, CT Scan, MRI"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Duration</label>
          <Input
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="e.g., 15 min, 30 min"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Price</label>
          <Input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter description..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.examName}>
          {examType ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

// Examination Results Form Component — persists to radiology_exams / radiology_reports
function ExaminationResultsForm({
  order,
  onSave,
  onCancel,
  saving
}: {
  order: RadiologyOrder | null
  onSave: (payload: { findings?: string; impression?: string; recommendations?: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [findings, setFindings] = useState("")
  const [impression, setImpression] = useState("")
  const [recommendations, setRecommendations] = useState("")
  const [cdsAlerts, setCdsAlerts] = useState<{ message: string }[]>([])

  useEffect(() => {
    setFindings("")
    setImpression("")
    setRecommendations("")
    setCdsAlerts([])
  }, [order?.orderId])

  const radCdsText = useMemo(
    () => [findings, impression, recommendations].filter((s) => s?.trim()).join(" ").trim(),
    [findings, impression, recommendations]
  )

  useEffect(() => {
    if (radCdsText.length < 4) {
      setCdsAlerts([])
      return
    }
    const pid = Number(order?.patientId || 0)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const r = await clinicalCdsApi.evaluate({
            ...(pid > 0 ? { patientId: pid } : {}),
            clinicalText: radCdsText,
          })
          setCdsAlerts(r.alerts || [])
        } catch {
          setCdsAlerts([])
        }
      })()
    }, 600)
    return () => clearTimeout(timer)
  }, [radCdsText, order?.patientId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ findings, impression, recommendations })
  }

  if (!order) return null

  const getPatientName = () => {
    if (order.firstName && order.lastName) {
      return `${order.firstName} ${order.lastName}`
    }
    return order.patientNumber || `Patient #${order.patientId}`
  }

  const getDoctorName = () => {
    if (order.doctorFirstName && order.doctorLastName) {
      return `Dr. ${order.doctorFirstName} ${order.doctorLastName}`
    }
    return 'Unknown Doctor'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Examination Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">Order Number:</span>
              <p className="font-mono font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Order Date:</span>
              <p>{format(new Date(order.orderDate), "PPP")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground font-medium">Examination:</span>
              <p className="font-semibold">
                {order.examName || 'Unknown Examination'}
                {order.examCode && <span className="text-muted-foreground ml-2">({order.examCode})</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Patient:</span>
              <p>{getPatientName()}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Ordered By:</span>
              <p>{getDoctorName()}</p>
            </div>
          </div>
          {order.clinicalIndication && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground font-medium text-sm block mb-1">Clinical Indication:</span>
              <p className="text-sm">{order.clinicalIndication}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {cdsAlerts.length > 0 ? (
        <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950/40">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-1 font-medium">Clinical decision support (radiology context)</p>
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {cdsAlerts.map((a, i) => (
                <li key={i}>{a.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-1">
        <div className="space-y-1">
          <label className="text-sm font-medium">Findings</label>
          <Textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Examination findings…"
            className="min-h-[100px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Impression</label>
          <Textarea
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="Radiologist impression…"
            className="min-h-[80px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Recommendations</label>
          <Textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Follow-up or clinical recommendations (optional)"
            className="min-h-[64px] text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Saves to radiology reports and marks the order completed. Order must be paid (not awaiting payment).
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save report'
          )}
        </Button>
      </div>
    </form>
  )
}

// Edit Order Form Component
function EditOrderForm({
  order,
  onSave,
  onCancel,
  saving
}: {
  order: any
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    examTypeId: order?.examTypeId?.toString() || '',
    priority: order?.priority || 'routine',
    clinicalIndication: order?.clinicalIndication || '',
    bodyPart: order?.bodyPart || '',
    scheduledDate: order?.scheduledDate ? new Date(order.scheduledDate).toISOString().slice(0, 16) : '',
    notes: order?.notes || '',
  })
  const [examTypes, setExamTypes] = useState<any[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)

  useEffect(() => {
    loadExamTypes()
  }, [])

  useEffect(() => {
    if (order) {
      setFormData({
        examTypeId: order.examTypeId?.toString() || '',
        priority: order.priority || 'routine',
        clinicalIndication: order.clinicalIndication || '',
        bodyPart: order.bodyPart || '',
        scheduledDate: order.scheduledDate ? new Date(order.scheduledDate).toISOString().slice(0, 16) : '',
        notes: order.notes || '',
      })
    }
  }, [order])

  const loadExamTypes = async () => {
    try {
      setLoadingTypes(true)
      const data = await radiologyApi.getExamTypes()
      setExamTypes(data)
    } catch (err: any) {
      console.error('Error loading exam types:', err)
    } finally {
      setLoadingTypes(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      examTypeId: formData.examTypeId ? parseInt(formData.examTypeId) : undefined,
      priority: formData.priority,
      clinicalIndication: formData.clinicalIndication || null,
      bodyPart: formData.bodyPart || null,
      scheduledDate: formData.scheduledDate || null,
      notes: formData.notes || null,
    })
  }

  if (!order) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Examination Type *</label>
          {loadingTypes ? (
            <div className="flex items-center py-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <select
              value={formData.examTypeId}
              onChange={(e) => setFormData({ ...formData, examTypeId: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md"
              required
            >
              <option value="">Select examination type</option>
              {examTypes.map((type) => (
                <option key={type.examTypeId} value={type.examTypeId.toString()}>
                  {type.examName} {type.examCode ? `(${type.examCode})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Priority *</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-md"
            required
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">Stat</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Body Part</label>
          <Input
            value={formData.bodyPart}
            onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
            placeholder="e.g., Chest, Head, Knee"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Scheduled Date</label>
          <Input
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Clinical Indication *</label>
        <Textarea
          value={formData.clinicalIndication}
          onChange={(e) => setFormData({ ...formData, clinicalIndication: e.target.value })}
          placeholder="Enter clinical information and reason for examination..."
          className="min-h-[100px]"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Additional Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any additional notes or instructions..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !formData.examTypeId || !formData.clinicalIndication}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}
