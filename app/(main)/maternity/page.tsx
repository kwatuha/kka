"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Baby, Loader2, Edit, Trash2, Eye, MoreVertical, Activity, CheckCircle } from "lucide-react"
import { AddMaternityAdmissionForm } from "@/components/add-maternity-admission-form"
import { AddDeliveryForm } from "@/components/add-delivery-form"
import { maternityApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { formatDate, formatDateTime } from "@/lib/date-utils"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface MaternityAdmission {
  maternityAdmissionId: number
  admissionId: number
  admissionNumber: string
  patientId: number
  firstName: string
  lastName: string
  patientNumber: string
  bedId: number
  bedNumber: string
  wardName: string
  admissionDate: string
  admittingDoctorId: number
  doctorFirstName: string
  doctorLastName: string
  gestationWeeks: number
  expectedDeliveryDate: string
  pregnancyNumber?: number
  previousPregnancies?: number
  previousDeliveries?: number
  previousComplications?: string
  bloodGroup?: string
  rhesusFactor?: string
  status: string
  notes?: string
}

interface Delivery {
  deliveryId: number
  maternityAdmissionId: number
  patientId: number
  firstName: string
  lastName: string
  patientNumber: string
  deliveryDate: string
  deliveryTime: string
  deliveryType: string
  deliveryMode?: string
  complications?: string
  maternalOutcome: string
  doctorFirstName: string
  doctorLastName: string
  newborns?: any[]
}

export default function MaternityPage() {
  const [showAdmissionForm, setShowAdmissionForm] = useState(false)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [deliveryFormAdmissionId, setDeliveryFormAdmissionId] = useState<number | undefined>(undefined)
  const [admissions, setAdmissions] = useState<MaternityAdmission[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const [deliverySearch, setDeliverySearch] = useState("")
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>("")

  // Edit/Delete state for admissions
  const [editAdmissionOpen, setEditAdmissionOpen] = useState(false)
  const [editingAdmission, setEditingAdmission] = useState<MaternityAdmission | null>(null)
  const [savingAdmission, setSavingAdmission] = useState(false)
  const [deleteAdmissionOpen, setDeleteAdmissionOpen] = useState(false)
  const [deletingAdmission, setDeletingAdmission] = useState<MaternityAdmission | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewAdmissionOpen, setViewAdmissionOpen] = useState(false)
  const [viewingAdmission, setViewingAdmission] = useState<MaternityAdmission | null>(null)

  // Edit/Delete state for deliveries
  const [editDeliveryOpen, setEditDeliveryOpen] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null)
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [viewDeliveryOpen, setViewDeliveryOpen] = useState(false)
  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalAdmissions: 0,
    activeAdmissions: 0,
    deliveriesToday: 0,
    expectedDeliveries: 0,
  })

  useEffect(() => {
    loadAdmissions()
    loadDeliveries()
  }, [statusFilter])

  useEffect(() => {
    loadDeliveries()
  }, [deliveryTypeFilter])

  const loadAdmissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await maternityApi.getAdmissions(
        statusFilter || undefined
      )
      setAdmissions(data)
      
      // Calculate stats - use consistent date calculations
      const active = data.filter((a: MaternityAdmission) => a.status === 'admitted' || a.status === 'in_labor').length
      const expected = data.filter((a: MaternityAdmission) => {
        if (!a.expectedDeliveryDate) return false
        try {
          const expectedDate = new Date(a.expectedDeliveryDate)
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0) // Normalize to start of day
          const nextWeek = new Date(todayDate)
          nextWeek.setDate(todayDate.getDate() + 7)
          nextWeek.setHours(23, 59, 59, 999) // End of day
          expectedDate.setHours(0, 0, 0, 0) // Normalize expected date
          return expectedDate >= todayDate && expectedDate <= nextWeek
        } catch {
          return false
        }
      }).length
      
      setStats(prev => ({
        ...prev,
        totalAdmissions: data.length,
        activeAdmissions: active,
        expectedDeliveries: expected,
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to load admissions')
      console.error('Error loading admissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveries = async () => {
    try {
      setLoadingDeliveries(true)
      const data = await maternityApi.getDeliveries(
        1,
        100,
        undefined,
        deliveryTypeFilter || undefined
      )
      setDeliveries(data)
      
      // Calculate deliveries today - use consistent date comparison
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = formatDate(today.toISOString())
      
      const todayDeliveries = data.filter((d: Delivery) => {
        if (!d.deliveryDate) return false
        try {
          const deliveryDate = new Date(d.deliveryDate)
          deliveryDate.setHours(0, 0, 0, 0)
          const deliveryDateStr = formatDate(deliveryDate.toISOString())
          return deliveryDateStr === todayStr
        } catch {
          return false
        }
      }).length
      
      setStats(prev => ({
        ...prev,
        deliveriesToday: todayDeliveries,
      }))
    } catch (err: any) {
      console.error('Error loading deliveries:', err)
    } finally {
      setLoadingDeliveries(false)
    }
  }

  const filteredAdmissions = admissions.filter((admission) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        admission.admissionNumber?.toLowerCase().includes(searchLower) ||
        `${admission.firstName || ''} ${admission.lastName || ''}`.toLowerCase().includes(searchLower) ||
        admission.patientNumber?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (deliverySearch) {
      const searchLower = deliverySearch.toLowerCase()
      return (
        `${delivery.firstName || ''} ${delivery.lastName || ''}`.toLowerCase().includes(searchLower) ||
        delivery.patientNumber?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Use date utility functions for consistent formatting

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  const handleEditAdmission = async (admission: MaternityAdmission) => {
    try {
      const fullAdmission = await maternityApi.getAdmission(admission.maternityAdmissionId.toString())
      setEditingAdmission(fullAdmission)
      setEditAdmissionOpen(true)
    } catch (err: any) {
      toast({
        title: "Error loading admission",
        description: err.message || "Failed to load admission details",
        variant: "destructive",
      })
    }
  }

  const handleSaveAdmission = async (data: any) => {
    if (!editingAdmission) return

    setSavingAdmission(true)
    try {
      setError(null)
      await maternityApi.updateAdmission(editingAdmission.maternityAdmissionId.toString(), data)
      toast({
        title: "Admission updated",
        description: `Admission ${editingAdmission.admissionNumber} has been updated successfully.`,
      })
      setEditAdmissionOpen(false)
      setEditingAdmission(null)
      await loadAdmissions()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update admission'
      setError(errorMessage)
      toast({
        title: "Error updating admission",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating admission:', err)
    } finally {
      setSavingAdmission(false)
    }
  }

  const handleMarkInLabor = async (admission: MaternityAdmission) => {
    try {
      setError(null)
      await maternityApi.updateAdmission(admission.maternityAdmissionId.toString(), {
        status: 'in_labor'
      })
      toast({
        title: "Status updated",
        description: `${getPatientName(admission)} has been marked as In Labor.`,
      })
      await loadAdmissions()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update status'
      setError(errorMessage)
      toast({
        title: "Error updating status",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating status:', err)
    }
  }

  const handleRecordDelivery = (admission: MaternityAdmission) => {
    setDeliveryFormAdmissionId(admission.maternityAdmissionId)
    setShowDeliveryForm(true)
  }

  const handleDeleteAdmission = async () => {
    if (!deletingAdmission) return

    setDeleting(true)
    try {
      setError(null)
      await maternityApi.deleteAdmission(deletingAdmission.maternityAdmissionId.toString())
      toast({
        title: "Admission cancelled",
        description: `Admission ${deletingAdmission.admissionNumber} has been cancelled successfully.`,
      })
      setDeleteAdmissionOpen(false)
      setDeletingAdmission(null)
      await loadAdmissions()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel admission'
      setError(errorMessage)
      toast({
        title: "Error cancelling admission",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error cancelling admission:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleViewAdmission = async (admission: MaternityAdmission) => {
    try {
      const fullAdmission = await maternityApi.getAdmission(admission.maternityAdmissionId.toString())
      setViewingAdmission(fullAdmission)
      setViewAdmissionOpen(true)
    } catch (err: any) {
      toast({
        title: "Error loading admission",
        description: err.message || "Failed to load admission details",
        variant: "destructive",
      })
    }
  }

  const handleEditDelivery = async (delivery: Delivery) => {
    try {
      const fullDelivery = await maternityApi.getDelivery(delivery.deliveryId.toString())
      setEditingDelivery(fullDelivery)
      setEditDeliveryOpen(true)
    } catch (err: any) {
      toast({
        title: "Error loading delivery",
        description: err.message || "Failed to load delivery details",
        variant: "destructive",
      })
    }
  }

  const handleSaveDelivery = async (data: any) => {
    if (!editingDelivery) return

    setSavingDelivery(true)
    try {
      setError(null)
      await maternityApi.updateDelivery(editingDelivery.deliveryId.toString(), data)
      toast({
        title: "Delivery updated",
        description: `Delivery record has been updated successfully.`,
      })
      setEditDeliveryOpen(false)
      setEditingDelivery(null)
      await loadDeliveries()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update delivery'
      setError(errorMessage)
      toast({
        title: "Error updating delivery",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating delivery:', err)
    } finally {
      setSavingDelivery(false)
    }
  }

  const handleViewDelivery = async (delivery: Delivery) => {
    try {
      const fullDelivery = await maternityApi.getDelivery(delivery.deliveryId.toString())
      setViewingDelivery(fullDelivery)
      setViewDeliveryOpen(true)
    } catch (err: any) {
      toast({
        title: "Error loading delivery",
        description: err.message || "Failed to load delivery details",
        variant: "destructive",
      })
    }
  }

  const getPatientName = (admission: MaternityAdmission) => {
    return `${admission.firstName || ''} ${admission.lastName || ''}`.trim() || `Patient ${admission.patientId}`
  }

  const getDoctorName = (admission: MaternityAdmission) => {
    const firstName = admission.doctorFirstName || ''
    const lastName = admission.doctorLastName || ''
    if (firstName || lastName) {
      return `Dr. ${firstName} ${lastName}`.trim()
    }
    return `Doctor ${admission.admittingDoctorId}`
  }

  const getDeliveryPatientName = (delivery: Delivery) => {
    return `${delivery.firstName || ''} ${delivery.lastName || ''}`.trim() || `Patient ${delivery.patientId}`
  }

  const getDeliveryDoctorName = (delivery: Delivery) => {
    const firstName = delivery.doctorFirstName || ''
    const lastName = delivery.doctorLastName || ''
    if (firstName || lastName) {
      return `Dr. ${firstName} ${lastName}`.trim()
    }
    return 'Unknown'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maternity</h1>
          <p className="text-muted-foreground">Manage maternity patients and deliveries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setDeliveryFormAdmissionId(undefined)
            setShowDeliveryForm(true)
          }}>
            <Baby className="mr-2 h-4 w-4" />
            Record Delivery
          </Button>
          <Button onClick={() => setShowAdmissionForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Admission
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdmissions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAdmissions}</div>
            <p className="text-xs text-muted-foreground">Admitted or in labor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveriesToday}</div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expected Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expectedDeliveries}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients">Maternity Patients</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Maternity Patients</CardTitle>
              <CardDescription>View and manage current maternity patients</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                  <Button variant="link" size="sm" onClick={loadAdmissions} className="ml-2 h-auto p-0">
                    Retry
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm text-muted-foreground font-medium">Status:</span>
                  <Button 
                    variant={statusFilter === "" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={statusFilter === "admitted" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("admitted")}
                  >
                    Admitted
                  </Button>
                  <Button 
                    variant={statusFilter === "in_labor" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("in_labor")}
                  >
                    In Labor
                  </Button>
                  <Button 
                    variant={statusFilter === "delivered" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("delivered")}
                  >
                    Delivered
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search patients..." 
                    className="w-full pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading admissions...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Ward/Bed</TableHead>
                        <TableHead>Admission Date</TableHead>
                        <TableHead>Gestation</TableHead>
                        <TableHead>Expected Delivery</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No admissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdmissions.map((admission) => (
                          <TableRow key={admission.maternityAdmissionId}>
                            <TableCell className="font-medium">{admission.admissionNumber}</TableCell>
                            <TableCell>
                              {getPatientName(admission)}
                              <div className="text-xs text-muted-foreground">{admission.patientNumber}</div>
                            </TableCell>
                            <TableCell>
                              {admission.wardName || 'N/A'}
                              <div className="text-xs text-muted-foreground">Bed: {admission.bedNumber || 'N/A'}</div>
                            </TableCell>
                            <TableCell>{formatDate(admission.admissionDate)}</TableCell>
                            <TableCell>{admission.gestationWeeks} weeks</TableCell>
                            <TableCell>{admission.expectedDeliveryDate ? formatDate(admission.expectedDeliveryDate) : 'N/A'}</TableCell>
                            <TableCell className="text-sm">{getDoctorName(admission)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  admission.status === "delivered"
                                    ? "default"
                                    : admission.status === "in_labor"
                                      ? "destructive"
                                      : admission.status === "admitted"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {formatStatus(admission.status)}
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
                                  <DropdownMenuItem onClick={() => handleViewAdmission(admission)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {(admission.status === 'admitted' || admission.status === 'in_labor') && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {admission.status === 'admitted' && (
                                        <DropdownMenuItem onClick={() => handleMarkInLabor(admission)}>
                                          <Activity className="mr-2 h-4 w-4" />
                                          Mark as In Labor
                                        </DropdownMenuItem>
                                      )}
                                      {admission.status === 'in_labor' && (
                                        <DropdownMenuItem onClick={() => handleRecordDelivery(admission)}>
                                          <Baby className="mr-2 h-4 w-4" />
                                          Record Delivery
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleEditAdmission(admission)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Admission
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setDeletingAdmission(admission)
                                          setDeleteAdmissionOpen(true)
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Cancel Admission
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

        <TabsContent value="deliveries" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Records</CardTitle>
              <CardDescription>View and manage delivery records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm text-muted-foreground font-medium">Type:</span>
                  <Button 
                    variant={deliveryTypeFilter === "" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setDeliveryTypeFilter("")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={deliveryTypeFilter === "normal" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setDeliveryTypeFilter("normal")}
                  >
                    Normal
                  </Button>
                  <Button 
                    variant={deliveryTypeFilter === "caesarean" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setDeliveryTypeFilter("caesarean")}
                  >
                    C-Section
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search deliveries..." 
                    className="w-full pl-8"
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingDeliveries ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading deliveries...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Baby Details</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Complications</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No deliveries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDeliveries.map((delivery) => (
                          <TableRow key={delivery.deliveryId}>
                            <TableCell className="font-medium">DEL-{delivery.deliveryId.toString().padStart(6, '0')}</TableCell>
                            <TableCell>
                              {getDeliveryPatientName(delivery)}
                              <div className="text-xs text-muted-foreground">{delivery.patientNumber}</div>
                            </TableCell>
                            <TableCell>
                              {formatDate(delivery.deliveryDate)}
                              {delivery.deliveryTime && (
                                <div className="text-xs text-muted-foreground">{delivery.deliveryTime}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={delivery.deliveryType === "caesarean" ? "secondary" : "default"}>
                                {delivery.deliveryType === "caesarean" ? "C-Section" : "Normal"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {delivery.newborns && delivery.newborns.length > 0 ? (
                                delivery.newborns.map((newborn: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    {newborn.gender}, {newborn.birthWeight}kg
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>{getDeliveryDoctorName(delivery)}</TableCell>
                            <TableCell className="max-w-xs truncate">{delivery.complications || "None"}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDelivery(delivery)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEditDelivery(delivery)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Delivery
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddMaternityAdmissionForm 
        open={showAdmissionForm} 
        onOpenChange={setShowAdmissionForm}
        onSuccess={() => {
          loadAdmissions()
        }}
      />

      <AddDeliveryForm
        open={showDeliveryForm}
        onOpenChange={(open) => {
          setShowDeliveryForm(open)
          if (!open) setDeliveryFormAdmissionId(undefined)
        }}
        onSuccess={() => {
          loadAdmissions()
          loadDeliveries()
        }}
        maternityAdmissionId={deliveryFormAdmissionId}
      />

      {/* Edit Admission Dialog */}
      <Dialog open={editAdmissionOpen} onOpenChange={(open) => {
        setEditAdmissionOpen(open)
        if (!open) setEditingAdmission(null)
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Admission</DialogTitle>
            <DialogDescription>
              Update admission details for {editingAdmission?.admissionNumber || ''}
            </DialogDescription>
          </DialogHeader>
          {editingAdmission ? (
            <EditMaternityAdmissionForm
              admission={editingAdmission}
              onSave={handleSaveAdmission}
              onCancel={() => {
                setEditAdmissionOpen(false)
                setEditingAdmission(null)
              }}
              saving={savingAdmission}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* View Admission Dialog */}
      <Dialog open={viewAdmissionOpen} onOpenChange={setViewAdmissionOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admission Details</DialogTitle>
            <DialogDescription>
              Admission {viewingAdmission?.admissionNumber || ''}
            </DialogDescription>
          </DialogHeader>
          {viewingAdmission ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">
                    {getPatientName(viewingAdmission)}
                  </p>
                  {viewingAdmission.patientNumber && (
                    <p className="text-sm text-muted-foreground">{viewingAdmission.patientNumber}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Attending Doctor</p>
                  <p className="font-medium">{getDoctorName(viewingAdmission)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ward/Bed</p>
                  <p className="font-medium">
                    {viewingAdmission.wardName || 'N/A'} - {viewingAdmission.bedNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission Date</p>
                  <p className="font-medium">{formatDateTime(viewingAdmission.admissionDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gestation Weeks</p>
                  <p className="font-medium">{viewingAdmission.gestationWeeks} weeks</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery Date</p>
                  <p className="font-medium">
                    {viewingAdmission.expectedDeliveryDate ? formatDate(viewingAdmission.expectedDeliveryDate) : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                <Badge
                  variant={
                    viewingAdmission.status === "delivered"
                      ? "default"
                      : viewingAdmission.status === "in_labor"
                        ? "destructive"
                        : viewingAdmission.status === "admitted"
                          ? "secondary"
                          : "outline"
                  }
                >
                  {formatStatus(viewingAdmission.status)}
                </Badge>
              </div>

              {viewingAdmission.pregnancyNumber && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pregnancy Number</p>
                    <p className="font-medium">{viewingAdmission.pregnancyNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Previous Deliveries</p>
                    <p className="font-medium">{viewingAdmission.previousDeliveries || 0}</p>
                  </div>
                </div>
              )}

              {(viewingAdmission.bloodGroup || viewingAdmission.rhesusFactor) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Group</p>
                    <p className="font-medium">{viewingAdmission.bloodGroup || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rhesus Factor</p>
                    <p className="font-medium">{viewingAdmission.rhesusFactor || 'N/A'}</p>
                  </div>
                </div>
              )}

              {viewingAdmission.previousComplications && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Previous Complications</p>
                  <p className="text-sm">{viewingAdmission.previousComplications}</p>
                </div>
              )}

              {viewingAdmission.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{viewingAdmission.notes}</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAdmissionOpen} onOpenChange={(open) => !open && setDeleteAdmissionOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Admission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel admission "{deletingAdmission?.admissionNumber}"? 
              This will free the bed and mark the admission as cancelled. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmission}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Cancelling...' : 'Cancel Admission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Delivery Dialog */}
      <Dialog open={editDeliveryOpen} onOpenChange={(open) => {
        setEditDeliveryOpen(open)
        if (!open) setEditingDelivery(null)
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Update delivery details
            </DialogDescription>
          </DialogHeader>
          {editingDelivery ? (
            <EditDeliveryForm
              delivery={editingDelivery}
              onSave={handleSaveDelivery}
              onCancel={() => {
                setEditDeliveryOpen(false)
                setEditingDelivery(null)
              }}
              saving={savingDelivery}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* View Delivery Dialog */}
      <Dialog open={viewDeliveryOpen} onOpenChange={setViewDeliveryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              Delivery Record
            </DialogDescription>
          </DialogHeader>
          {viewingDelivery ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">
                    {getDeliveryPatientName(viewingDelivery)}
                  </p>
                  {viewingDelivery.patientNumber && (
                    <p className="text-sm text-muted-foreground">{viewingDelivery.patientNumber}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assisted By</p>
                  <p className="font-medium">{getDeliveryDoctorName(viewingDelivery)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <p className="font-medium">{formatDate(viewingDelivery.deliveryDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Time</p>
                  <p className="font-medium">{viewingDelivery.deliveryTime || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Type</p>
                  <Badge variant={viewingDelivery.deliveryType === "caesarean" ? "secondary" : "default"}>
                    {viewingDelivery.deliveryType === "caesarean" ? "C-Section" : "Normal"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maternal Outcome</p>
                  <p className="font-medium">{viewingDelivery.maternalOutcome || 'N/A'}</p>
                </div>
              </div>

              {viewingDelivery.deliveryMode && (
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Mode</p>
                  <p className="font-medium">{viewingDelivery.deliveryMode}</p>
                </div>
              )}

              {viewingDelivery.complications && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Complications</p>
                  <p className="text-sm">{viewingDelivery.complications}</p>
                </div>
              )}

              {viewingDelivery.newborns && viewingDelivery.newborns.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Newborns</p>
                  <div className="space-y-3">
                    {viewingDelivery.newborns.map((newborn: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Gender</p>
                            <p className="text-sm">{newborn.gender}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Birth Weight</p>
                            <p className="text-sm">{newborn.birthWeight} kg</p>
                          </div>
                          {newborn.birthLength && (
                            <div>
                              <p className="text-sm font-medium">Length</p>
                              <p className="text-sm">{newborn.birthLength} cm</p>
                            </div>
                          )}
                          {newborn.apgarScore5Min && (
                            <div>
                              <p className="text-sm font-medium">Apgar Score (5 min)</p>
                              <p className="text-sm">{newborn.apgarScore5Min}</p>
                            </div>
                          )}
                        </div>
                        {newborn.healthStatus && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Health Status</p>
                            <p className="text-sm">{newborn.healthStatus}</p>
                          </div>
                        )}
                        {newborn.notes && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">{newborn.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingDelivery.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{viewingDelivery.notes}</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Edit Maternity Admission Form Component
function EditMaternityAdmissionForm({ 
  admission, 
  onSave, 
  onCancel,
  saving 
}: { 
  admission: MaternityAdmission
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    gestationWeeks: admission?.gestationWeeks?.toString() || '',
    expectedDeliveryDate: admission?.expectedDeliveryDate ? admission.expectedDeliveryDate.split('T')[0] : '',
    pregnancyNumber: admission?.pregnancyNumber?.toString() || '',
    previousPregnancies: admission?.previousPregnancies?.toString() || '',
    previousDeliveries: admission?.previousDeliveries?.toString() || '',
    previousComplications: admission?.previousComplications || '',
    bloodGroup: admission?.bloodGroup || '',
    rhesusFactor: admission?.rhesusFactor || '',
    notes: admission?.notes || '',
    status: admission?.status || 'admitted',
  })

  useEffect(() => {
    if (admission) {
      setFormData({
        gestationWeeks: admission.gestationWeeks?.toString() || '',
        expectedDeliveryDate: admission.expectedDeliveryDate ? admission.expectedDeliveryDate.split('T')[0] : '',
        pregnancyNumber: admission.pregnancyNumber?.toString() || '',
        previousPregnancies: admission.previousPregnancies?.toString() || '',
        previousDeliveries: admission.previousDeliveries?.toString() || '',
        previousComplications: admission.previousComplications || '',
        bloodGroup: admission.bloodGroup || '',
        rhesusFactor: admission.rhesusFactor || '',
        notes: admission.notes || '',
        status: admission.status || 'admitted',
      })
    }
  }, [admission])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      gestationWeeks: formData.gestationWeeks ? parseInt(formData.gestationWeeks) : null,
      expectedDeliveryDate: formData.expectedDeliveryDate || null,
      pregnancyNumber: formData.pregnancyNumber ? parseInt(formData.pregnancyNumber) : null,
      previousPregnancies: formData.previousPregnancies ? parseInt(formData.previousPregnancies) : null,
      previousDeliveries: formData.previousDeliveries ? parseInt(formData.previousDeliveries) : null,
      previousComplications: formData.previousComplications || null,
      bloodGroup: formData.bloodGroup || null,
      rhesusFactor: formData.rhesusFactor || null,
      notes: formData.notes || null,
      status: formData.status,
    })
  }

  if (!admission) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Gestation Weeks</Label>
          <Input
            type="number"
            min="1"
            max="45"
            value={formData.gestationWeeks}
            onChange={(e) => setFormData({ ...formData, gestationWeeks: e.target.value })}
            placeholder="e.g., 38"
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Expected Delivery Date</Label>
          <Input
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Pregnancy Number</Label>
          <Input
            type="number"
            min="1"
            value={formData.pregnancyNumber}
            onChange={(e) => setFormData({ ...formData, pregnancyNumber: e.target.value })}
            placeholder="e.g., 1, 2, 3..."
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Previous Deliveries</Label>
          <Input
            type="number"
            min="0"
            value={formData.previousDeliveries}
            onChange={(e) => setFormData({ ...formData, previousDeliveries: e.target.value })}
            placeholder="Number of previous deliveries"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Blood Group</Label>
          <Select
            value={formData.bloodGroup}
            onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blood group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="AB">AB</SelectItem>
              <SelectItem value="O">O</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Rhesus Factor</Label>
          <Select
            value={formData.rhesusFactor}
            onValueChange={(value) => setFormData({ ...formData, rhesusFactor: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rhesus factor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Previous Complications</Label>
        <Textarea
          value={formData.previousComplications}
          onChange={(e) => setFormData({ ...formData, previousComplications: e.target.value })}
          placeholder="Previous pregnancy complications..."
          className="min-h-[80px]"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admitted">Admitted</SelectItem>
            <SelectItem value="in_labor">In Labor</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any additional notes..."
          className="min-h-[80px]"
        />
      </div>

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
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}

// Edit Delivery Form Component
function EditDeliveryForm({ 
  delivery, 
  onSave, 
  onCancel,
  saving 
}: { 
  delivery: Delivery
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    deliveryDate: delivery?.deliveryDate ? delivery.deliveryDate.split('T')[0] : '',
    deliveryTime: delivery?.deliveryTime || '',
    deliveryType: delivery?.deliveryType || 'normal',
    deliveryMode: delivery?.deliveryMode || '',
    complications: delivery?.complications || '',
    maternalOutcome: delivery?.maternalOutcome || 'good',
    notes: '',
  })

  useEffect(() => {
    if (delivery) {
      setFormData({
        deliveryDate: delivery.deliveryDate ? delivery.deliveryDate.split('T')[0] : '',
        deliveryTime: delivery.deliveryTime || '',
        deliveryType: delivery.deliveryType || 'normal',
        deliveryMode: delivery.deliveryMode || '',
        complications: delivery.complications || '',
        maternalOutcome: delivery.maternalOutcome || 'good',
        notes: '',
      })
    }
  }, [delivery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      deliveryDate: formData.deliveryDate || null,
      deliveryTime: formData.deliveryTime || null,
      deliveryType: formData.deliveryType || null,
      deliveryMode: formData.deliveryMode || null,
      complications: formData.complications || null,
      maternalOutcome: formData.maternalOutcome || null,
      notes: formData.notes || null,
    })
  }

  if (!delivery) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Delivery Date</Label>
          <Input
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Delivery Time</Label>
          <Input
            type="time"
            value={formData.deliveryTime}
            onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Delivery Type</Label>
          <Select
            value={formData.deliveryType}
            onValueChange={(value) => setFormData({ ...formData, deliveryType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select delivery type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="caesarean">Caesarean (C-Section)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Maternal Outcome</Label>
          <Select
            value={formData.maternalOutcome}
            onValueChange={(value) => setFormData({ ...formData, maternalOutcome: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Delivery Mode</Label>
        <Input
          value={formData.deliveryMode}
          onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value })}
          placeholder="e.g., Spontaneous vaginal delivery, Lower segment caesarean section"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Complications</Label>
        <Textarea
          value={formData.complications}
          onChange={(e) => setFormData({ ...formData, complications: e.target.value })}
          placeholder="Any complications during delivery..."
          className="min-h-[80px]"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any additional notes..."
          className="min-h-[80px]"
        />
      </div>

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
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}
