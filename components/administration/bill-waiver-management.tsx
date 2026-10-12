"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, CheckCircle, XCircle, Eye, DollarSign, Loader2, FileText, User, Building2, ExternalLink, ChevronRight, ChevronLeft } from "lucide-react"
import * as React from "react"
import { StaffCombobox } from "@/components/staff-combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { waiverApi, billingApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function BillWaiverManagement() {
  const [isMounted, setIsMounted] = useState(false)
  const [waivers, setWaivers] = useState<any[]>([])
  const [waiverTypes, setWaiverTypes] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [responsibilityFilter, setResponsibilityFilter] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false)
  const [selectedWaiver, setSelectedWaiver] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  // New waiver creation flow state
  const [patientsWithBills, setPatientsWithBills] = useState<any[]>([])
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientInvoices, setPatientInvoices] = useState<any[]>([])
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [invoiceWaiverAmounts, setInvoiceWaiverAmounts] = useState<Record<number, number>>({})
  const [waiverStep, setWaiverStep] = useState<"patient" | "invoices" | "details">("patient")
  const [allowMultipleBills, setAllowMultipleBills] = useState(true)

  // Bulk approval flow state
  const [bulkApproveStep, setBulkApproveStep] = useState<"patient" | "waivers">("patient")
  const [bulkApprovePatientSearch, setBulkApprovePatientSearch] = useState("")
  const [bulkApproveSelectedPatient, setBulkApproveSelectedPatient] = useState<any>(null)
  const [patientPendingWaivers, setPatientPendingWaivers] = useState<any[]>([])
  const [selectedWaiversForApproval, setSelectedWaiversForApproval] = useState<Set<number>>(new Set())
  const [approvalNotes, setApprovalNotes] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    invoiceId: "",
    patientId: "",
    waiverTypeId: "",
    waivedAmount: "",
    waiverPercentage: "",
    reason: "",
    justification: "",
    responsibleStaffId: "",
    externalPartyName: "",
    externalPartyContact: "",
    externalPartyNotes: "",
    notes: "",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadWaivers()
      loadWaiverTypes()
      loadStats()
    }
  }, [isMounted, statusFilter, responsibilityFilter])

  useEffect(() => {
    if (isFormOpen && waiverStep === "patient" && !patientSearchQuery) {
      loadPatientsWithBills()
    }
  }, [isFormOpen, waiverStep])

  // Debounced search for patients with bills
  useEffect(() => {
    if (!isFormOpen || waiverStep !== "patient") return

    const timeoutId = setTimeout(() => {
      loadPatientsWithBills()
    }, 300) // Debounce for 300ms

    return () => clearTimeout(timeoutId)
  }, [patientSearchQuery, isFormOpen, waiverStep])

  const loadWaivers = async () => {
    try {
      setLoading(true)
      const data = await waiverApi.getAll(statusFilter || undefined, responsibilityFilter || undefined, undefined, undefined, undefined, searchQuery || undefined)
      setWaivers(data || [])
    } catch (error: any) {
      console.error("Error loading waivers:", error)
      toast({
        title: "Error loading waivers",
        description: error.message || "Failed to load waivers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadWaiverTypes = async () => {
    try {
      const data = await waiverApi.getWaiverTypes(true)
      setWaiverTypes(data || [])
    } catch (error: any) {
      console.error("Error loading waiver types:", error)
    }
  }

  const loadStats = async () => {
    try {
      const data = await waiverApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    }
  }

  const loadInvoices = async (patientId?: string) => {
    try {
      const data = await billingApi.getInvoices(patientId, "pending,partial")
      setInvoices(data || [])
    } catch (error: any) {
      console.error("Error loading invoices:", error)
    }
  }

  const loadPatientsWithBills = async () => {
    try {
      const data = await waiverApi.getPatientsWithOutstandingBills(patientSearchQuery || undefined)
      setPatientsWithBills(data || [])
    } catch (error: any) {
      console.error("Error loading patients with bills:", error)
      toast({
        title: "Error loading patients",
        description: error.message || "Failed to load patients with outstanding bills",
        variant: "destructive",
      })
    }
  }

  const loadPatientInvoices = async (patientId: string) => {
    try {
      const data = await billingApi.getPendingInvoicesForPatient(patientId)
      setPatientInvoices(data || [])

      // Select all invoices by default and set default waiver amounts
      const invoiceIds = new Set<number>()
      const amounts: Record<number, number> = {}

      data.forEach((inv: any) => {
        invoiceIds.add(inv.invoiceId)
        amounts[inv.invoiceId] = parseFloat(inv.balance || 0)
      })

      setSelectedInvoices(invoiceIds)
      setInvoiceWaiverAmounts(amounts)
    } catch (error: any) {
      console.error("Error loading patient invoices:", error)
      toast({
        title: "Error loading invoices",
        description: error.message || "Failed to load patient invoices",
        variant: "destructive",
      })
    }
  }

  const loadPatientsWithPendingWaivers = async (search?: string): Promise<any[]> => {
    try {
      // Get all pending waivers and group by patient
      const pendingWaivers = await waiverApi.getAll("pending", undefined, undefined, undefined, undefined, search)
      const patientMap = new Map<number, any>()

      pendingWaivers.forEach((waiver: any) => {
        const patientId = waiver.patientId
        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            patientId: patientId,
            firstName: waiver.patientFirstName || waiver.firstName,
            lastName: waiver.patientLastName || waiver.lastName,
            patientNumber: waiver.patientNumber,
            phone: waiver.phone,
            pendingWaiverCount: 0,
            totalPendingAmount: 0,
          })
        }
        const patient = patientMap.get(patientId)
        patient.pendingWaiverCount += 1
        patient.totalPendingAmount += parseFloat(waiver.waivedAmount || 0)
      })

      return Array.from(patientMap.values())
    } catch (error: any) {
      console.error("Error loading patients with pending waivers:", error)
      toast({
        title: "Error loading patients",
        description: error.message || "Failed to load patients with pending waivers",
        variant: "destructive",
      })
      return []
    }
  }

  const loadPatientPendingWaivers = async (patientId: string) => {
    try {
      const data = await waiverApi.getAll("pending", undefined, undefined, patientId)
      setPatientPendingWaivers(data || [])

      // Select all by default
      const waiverIds = new Set<number>()
      data.forEach((waiver: any) => {
        waiverIds.add(waiver.waiverId)
      })
      setSelectedWaiversForApproval(waiverIds)
    } catch (error: any) {
      console.error("Error loading patient pending waivers:", error)
      toast({
        title: "Error loading waivers",
        description: error.message || "Failed to load pending waivers for patient",
        variant: "destructive",
      })
    }
  }

  const handleBulkApprove = async () => {
    if (selectedWaiversForApproval.size === 0) {
      toast({
        title: "No waivers selected",
        description: "Please select at least one waiver to approve",
        variant: "destructive",
      })
      return
    }

    try {
      setBulkApproveLoading(true)
      const userId = localStorage.getItem("userId") || "1"

      const approvalPromises = Array.from(selectedWaiversForApproval).map(async (waiverId) => {
        try {
          await waiverApi.approve(waiverId.toString(), {
            approvedBy: userId,
            notes: approvalNotes || "Bulk approved",
          })
          return { success: true, waiverId }
        } catch (error: any) {
          console.error(`Error approving waiver ${waiverId}:`, error)
          return { success: false, waiverId, error: error.message || "Failed to approve" }
        }
      })

      const results = await Promise.all(approvalPromises)
      const successful = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      if (failed.length > 0) {
        toast({
          title: "Partial Success",
          description: `Approved ${successful.length} waiver(s), but ${failed.length} failed. ${failed.map((f) => f.error).join(", ")}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Waivers Approved",
          description: `Successfully approved ${successful.length} waiver(s).`,
        })
      }

      setIsBulkApproveOpen(false)
      setBulkApproveSelectedPatient(null)
      setPatientPendingWaivers([])
      setSelectedWaiversForApproval(new Set())
      setApprovalNotes("")
      setBulkApproveStep("patient")
      loadWaivers()
      loadStats()
    } catch (error: any) {
      console.error("Error bulk approving waivers:", error)
      toast({
        title: "Error approving waivers",
        description: error.message || "Failed to approve waivers",
        variant: "destructive",
      })
    } finally {
      setBulkApproveLoading(false)
    }
  }

  const handleOpenBulkApprove = () => {
    setBulkApproveStep("patient")
    setBulkApproveSelectedPatient(null)
    setPatientPendingWaivers([])
    setSelectedWaiversForApproval(new Set())
    setApprovalNotes("")
    setBulkApprovePatientSearch("")
    setIsBulkApproveOpen(true)
  }

  const handleCreateWaiver = async () => {
    setSelectedWaiver(null)
    setSelectedPatient(null)
    setPatientInvoices([])
    setSelectedInvoices(new Set())
    setInvoiceWaiverAmounts({})
    setWaiverStep("patient")
    setPatientSearchQuery("")
    setAllowMultipleBills(true)
    setFormData({
      invoiceId: "",
      patientId: "",
      waiverTypeId: "",
      waivedAmount: "",
      waiverPercentage: "",
      reason: "",
      justification: "",
      responsibleStaffId: "",
      externalPartyName: "",
      externalPartyContact: "",
      externalPartyNotes: "",
      notes: "",
    })
    await loadPatientsWithBills()
    setIsFormOpen(true)
  }

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient)
    await loadPatientInvoices(patient.patientId.toString())
    setWaiverStep("invoices")
  }

  const handleToggleInvoice = (invoiceId: number, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
      // Set default waiver amount to invoice balance
      const invoice = patientInvoices.find((inv) => inv.invoiceId === invoiceId)
      if (invoice) {
        setInvoiceWaiverAmounts({
          ...invoiceWaiverAmounts,
          [invoiceId]: parseFloat(invoice.balance || 0),
        })
      }
    } else {
      newSelected.delete(invoiceId)
      const newAmounts = { ...invoiceWaiverAmounts }
      delete newAmounts[invoiceId]
      setInvoiceWaiverAmounts(newAmounts)
    }
    setSelectedInvoices(newSelected)
  }

  const handleInvoiceAmountChange = (invoiceId: number, amount: string) => {
    const numAmount = parseFloat(amount) || 0
    setInvoiceWaiverAmounts({
      ...invoiceWaiverAmounts,
      [invoiceId]: numAmount,
    })
  }

  const handleProceedToDetails = () => {
    if (selectedInvoices.size === 0) {
      toast({
        title: "No invoices selected",
        description: "Please select at least one invoice to waive",
        variant: "destructive",
      })
      return
    }
    setWaiverStep("details")
  }

  const handleWaiverTypeChange = (waiverTypeId: string) => {
    const waiverType = waiverTypes.find((wt) => wt.waiverTypeId.toString() === waiverTypeId)
    if (waiverType) {
      setFormData({
        ...formData,
        waiverTypeId,
        responsibleStaffId: waiverType.responsibility === "staff" ? "" : "",
      })
    }
  }

  const handleSaveWaiver = async () => {
    try {
      setFormLoading(true)

      if (!formData.waiverTypeId || !formData.reason) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        setFormLoading(false)
        return
      }

      if (selectedInvoices.size === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one invoice",
          variant: "destructive",
        })
        setFormLoading(false)
        return
      }

      // Validate all selected invoices have valid amounts
      for (const invoiceId of selectedInvoices) {
        const invoice = patientInvoices.find((inv) => inv.invoiceId === invoiceId)
        if (!invoice) continue

        const waivedAmount = invoiceWaiverAmounts[invoiceId] || 0
        if (waivedAmount <= 0) {
          toast({
            title: "Validation Error",
            description: `Please enter a valid waiver amount for invoice ${invoice.invoiceNumber}`,
            variant: "destructive",
          })
          setFormLoading(false)
          return
        }

        if (waivedAmount > parseFloat(invoice.balance || 0)) {
          toast({
            title: "Validation Error",
            description: `Waived amount for ${invoice.invoiceNumber} cannot exceed invoice balance`,
            variant: "destructive",
          })
          setFormLoading(false)
          return
        }
      }

      // Validate selected patient exists
      if (!selectedPatient || !selectedPatient.patientId) {
        toast({
          title: "Validation Error",
          description: "Patient information is missing. Please select a patient again.",
          variant: "destructive",
        })
        setFormLoading(false)
        return
      }

      // Get current user ID
      const userId = localStorage.getItem("userId") || "1"

      // Ensure patientId is a number
      const patientIdNum = typeof selectedPatient.patientId === 'number'
        ? selectedPatient.patientId
        : parseInt(selectedPatient.patientId)

      if (!patientIdNum || isNaN(patientIdNum)) {
        toast({
          title: "Validation Error",
          description: `Invalid patient ID: ${selectedPatient.patientId}`,
          variant: "destructive",
        })
        setFormLoading(false)
        return
      }

      // Create waivers for each selected invoice
      const waiverPromises = Array.from(selectedInvoices).map(async (invoiceId) => {
        const invoice = patientInvoices.find((inv) => inv.invoiceId === invoiceId)
        if (!invoice) return { success: false, invoiceId, error: "Invoice not found" }

        const waivedAmount = invoiceWaiverAmounts[invoiceId] || 0
        const waiverPercentage = (waivedAmount / parseFloat(invoice.balance || 1)) * 100

        try {
          const waiverData = {
            invoiceId: invoiceId,
            patientId: patientIdNum,
            waiverTypeId: parseInt(formData.waiverTypeId),
            waivedAmount: waivedAmount,
            waiverPercentage: waiverPercentage,
            reason: formData.reason,
            justification: formData.justification || undefined,
            responsibleStaffId: formData.responsibleStaffId ? parseInt(formData.responsibleStaffId) : undefined,
            externalPartyName: formData.externalPartyName || undefined,
            externalPartyContact: formData.externalPartyContact || undefined,
            externalPartyNotes: formData.externalPartyNotes || undefined,
            notes: formData.notes || undefined,
            requestedBy: parseInt(userId),
          }

          console.log('Creating waiver with data:', waiverData)

          const result = await waiverApi.create(waiverData)
          console.log('Waiver created successfully:', result)
          return { success: true, invoiceId, result }
        } catch (error: any) {
          console.error(`Error creating waiver for invoice ${invoiceId}:`, error)
          // Extract error message from various possible locations in the error object
          // The API returns { message: "..." }, which apiRequest extracts to error.message
          // But we also check error.response in case the structure is different
          let errorMessage = "Failed to create waiver"
          if (typeof error === 'string') {
            errorMessage = error
          } else if (error?.message) {
            errorMessage = error.message
          } else if (error?.error) {
            errorMessage = error.error
          } else if (error?.response?.message) {
            errorMessage = error.response.message
          } else if (error?.response?.error) {
            errorMessage = error.response.error
          }
          return { success: false, invoiceId, error: errorMessage, invoiceNumber: invoice.invoiceNumber }
        }
      })

      const results = await Promise.all(waiverPromises)
      const successful = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      if (failed.length > 0) {
        // If all waivers failed, show a clear error message
        if (successful.length === 0) {
          const errorMessages = failed.map((f) => {
            const invoiceInfo = f.invoiceNumber ? ` (Invoice: ${f.invoiceNumber})` : ''
            return `${f.error}${invoiceInfo}`
          }).join("\n")

          toast({
            title: "Failed to Create Waivers",
            description: errorMessages.length > 200
              ? `${errorMessages.substring(0, 200)}...`
              : errorMessages,
            variant: "destructive",
            duration: 10000, // Show for 10 seconds so user can read it
          })
          // Don't close dialog so user can fix the issue
        } else {
          // Some succeeded, some failed
          const errorMessages = failed.map((f) => {
            const invoiceInfo = f.invoiceNumber ? ` (Invoice: ${f.invoiceNumber})` : ''
            return `${f.error}${invoiceInfo}`
          }).join(", ")

          toast({
            title: "Partial Success",
            description: `Created ${successful.length} waiver(s), but ${failed.length} failed. ${errorMessages}`,
            variant: "destructive",
            duration: 10000,
          })
          // Close dialog and reload if at least one succeeded
          setIsFormOpen(false)
          loadWaivers()
          loadStats()
        }
      } else {
        toast({
          title: "Waivers Created",
          description: `Successfully created ${successful.length} waiver(s).`,
        })
        setIsFormOpen(false)
        loadWaivers()
        loadStats()
      }
    } catch (error: any) {
      console.error("Error saving waiver:", error)
      toast({
        title: "Error saving waiver",
        description: error.message || "Failed to save waiver",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleViewWaiver = async (waiver: any) => {
    try {
      const fullWaiver = await waiverApi.getById(waiver.waiverId.toString())
      setSelectedWaiver(fullWaiver)
      setIsViewOpen(true)
    } catch (error: any) {
      console.error("Error loading waiver details:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load waiver details",
        variant: "destructive",
      })
    }
  }

  const handleApprove = async () => {
    if (!selectedWaiver) return

    try {
      setApproveLoading(true)
      const userId = localStorage.getItem("userId") || "1"

      await waiverApi.approve(selectedWaiver.waiverId.toString(), {
        approvedBy: userId,
        notes: "Waiver approved",
      })

      toast({
        title: "Waiver Approved",
        description: "The waiver has been approved successfully.",
      })

      setIsApproveOpen(false)
      setIsViewOpen(false)
      loadWaivers()
      loadStats()
    } catch (error: any) {
      console.error("Error approving waiver:", error)
      toast({
        title: "Error approving waiver",
        description: error.message || "Failed to approve waiver",
        variant: "destructive",
      })
    } finally {
      setApproveLoading(false)
    }
  }

  const handleReject = async (rejectionReason: string) => {
    if (!selectedWaiver || !rejectionReason) return

    try {
      setRejectLoading(true)
      const userId = localStorage.getItem("userId") || "1"

      await waiverApi.reject(selectedWaiver.waiverId.toString(), {
        rejectedBy: userId,
        rejectionReason,
      })

      toast({
        title: "Waiver Rejected",
        description: "The waiver has been rejected.",
      })

      setIsRejectOpen(false)
      setIsViewOpen(false)
      loadWaivers()
      loadStats()
    } catch (error: any) {
      console.error("Error rejecting waiver:", error)
      toast({
        title: "Error rejecting waiver",
        description: error.message || "Failed to reject waiver",
        variant: "destructive",
      })
    } finally {
      setRejectLoading(false)
    }
  }

  const filteredWaivers = waivers.filter((waiver) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return (
        waiver.waiverNumber?.toLowerCase().includes(search) ||
        waiver.invoiceNumber?.toLowerCase().includes(search) ||
        waiver.patientNumber?.toLowerCase().includes(search) ||
        `${waiver.firstName} ${waiver.lastName}`.toLowerCase().includes(search) ||
        waiver.waiverTypeName?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const selectedWaiverType = waiverTypes.find((wt) => wt.waiverTypeId.toString() === formData.waiverTypeId)
  const selectedInvoice = invoices.find((inv) => inv.invoiceId.toString() === formData.invoiceId)

  // Calculate total waived amount from selected invoices
  const totalWaivedAmount = Array.from(selectedInvoices).reduce((sum, invoiceId) => {
    return sum + (invoiceWaiverAmounts[invoiceId] || 0)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Waivers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWaivers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Waived</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                  stats.totalWaivedAmount || 0
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byStatus?.find((s: any) => s.status === "pending")?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byStatus?.find((s: any) => s.status === "approved")?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bill Waivers</CardTitle>
              <CardDescription>Manage patient bill waivers and approvals</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenBulkApprove} variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk Approve
              </Button>
              <Button onClick={handleCreateWaiver}>
                <Plus className="h-4 w-4 mr-2" />
                Create Waiver
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search waivers, invoices, patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={responsibilityFilter || "all"}
              onValueChange={(v) => setResponsibilityFilter(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by responsibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responsibility</SelectItem>
                <SelectItem value="hospital">Hospital</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredWaivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No waivers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waiver Number</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Responsibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaivers.map((waiver) => (
                  <TableRow key={waiver.waiverId}>
                    <TableCell className="font-medium">{waiver.waiverNumber}</TableCell>
                    <TableCell>{waiver.invoiceNumber}</TableCell>
                    <TableCell>
                      {waiver.firstName} {waiver.lastName}
                      <br />
                      <span className="text-xs text-muted-foreground">{waiver.patientNumber}</span>
                    </TableCell>
                    <TableCell>{waiver.waiverTypeName}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                        waiver.waivedAmount || 0
                      )}
                      {waiver.isFullWaiver && (
                        <Badge variant="outline" className="ml-2">
                          Full
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          waiver.responsibility === "hospital"
                            ? "default"
                            : waiver.responsibility === "staff"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {waiver.responsibility === "hospital" && <Building2 className="h-3 w-3 mr-1" />}
                        {waiver.responsibility === "staff" && <User className="h-3 w-3 mr-1" />}
                        {waiver.responsibility === "external" && <ExternalLink className="h-3 w-3 mr-1" />}
                        {waiver.responsibility}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          waiver.status === "approved"
                            ? "default"
                            : waiver.status === "pending"
                            ? "secondary"
                            : waiver.status === "rejected"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {waiver.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {waiver.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                        {waiver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {waiver.requestedAt
                        ? format(new Date(waiver.requestedAt), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewWaiver(waiver)}>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Waiver Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Bill Waiver</DialogTitle>
            <DialogDescription>
              {waiverStep === "patient" && "Select a patient with outstanding bills"}
              {waiverStep === "invoices" && "Select invoices to waive"}
              {waiverStep === "details" && "Configure waiver details"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select Patient */}
          {waiverStep === "patient" && (
            <div className="space-y-4">
              <div>
                <Label>Search Patients</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name, patient number, or phone..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadPatientsWithBills}
                    size="icon"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Patient Number</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Outstanding Invoices</TableHead>
                      <TableHead>Total Outstanding</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsWithBills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No patients with outstanding bills found
                        </TableCell>
                      </TableRow>
                    ) : (
                      patientsWithBills.map((patient) => (
                        <TableRow key={patient.patientId}>
                          <TableCell className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </TableCell>
                          <TableCell>{patient.patientNumber}</TableCell>
                          <TableCell>{patient.phone || "-"}</TableCell>
                          <TableCell>{patient.invoiceCount}</TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                              parseFloat(patient.totalOutstanding || 0)
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSelectPatient(patient)}
                              variant="outline"
                            >
                              Select <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Step 2: Select Invoices */}
          {waiverStep === "invoices" && selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.patientNumber} • {selectedPatient.phone || "No phone"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWaiverStep("patient")
                    setSelectedPatient(null)
                    setPatientInvoices([])
                    setSelectedInvoices(new Set())
                    setInvoiceWaiverAmounts({})
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Change Patient
                </Button>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="allowMultiple"
                  checked={allowMultipleBills}
                  onCheckedChange={(checked) => {
                    setAllowMultipleBills(checked as boolean)
                    if (!checked && selectedInvoices.size > 1) {
                      // Keep only the first selected invoice
                      const firstInvoiceId = Array.from(selectedInvoices)[0]
                      setSelectedInvoices(new Set([firstInvoiceId]))
                    }
                  }}
                />
                <Label htmlFor="allowMultiple" className="cursor-pointer">
                  Allow waiving multiple bills
                </Label>
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={patientInvoices.length > 0 && selectedInvoices.size === patientInvoices.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const allIds = new Set(patientInvoices.map((inv) => inv.invoiceId))
                              const amounts: Record<number, number> = {}
                              patientInvoices.forEach((inv) => {
                                amounts[inv.invoiceId] = parseFloat(inv.balance || 0)
                              })
                              setSelectedInvoices(allIds)
                              setInvoiceWaiverAmounts(amounts)
                            } else {
                              setSelectedInvoices(new Set())
                              setInvoiceWaiverAmounts({})
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Waived Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No outstanding invoices found for this patient
                        </TableCell>
                      </TableRow>
                    ) : (
                      patientInvoices.map((invoice) => {
                        const isSelected = selectedInvoices.has(invoice.invoiceId)
                        const waivedAmount = invoiceWaiverAmounts[invoice.invoiceId] || 0
                        const balance = parseFloat(invoice.balance || 0)

                        return (
                          <TableRow key={invoice.invoiceId}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (!allowMultipleBills && checked && selectedInvoices.size > 0) {
                                    toast({
                                      title: "Multiple bills disabled",
                                      description: "Please uncheck 'Allow waiving multiple bills' or deselect other invoices first",
                                      variant: "destructive",
                                    })
                                    return
                                  }
                                  handleToggleInvoice(invoice.invoiceId, checked as boolean)
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>
                              {invoice.invoiceDate
                                ? format(new Date(invoice.invoiceDate), "MMM dd, yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                                parseFloat(invoice.totalAmount || 0)
                              )}
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                                balance
                              )}
                            </TableCell>
                            <TableCell>
                              {isSelected ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={balance}
                                  value={waivedAmount}
                                  onChange={(e) => handleInvoiceAmountChange(invoice.invoiceId, e.target.value)}
                                  className="w-32"
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {selectedInvoices.size > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Invoices</p>
                      <p className="font-medium">{selectedInvoices.size} invoice(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Waived Amount</p>
                      <p className="text-lg font-bold text-green-600">
                        {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                          totalWaivedAmount
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Waiver Details */}
          {waiverStep === "details" && selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoices.size} invoice(s) selected • Total:{" "}
                    {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                      totalWaivedAmount
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWaiverStep("invoices")}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Invoices
                </Button>
              </div>

              <div>
                <Label htmlFor="waiverTypeId">Waiver Type *</Label>
                <Select
                  value={formData.waiverTypeId}
                  onValueChange={(value) => handleWaiverTypeChange(value)}
                >
                  <SelectTrigger id="waiverTypeId">
                    <SelectValue placeholder="Select waiver type" />
                  </SelectTrigger>
                  <SelectContent>
                    {waiverTypes.map((type) => (
                      <SelectItem key={type.waiverTypeId} value={type.waiverTypeId.toString()}>
                        {type.typeName} ({type.responsibility})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for waiver"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Provide detailed justification"
                  rows={3}
                />
              </div>

              {selectedWaiverType?.responsibility === "staff" && (
                <div>
                  <Label htmlFor="responsibleStaffId">Responsible Staff *</Label>
                  <StaffCombobox
                    value={formData.responsibleStaffId}
                    onValueChange={(value) => setFormData({ ...formData, responsibleStaffId: value })}
                    placeholder="Search and select responsible staff member..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the staff member who will be responsible for paying this waived amount
                  </p>
                </div>
              )}

              {selectedWaiverType?.responsibility === "external" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="externalPartyName">External Party Name</Label>
                      <Input
                        id="externalPartyName"
                        value={formData.externalPartyName}
                        onChange={(e) => setFormData({ ...formData, externalPartyName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="externalPartyContact">Contact</Label>
                      <Input
                        id="externalPartyContact"
                        value={formData.externalPartyContact}
                        onChange={(e) => setFormData({ ...formData, externalPartyContact: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="externalPartyNotes">External Party Notes</Label>
                    <Textarea
                      id="externalPartyNotes"
                      value={formData.externalPartyNotes}
                      onChange={(e) => setFormData({ ...formData, externalPartyNotes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            {waiverStep === "patient" && (
              <Button onClick={() => setIsFormOpen(false)}>Close</Button>
            )}
            {waiverStep === "invoices" && (
              <Button onClick={handleProceedToDetails} disabled={selectedInvoices.size === 0}>
                Proceed to Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {waiverStep === "details" && (
              <Button onClick={handleSaveWaiver} disabled={formLoading || !formData.waiverTypeId || !formData.reason}>
                {formLoading ? "Creating..." : `Create ${selectedInvoices.size} Waiver(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Waiver Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Waiver Details</DialogTitle>
            <DialogDescription>View complete waiver information</DialogDescription>
          </DialogHeader>
          {selectedWaiver && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Waiver Number</Label>
                  <p className="font-medium">{selectedWaiver.waiverNumber}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge
                    variant={
                      selectedWaiver.status === "approved"
                        ? "default"
                        : selectedWaiver.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {selectedWaiver.status}
                  </Badge>
                </div>
                <div>
                  <Label>Invoice</Label>
                  <p>{selectedWaiver.invoiceNumber}</p>
                </div>
                <div>
                  <Label>Patient</Label>
                  <p>
                    {selectedWaiver.firstName} {selectedWaiver.lastName}
                  </p>
                </div>
                <div>
                  <Label>Waiver Type</Label>
                  <p>{selectedWaiver.waiverTypeName}</p>
                </div>
                <div>
                  <Label>Responsibility</Label>
                  <Badge>{selectedWaiver.responsibility}</Badge>
                </div>
                <div>
                  <Label>Original Amount</Label>
                  <p>
                    {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                      selectedWaiver.originalAmount || 0
                    )}
                  </p>
                </div>
                <div>
                  <Label>Waived Amount</Label>
                  <p className="font-bold text-green-600">
                    {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                      selectedWaiver.waivedAmount || 0
                    )}
                  </p>
                </div>
                <div>
                  <Label>Reason</Label>
                  <p>{selectedWaiver.reason}</p>
                </div>
                {selectedWaiver.justification && (
                  <div>
                    <Label>Justification</Label>
                    <p>{selectedWaiver.justification}</p>
                  </div>
                )}
              </div>

              {selectedWaiver.approvalHistory && selectedWaiver.approvalHistory.length > 0 && (
                <div>
                  <Label>Approval History</Label>
                  <div className="space-y-2 mt-2">
                    {selectedWaiver.approvalHistory.map((history: any, idx: number) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{history.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(history.performedAt), "MMM dd, yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          By: {history.firstName} {history.lastName}
                        </p>
                        {history.notes && <p className="text-sm mt-1">{history.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedWaiver.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsApproveOpen(true)
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setIsRejectOpen(true)
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Waiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this waiver? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approveLoading}>
              {approveLoading ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Waiver</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this waiver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              id="rejectionReason"
              placeholder="Enter rejection reason..."
              rows={3}
              onChange={(e) => {
                if (selectedWaiver) {
                  setSelectedWaiver({ ...selectedWaiver, rejectionReason: e.target.value })
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedWaiver?.rejectionReason) {
                  handleReject(selectedWaiver.rejectionReason)
                }
              }}
              disabled={rejectLoading || !selectedWaiver?.rejectionReason}
              className="bg-destructive text-destructive-foreground"
            >
              {rejectLoading ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={isBulkApproveOpen} onOpenChange={setIsBulkApproveOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Approve Waivers</DialogTitle>
            <DialogDescription>
              {bulkApproveStep === "patient" && "Select a patient with pending waivers"}
              {bulkApproveStep === "waivers" && "Select waivers to approve"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select Patient */}
          {bulkApproveStep === "patient" && (
            <BulkApprovePatientStep
              searchQuery={bulkApprovePatientSearch}
              onSearchChange={setBulkApprovePatientSearch}
              onPatientSelect={async (patient) => {
                setBulkApproveSelectedPatient(patient)
                await loadPatientPendingWaivers(patient.patientId.toString())
                setBulkApproveStep("waivers")
              }}
              onLoadPatients={loadPatientsWithPendingWaivers}
            />
          )}

          {/* Step 2: Select Waivers */}
          {bulkApproveStep === "waivers" && bulkApproveSelectedPatient && (
            <BulkApproveWaiversStep
              patient={bulkApproveSelectedPatient}
              waivers={patientPendingWaivers}
              selectedWaivers={selectedWaiversForApproval}
              onSelectedWaiversChange={setSelectedWaiversForApproval}
              approvalNotes={approvalNotes}
              onApprovalNotesChange={setApprovalNotes}
              onBack={() => {
                setBulkApproveStep("patient")
                setBulkApproveSelectedPatient(null)
                setPatientPendingWaivers([])
                setSelectedWaiversForApproval(new Set())
              }}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkApproveOpen(false)}>
              Cancel
            </Button>
            {bulkApproveStep === "patient" && (
              <Button onClick={() => setIsBulkApproveOpen(false)}>Close</Button>
            )}
            {bulkApproveStep === "waivers" && (
              <Button
                onClick={handleBulkApprove}
                disabled={bulkApproveLoading || selectedWaiversForApproval.size === 0}
              >
                {bulkApproveLoading
                  ? "Approving..."
                  : `Approve ${selectedWaiversForApproval.size} Waiver(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Bulk Approve Patient Selection Step Component
function BulkApprovePatientStep({
  searchQuery,
  onSearchChange,
  onPatientSelect,
  onLoadPatients,
}: {
  searchQuery: string
  onSearchChange: (query: string) => void
  onPatientSelect: (patient: any) => void
  onLoadPatients: (search?: string) => Promise<any[]>
}) {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const data = await onLoadPatients(searchQuery)
      setPatients(data || [])
    } catch (error) {
      console.error("Error loading patients:", error)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Search Patients with Pending Waivers</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name, patient number, or phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadPatients()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={loadPatients} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Patient Number</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Pending Waivers</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No patients with pending waivers found
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.patientId}>
                  <TableCell className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </TableCell>
                  <TableCell>{patient.patientNumber}</TableCell>
                  <TableCell>{patient.phone || "-"}</TableCell>
                  <TableCell>{patient.pendingWaiverCount}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                      patient.totalPendingAmount
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => onPatientSelect(patient)} variant="outline">
                      Select <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Bulk Approve Waivers Selection Step Component
function BulkApproveWaiversStep({
  patient,
  waivers,
  selectedWaivers,
  onSelectedWaiversChange,
  approvalNotes,
  onApprovalNotesChange,
  onBack,
}: {
  patient: any
  waivers: any[]
  selectedWaivers: Set<number>
  onSelectedWaiversChange: (waivers: Set<number>) => void
  approvalNotes: string
  onApprovalNotesChange: (notes: string) => void
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <p className="font-medium">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {patient.patientNumber} • {patient.phone || "No phone"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Change Patient
        </Button>
      </div>

      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={waivers.length > 0 && selectedWaivers.size === waivers.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const allIds = new Set(waivers.map((w) => w.waiverId))
                      onSelectedWaiversChange(allIds)
                    } else {
                      onSelectedWaiversChange(new Set())
                    }
                  }}
                />
              </TableHead>
              <TableHead>Waiver Number</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No pending waivers found for this patient
                </TableCell>
              </TableRow>
            ) : (
              waivers.map((waiver) => {
                const isSelected = selectedWaivers.has(waiver.waiverId)
                return (
                  <TableRow key={waiver.waiverId}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedWaivers)
                          if (checked) {
                            newSelected.add(waiver.waiverId)
                          } else {
                            newSelected.delete(waiver.waiverId)
                          }
                          onSelectedWaiversChange(newSelected)
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{waiver.waiverNumber}</TableCell>
                    <TableCell>{waiver.invoiceNumber}</TableCell>
                    <TableCell>{waiver.waiverTypeName}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                        waiver.waivedAmount || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {waiver.requestedAt
                        ? format(new Date(waiver.requestedAt), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{waiver.reason || "-"}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedWaivers.size > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Selected Waivers</p>
              <p className="font-medium">{selectedWaivers.size} waiver(s)</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
                  waivers
                    .filter((w) => selectedWaivers.has(w.waiverId))
                    .reduce((sum, w) => sum + parseFloat(w.waivedAmount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="approvalNotes">Approval Notes (Optional)</Label>
        <Textarea
          id="approvalNotes"
          value={approvalNotes}
          onChange={(e) => onApprovalNotesChange(e.target.value)}
          placeholder="Add notes for this approval..."
          rows={2}
        />
      </div>
    </div>
  )
}

