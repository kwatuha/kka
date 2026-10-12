"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TabsContent } from "@/components/ui/tabs"
import { RoleFilteredTabs } from "@/components/role-filtered-tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, BedDouble, Loader2, Edit, Trash2, Eye, MoreVertical } from "lucide-react"
import { AddAdmissionForm } from "@/components/add-admission-form"
import { InpatientManagement } from "@/components/inpatient-management"
import { inpatientApi, nursingApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { format } from "date-fns"
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
import { Progress } from "@/components/ui/progress"

interface Admission {
  admissionId: number
  admissionNumber: string
  patientId: number
  firstName: string
  lastName: string
  patientNumber: string
  bedId: number
  bedNumber: string
  bedType: string
  wardId: number
  wardName: string
  wardType: string
  admissionDate: string
  admittingDoctorId: number
  doctorFirstName: string
  doctorLastName: string
  admissionDiagnosis: string
  admissionReason: string
  expectedDischargeDate: string
  status: string
  notes: string
  diagnoses?: any[]
}

export default function InpatientPage() {
  const { user } = useAuth()
  const [showAdmissionForm, setShowAdmissionForm] = useState(false)
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [wards, setWards] = useState<any[]>([])
  const [nurseAssignedWards, setNurseAssignedWards] = useState<Array<{ wardId: number; wardName: string; wardType?: string }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingBeds, setLoadingBeds] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadAdmissionsSeq = useRef(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [wardFilter, setWardFilter] = useState<string>("")
  const [bedStatusFilter, setBedStatusFilter] = useState<string>("")
  const [bedWardTypeFilter, setBedWardTypeFilter] = useState<string>("") // Ward Type filter for Bed Management
  const [bedWardFilter, setBedWardFilter] = useState<string>("") // Ward filter for Bed Management
  const [search, setSearch] = useState("")
  const [bedSearch, setBedSearch] = useState("")

  // Edit/Delete state
  const [editAdmissionOpen, setEditAdmissionOpen] = useState(false)
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null)
  const [savingAdmission, setSavingAdmission] = useState(false)
  const [deleteAdmissionOpen, setDeleteAdmissionOpen] = useState(false)
  const [deletingAdmission, setDeletingAdmission] = useState<Admission | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewAdmissionOpen, setViewAdmissionOpen] = useState(false)
  const [viewingAdmission, setViewingAdmission] = useState<Admission | null>(null)

  // Bed Edit/Delete state
  const [editBedOpen, setEditBedOpen] = useState(false)
  const [editingBed, setEditingBed] = useState<any | null>(null)
  const [savingBed, setSavingBed] = useState(false)
  const [deleteBedOpen, setDeleteBedOpen] = useState(false)
  const [deletingBed, setDeletingBed] = useState<any | null>(null)
  const [deletingBedLoading, setDeletingBedLoading] = useState(false)
  const [showBedForm, setShowBedForm] = useState(false)

  // Ward Management state
  const [loadingWards, setLoadingWards] = useState(false)
  const [wardSearch, setWardSearch] = useState("")
  const [wardTypeFilter, setWardTypeFilter] = useState<string>("")
  const [editWardOpen, setEditWardOpen] = useState(false)
  const [editingWard, setEditingWard] = useState<any | null>(null)
  const [savingWard, setSavingWard] = useState(false)
  const [deleteWardOpen, setDeleteWardOpen] = useState(false)
  const [deletingWard, setDeletingWard] = useState<any | null>(null)
  const [deletingWardLoading, setDeletingWardLoading] = useState(false)
  const [showWardForm, setShowWardForm] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    icuBeds: 0,
  })

  const loadAdmissions = useCallback(async () => {
    const seq = ++loadAdmissionsSeq.current
    try {
      setLoading(true)
      setError(null)
      const data = await inpatientApi.getAdmissions(
        statusFilter || undefined,
        wardFilter || undefined
      )
      if (seq !== loadAdmissionsSeq.current) return
      setAdmissions(data)
    } catch (err: any) {
      if (seq !== loadAdmissionsSeq.current) return
      setError(err.message || 'Failed to load admissions')
      console.error('Error loading admissions:', err)
    } finally {
      if (seq === loadAdmissionsSeq.current) setLoading(false)
    }
  }, [statusFilter, wardFilter])

  useEffect(() => {
    loadAdmissions()
    loadBeds()
    loadWards()
  }, [loadAdmissions])

  useEffect(() => {
    loadBeds()
  }, [bedStatusFilter])

  const loadBeds = async () => {
    try {
      setLoadingBeds(true)
      const data = await inpatientApi.getBeds(
        wardFilter || undefined,
        bedStatusFilter || undefined
      )
      setBeds(data)

      // Calculate stats
      const total = data.length
      const occupied = data.filter((b: any) => b.status === 'occupied').length
      const available = data.filter((b: any) => b.status === 'available').length
      const icu = data.filter((b: any) => b.wardType === 'ICU' || b.wardName?.includes('ICU')).length
      const icuOccupied = data.filter((b: any) => (b.wardType === 'ICU' || b.wardName?.includes('ICU')) && b.status === 'occupied').length

      setStats({
        totalBeds: total,
        occupiedBeds: occupied,
        availableBeds: available,
        icuBeds: icu > 0 ? `${icuOccupied}/${icu}` : '0/0',
      })
    } catch (err: any) {
      console.error('Error loading beds:', err)
    } finally {
      setLoadingBeds(false)
    }
  }

  const loadWards = async () => {
    try {
      const data = await inpatientApi.getWards()
      // Dedupe by wardId so each ward name appears once
      const byId = new Map((data || []).map((w: any) => [w.wardId, w]))
      setWards(Array.from(byId.values()))
    } catch (err: any) {
      console.error('Error loading wards:', err)
    }
  }

  const roleName = (user?.role ?? (user as any)?.roleName ?? '').toString().toLowerCase()
  const isNurse = roleName === 'nurse'

  useEffect(() => {
    if (!isNurse) {
      setNurseAssignedWards(null)
      return
    }
    let cancelled = false
    nursingApi.getAssignedWards().then((data) => {
      if (!cancelled && Array.isArray(data)) setNurseAssignedWards(data)
    }).catch(() => {
      if (!cancelled) setNurseAssignedWards([])
    })
    return () => { cancelled = true }
  }, [isNurse])

  const filteredAdmissions = admissions.filter((admission) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        admission.admissionNumber.toLowerCase().includes(searchLower) ||
        `${admission.firstName || ''} ${admission.lastName || ''}`.toLowerCase().includes(searchLower) ||
        admission.patientNumber?.toLowerCase().includes(searchLower) ||
        admission.admissionDiagnosis?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const wardsForInpatientFilter = useMemo(() => {
    if (nurseAssignedWards && nurseAssignedWards.length > 0) {
      return nurseAssignedWards.map((w) => ({ wardId: w.wardId, wardName: w.wardName, wardType: w.wardType, admittedPatients: undefined as number | undefined }))
    }
    return wards
  }, [nurseAssignedWards, wards])

  // Filter wards by ward type for Bed Management
  const filteredWardsForBeds = useMemo(() => {
    if (!bedWardTypeFilter || !bedWardTypeFilter.trim()) {
      return wards
    }

    const filterType = String(bedWardTypeFilter).trim()
    const filterTypeLower = filterType.toLowerCase()

    // Debug: Log the filter type to help diagnose issues
    if (filterTypeLower === "male") {
      console.log("[Bed Filter] Filtering for Male wards only. Filter value:", filterType)
    }

    return wards.filter((ward: any) => {
      const wardType = String(ward.wardType || "").trim()

      // Exact match only - "Male" should NOT match "Female"
      // Exclude wards with no ward type
      if (!wardType || wardType.length === 0) {
        return false
      }

      const wardTypeLower = wardType.toLowerCase()

      // Strict case-insensitive exact match
      // "male" !== "female" - this should never match
      const matches = wardTypeLower === filterTypeLower

      // Debug logging for Male filter
      if (filterTypeLower === "male" && matches) {
        console.log("[Bed Filter] Ward matches Male filter:", ward.wardName, "Type:", wardType)
      }
      if (filterTypeLower === "male" && wardTypeLower === "female") {
        console.warn("[Bed Filter] ERROR: Male filter matched Female ward!", ward.wardName, wardType)
      }

      return matches
    })
  }, [wards, bedWardTypeFilter])

  const filteredBeds = beds.filter((bed) => {
    // Filter by ward type (through ward) - exact match only
    if (bedWardTypeFilter && bedWardTypeFilter.trim()) {
      const bedWardType = String(bed.wardType || "").trim()
      const filterType = String(bedWardTypeFilter).trim()

      // Exact match only - "Male" should NOT match "Female"
      // Exclude beds with no ward type or empty ward type
      if (!bedWardType || bedWardType.length === 0) {
        return false
      }

      const bedWardTypeLower = bedWardType.toLowerCase()
      const filterTypeLower = filterType.toLowerCase()

      // Strict case-insensitive exact match
      // "male" !== "female" - this should never match
      if (bedWardTypeLower !== filterTypeLower) {
        // Debug logging for Male filter
        if (filterTypeLower === "male" && bedWardTypeLower === "female") {
          console.warn("[Bed Filter] ERROR: Male filter matched Female bed!", bed.bedNumber, bed.wardName, "Bed Ward Type:", bedWardType)
        }
        return false
      }

      // Debug logging for successful Male filter match
      if (filterTypeLower === "male") {
        console.log("[Bed Filter] Bed matches Male filter:", bed.bedNumber, bed.wardName, "Bed Ward Type:", bedWardType)
      }
    }

    // Filter by ward
    if (bedWardFilter) {
      if (bed.wardId?.toString() !== bedWardFilter) {
        return false
      }
    }

    // Filter by status
    if (bedStatusFilter) {
      if (bed.status !== bedStatusFilter) {
        return false
      }
    }

    // Filter by search
    if (bedSearch) {
      const searchLower = bedSearch.toLowerCase()
      return (
        bed.bedNumber?.toLowerCase().includes(searchLower) ||
        bed.wardName?.toLowerCase().includes(searchLower) ||
        `${bed.firstName || ''} ${bed.lastName || ''}`.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd')
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
    } catch {
      return dateString
    }
  }

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  const handleEditAdmission = async (admission: Admission) => {
    try {
      const fullAdmission = await inpatientApi.getAdmission(admission.admissionId.toString())
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
      await inpatientApi.updateAdmission(editingAdmission.admissionId.toString(), data)
      toast({
        title: "Admission updated",
        description: `Admission ${editingAdmission.admissionNumber} has been updated successfully.`,
      })
      setEditAdmissionOpen(false)
      setEditingAdmission(null)
      await loadAdmissions()
      await loadBeds()
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

  const handleDeleteAdmission = async () => {
    if (!deletingAdmission) return

    setDeleting(true)
    try {
      setError(null)
      await inpatientApi.deleteAdmission(deletingAdmission.admissionId.toString())
      toast({
        title: "Admission cancelled",
        description: `Admission ${deletingAdmission.admissionNumber} has been cancelled successfully.`,
      })
      setDeleteAdmissionOpen(false)
      setDeletingAdmission(null)
      await loadAdmissions()
      await loadBeds()
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

  const handleViewAdmission = async (admission: Admission) => {
    try {
      const fullAdmission = await inpatientApi.getAdmission(admission.admissionId.toString())
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

  const getPatientName = (admission: Admission) => {
    return `${admission.firstName || ''} ${admission.lastName || ''}`.trim() || `Patient ${admission.patientId}`
  }

  const getDoctorName = (admission: Admission) => {
    const firstName = admission.doctorFirstName || ''
    const lastName = admission.doctorLastName || ''
    if (firstName || lastName) {
      return `Dr. ${firstName} ${lastName}`.trim()
    }
    return `Doctor ${admission.admittingDoctorId}`
  }

  const handleEditBed = async (bed: any) => {
    try {
      const fullBed = await inpatientApi.getBed(bed.bedId.toString())
      setEditingBed(fullBed)
      setShowBedForm(true) // Use the unified form dialog
    } catch (err: any) {
      toast({
        title: "Error loading bed",
        description: err.message || "Failed to load bed details",
        variant: "destructive",
      })
    }
  }

  const handleSaveBed = async (bedId: string, bedData: any) => {
    if (!bedId) {
      console.error("handleSaveBed: No bedId provided for update.")
      toast({
        title: "Error",
        description: "No bed ID provided for update.",
        variant: "destructive",
      })
      return
    }

    setSavingBed(true)
    try {
      setError(null)
      await inpatientApi.updateBed(bedId, bedData)
      toast({
        title: "Bed updated",
        description: `Bed has been updated successfully.`,
      })
      setEditBedOpen(false) // Close edit dialog
      setShowBedForm(false) // Close create/edit dialog
      setEditingBed(null)
      await loadBeds()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update bed'
      setError(errorMessage)
      toast({
        title: "Error updating bed",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating bed:', err)
    } finally {
      setSavingBed(false)
    }
  }

  const handleCreateBed = async (bedData: any) => {
    setSavingBed(true)
    try {
      setError(null)
      await inpatientApi.createBed(bedData)
      toast({
        title: "Bed created",
        description: `Bed has been created successfully.`,
      })
      setShowBedForm(false)
      setEditingBed(null)
      await loadBeds()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create bed'
      setError(errorMessage)
      toast({
        title: "Error creating bed",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error creating bed:', err)
      throw err // Re-throw to let form handle it
    } finally {
      setSavingBed(false)
    }
  }

  const handleDeleteBed = async () => {
    if (!deletingBed) return

    setDeletingBedLoading(true)
    try {
      setError(null)
      await inpatientApi.deleteBed(deletingBed.bedId.toString())
      toast({
        title: "Bed deleted",
        description: `Bed ${deletingBed.bedNumber} has been deleted successfully.`,
      })
      setDeleteBedOpen(false)
      setDeletingBed(null)
      await loadBeds()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete bed'
      setError(errorMessage)
      toast({
        title: "Error deleting bed",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error deleting bed:', err)
    } finally {
      setDeletingBedLoading(false)
    }
  }

  // Ward Management handlers
  const handleEditWard = async (ward: any) => {
    try {
      const fullWard = await inpatientApi.getWard(ward.wardId.toString())
      setEditingWard(fullWard)
      setShowWardForm(true) // Use the unified form dialog
    } catch (err: any) {
      toast({
        title: "Error loading ward",
        description: err.message || "Failed to load ward details",
        variant: "destructive",
      })
    }
  }

  const handleSaveWard = async (wardData: any) => {
    if (!editingWard || !editingWard.wardId) {
      console.error('Cannot save ward: editingWard is not set or missing wardId', editingWard)
      toast({
        title: "Error",
        description: "Cannot save ward: ward information is missing",
        variant: "destructive",
      })
      return
    }

    setSavingWard(true)
    try {
      setError(null)
      console.log('Saving ward:', { wardId: editingWard.wardId, wardData })
      await inpatientApi.updateWard(editingWard.wardId.toString(), wardData)
      toast({
        title: "Ward updated",
        description: `Ward ${editingWard.wardName || 'Unknown'} has been updated successfully.`,
      })
      // Close both dialogs in case either is open
      setEditWardOpen(false)
      setShowWardForm(false)
      setEditingWard(null)
      await loadWards()
      await loadBeds() // Reload beds to refresh ward names
    } catch (err: any) {
      const errorMessage = err.message || err.response?.message || 'Failed to update ward'
      setError(errorMessage)
      toast({
        title: "Error updating ward",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error updating ward:', err)
    } finally {
      setSavingWard(false)
    }
  }

  const handleDeleteWard = async () => {
    if (!deletingWard) return

    setDeletingWardLoading(true)
    try {
      setError(null)
      await inpatientApi.deleteWard(deletingWard.wardId.toString())
      toast({
        title: "Ward deleted",
        description: `Ward ${deletingWard.wardName} has been deleted successfully.`,
      })
      setDeleteWardOpen(false)
      setDeletingWard(null)
      await loadWards()
      await loadBeds() // Reload beds to refresh ward names
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete ward'
      setError(errorMessage)
      toast({
        title: "Error deleting ward",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error deleting ward:', err)
    } finally {
      setDeletingWardLoading(false)
    }
  }

  const handleCreateWard = async (wardData: any) => {
    setSavingWard(true)
    try {
      setError(null)
      await inpatientApi.createWard(wardData)
      toast({
        title: "Ward created",
        description: `Ward has been created successfully.`,
      })
      setShowWardForm(false)
      setEditingWard(null)
      await loadWards()
      await loadBeds() // Reload beds to refresh ward names
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create ward'
      setError(errorMessage)
      toast({
        title: "Error creating ward",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error creating ward:', err)
      throw err // Re-throw to let form handle it
    } finally {
      setSavingWard(false)
    }
  }

  const filteredWards = wards.filter((ward) => {
    if (wardSearch) {
      const searchLower = wardSearch.toLowerCase()
      return (
        ward.wardName?.toLowerCase().includes(searchLower) ||
        ward.wardCode?.toLowerCase().includes(searchLower) ||
        ward.wardType?.toLowerCase().includes(searchLower) ||
        ward.location?.toLowerCase().includes(searchLower)
      )
    }
    if (wardTypeFilter) {
      return ward.wardType === wardTypeFilter
    }
    return true
  })

  const wardTypes = Array.from(new Set(wards.map((w: any) => w.wardType).filter(Boolean)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inpatient Management</h1>
          <p className="text-muted-foreground">Manage inpatient admissions and bed assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BedDouble className="mr-2 h-4 w-4" />
            Bed Management
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
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBeds}</div>
            <p className="text-xs text-muted-foreground">{wards.length} wards</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0}% occupancy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableBeds}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBeds > 0 ? Math.round((stats.availableBeds / stats.totalBeds) * 100) : 0}% available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ICU Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.icuBeds}</div>
            <p className="text-xs text-muted-foreground">ICU occupancy</p>
          </CardContent>
        </Card>
      </div>

      <RoleFilteredTabs
        tabs={[
          { value: "patients", label: "Inpatients" },
          { value: "beds", label: "Bed Management" },
          { value: "ward-status", label: "Ward Status" },
          { value: "wards", label: "Ward Management" },
        ]}
        pagePath="/inpatient"
        defaultValue="patients"
        className="w-full"
      >
        <TabsContent value="patients" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Inpatient List</CardTitle>
              <CardDescription>View and manage current inpatients</CardDescription>
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
                    variant={statusFilter === "discharged" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("discharged")}
                  >
                    Discharged
                  </Button>

                  <span className="text-sm text-muted-foreground font-medium ml-4">Ward:</span>
                  <Select
                    value={wardFilter || "all"}
                    onValueChange={(value) => setWardFilter(value === "all" ? "" : value)}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder={nurseAssignedWards?.length ? "My wards" : "All Wards"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{nurseAssignedWards?.length ? "All my wards" : "All Wards"}</SelectItem>
                      {wardsForInpatientFilter.map((ward) => {
                        const patientCount = ward.admittedPatients ?? 0
                        const countLabel = ward.admittedPatients != null ? ` - ${patientCount} ${patientCount === 1 ? 'patient' : 'patients'}` : ''
                        return (
                          <SelectItem key={ward.wardId} value={ward.wardId.toString()}>
                            {ward.wardName} {ward.wardType ? `(${ward.wardType})` : ''}{countLabel}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
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
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No admissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdmissions.map((admission) => (
                          <TableRow key={admission.admissionId}>
                            <TableCell className="font-medium">{admission.admissionNumber}</TableCell>
                            <TableCell>
                              {getPatientName(admission)}
                              <div className="text-xs text-muted-foreground">{admission.patientNumber}</div>
                            </TableCell>
                            <TableCell>
                              {admission.wardName}
                              <div className="text-xs text-muted-foreground">Bed: {admission.bedNumber}</div>
                            </TableCell>
                            <TableCell>{formatDate(admission.admissionDate)}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {admission.admissionDiagnosis || "-"}
                            </TableCell>
                            <TableCell className="text-sm">{getDoctorName(admission)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  admission.status === "discharged"
                                    ? "default"
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
                                  {admission.status === 'admitted' && (
                                    <>
                                      <DropdownMenuSeparator />
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

        <TabsContent value="beds" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bed Management</CardTitle>
                  <CardDescription>View and manage hospital beds</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingBed(null)
                  setShowBedForm(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Bed
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4">
                {/* Cascading Filters: Ward Type -> Ward -> Beds */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="bedWardTypeFilter" className="text-sm font-medium whitespace-nowrap">
                      Ward Type:
                    </Label>
                    <Select
                      value={bedWardTypeFilter || "all"}
                      onValueChange={(value) => {
                        // Ensure we're setting the exact value, not a combined string
                        const newFilter = value === "all" ? "" : String(value).trim()
                        setBedWardTypeFilter(newFilter)
                        setBedWardFilter("") // Clear ward filter when type changes
                      }}
                    >
                      <SelectTrigger id="bedWardTypeFilter" className="w-[180px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Array.from(new Set(wards.map((w: any) => w.wardType).filter(Boolean))).map((type: string) => (
                          <SelectItem key={type} value={String(type).trim()}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="bedWardFilter" className="text-sm font-medium whitespace-nowrap">
                      Ward:
                    </Label>
                    <Select
                      value={bedWardFilter || "all"}
                      onValueChange={(value) => setBedWardFilter(value === "all" ? "" : value)}
                      disabled={filteredWardsForBeds.length === 0 && bedWardTypeFilter !== ""}
                    >
                      <SelectTrigger id="bedWardFilter" className="w-[200px]">
                        <SelectValue placeholder="All Wards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Wards</SelectItem>
                        {filteredWardsForBeds.map((ward: any) => (
                          <SelectItem key={ward.wardId} value={ward.wardId.toString()}>
                            {ward.wardName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status Filters and Search */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={bedStatusFilter === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBedStatusFilter("")}
                    >
                      All Beds
                    </Button>
                    <Button
                      variant={bedStatusFilter === "available" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBedStatusFilter("available")}
                    >
                      Available
                    </Button>
                    <Button
                      variant={bedStatusFilter === "occupied" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBedStatusFilter("occupied")}
                    >
                      Occupied
                    </Button>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search beds..."
                      className="w-full pl-8"
                      value={bedSearch}
                      onChange={(e) => setBedSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {loadingBeds ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading beds...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bed ID</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Admission Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBeds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No beds found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBeds.map((bed) => (
                          <TableRow key={bed.bedId}>
                            <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                            <TableCell>{bed.wardName}</TableCell>
                            <TableCell>
                              <Badge variant={bed.status === "available" ? "default" : "secondary"}>
                                {formatStatus(bed.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {bed.firstName && bed.lastName
                                ? `${bed.firstName} ${bed.lastName} ${bed.patientNumber ? `(${bed.patientNumber})` : ''}`
                                : "-"}
                            </TableCell>
                            <TableCell>{bed.admissionDate ? formatDate(bed.admissionDate) : "-"}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditBed(bed)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Bed
                                  </DropdownMenuItem>
                                  {bed.status === 'available' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeletingBed(bed)
                                          setDeleteBedOpen(true)
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Bed
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

        <TabsContent value="ward-status" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ward Status & Capacity</CardTitle>
              <CardDescription>View ward capacity and bed availability to help with admission decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Total Beds</TableHead>
                      <TableHead>Occupied</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Occupancy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No wards found
                        </TableCell>
                      </TableRow>
                    ) : (
                      wards.map((ward: any) => {
                        const totalBeds = parseInt(ward.totalBeds) || 0;
                        const occupiedBeds = parseInt(ward.occupiedBeds) || 0;
                        const availableBeds = parseInt(ward.availableBeds) || 0;
                        const capacity = parseInt(ward.capacity) || 0;
                        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
                        const hasCapacity = availableBeds > 0;

                        return (
                          <TableRow key={ward.wardId}>
                            <TableCell className="font-medium">
                              {ward.wardName}
                              {hasCapacity && (
                                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                  Has Capacity
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{ward.wardType || "-"}</TableCell>
                            <TableCell>{capacity}</TableCell>
                            <TableCell>{totalBeds}</TableCell>
                            <TableCell>
                              <span className={occupiedBeds > 0 ? "font-medium" : ""}>{occupiedBeds}</span>
                            </TableCell>
                            <TableCell>
                              <span className={hasCapacity ? "font-medium text-green-600" : "text-muted-foreground"}>
                                {availableBeds}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={occupancyRate} className="h-2 flex-1" />
                                <span className={`text-sm w-12 text-right font-medium ${occupancyRate >= 90 ? 'text-red-600' : occupancyRate >= 75 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {occupancyRate}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wards" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ward Management</CardTitle>
                  <CardDescription>View and manage hospital wards</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingWard(null)
                  setShowWardForm(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={wardTypeFilter === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWardTypeFilter("")}
                  >
                    All Wards
                  </Button>
                  {wardTypes.map((type: string) => (
                    <Button
                      key={type}
                      variant={wardTypeFilter === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWardTypeFilter(wardTypeFilter === type ? "" : type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search wards..."
                    className="w-full pl-8"
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingWards ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading wards...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ward Code</TableHead>
                        <TableHead>Ward Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No wards found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWards.map((ward: any) => (
                          <TableRow key={ward.wardId}>
                            <TableCell className="font-medium">{ward.wardCode || "-"}</TableCell>
                            <TableCell>{ward.wardName}</TableCell>
                            <TableCell>{ward.wardType || "-"}</TableCell>
                            <TableCell>{ward.capacity}</TableCell>
                            <TableCell>{ward.location || "-"}</TableCell>
                            <TableCell className="max-w-xs truncate">{ward.description || "-"}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditWard(ward)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Ward
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeletingWard(ward)
                                      setDeleteWardOpen(true)
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Ward
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
      </RoleFilteredTabs>

      <AddAdmissionForm
        open={showAdmissionForm}
        onOpenChange={setShowAdmissionForm}
        admissionType="inpatient"
        onSuccess={() => {
          loadAdmissions()
          loadBeds()
        }}
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
            <EditAdmissionForm
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

      {/* Inpatient Management Dialog - Comprehensive View */}
      {viewingAdmission && (
        <InpatientManagement
          admissionId={viewingAdmission.admissionId.toString()}
          open={viewAdmissionOpen}
          onOpenChange={(open) => {
            setViewAdmissionOpen(open)
            if (!open) setViewingAdmission(null)
          }}
          onAdmissionUpdated={loadAdmissions}
        />
      )}

      {/* Old View Admission Dialog - Disabled, replaced by InpatientManagement above */}
      {false && viewingAdmission && (
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
                  <p className="text-sm text-muted-foreground">Admitting Doctor</p>
                  <p className="font-medium">{getDoctorName(viewingAdmission)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ward/Bed</p>
                  <p className="font-medium">
                    {viewingAdmission.wardName} - {viewingAdmission.bedNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission Date</p>
                  <p className="font-medium">{formatDateTime(viewingAdmission.admissionDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                <Badge
                  variant={
                    viewingAdmission.status === "discharged"
                      ? "default"
                      : viewingAdmission.status === "admitted"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {formatStatus(viewingAdmission.status)}
                </Badge>
              </div>

              {viewingAdmission.admissionDiagnosis && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Diagnosis</p>
                  <p className="text-sm">{viewingAdmission.admissionDiagnosis}</p>
                </div>
              )}

              {viewingAdmission.admissionReason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Admission Reason</p>
                  <p className="text-sm">{viewingAdmission.admissionReason}</p>
                </div>
              )}

              {viewingAdmission.expectedDischargeDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Expected Discharge Date</p>
                  <p className="text-sm">{formatDate(viewingAdmission.expectedDischargeDate)}</p>
                </div>
              )}

              {viewingAdmission.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{viewingAdmission.notes}</p>
                </div>
              )}

              {viewingAdmission.diagnoses && viewingAdmission.diagnoses.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Diagnoses</p>
                  <div className="space-y-2">
                    {viewingAdmission.diagnoses.map((diagnosis: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{diagnosis.diagnosisDescription}</p>
                            {diagnosis.diagnosisCode && (
                              <p className="text-sm text-muted-foreground">Code: {diagnosis.diagnosisCode}</p>
                            )}
                          </div>
                          <Badge variant="outline">{diagnosis.diagnosisType}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      )}

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

      {/* Edit Bed Dialog */}
      <Dialog open={editBedOpen} onOpenChange={(open) => {
        setEditBedOpen(open)
        if (!open) setEditingBed(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Bed</DialogTitle>
            <DialogDescription>
              Update bed details for {editingBed?.bedNumber || ''}
            </DialogDescription>
          </DialogHeader>
          {editingBed ? (
            <EditBedForm
              bed={editingBed}
              wards={wards}
              onSave={(data) => handleSaveBed(editingBed.bedId.toString(), data)}
              onCancel={() => {
                setEditBedOpen(false)
                setEditingBed(null)
              }}
              saving={savingBed}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Bed Form Dialog */}
      <Dialog open={showBedForm} onOpenChange={(open) => {
        setShowBedForm(open)
        if (!open) setEditingBed(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingBed ? 'Edit Bed' : 'New Bed'}</DialogTitle>
            <DialogDescription>
              {editingBed ? `Update bed details for ${editingBed.bedNumber}` : 'Create a new hospital bed'}
            </DialogDescription>
          </DialogHeader>
          <EditBedForm
            bed={editingBed}
            wards={wards}
            onSave={async (data) => {
              if (editingBed) {
                await handleSaveBed(editingBed.bedId.toString(), data)
              } else {
                await handleCreateBed(data)
              }
            }}
            onCancel={() => {
              setShowBedForm(false)
              setEditingBed(null)
            }}
            saving={savingBed}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Bed Confirmation Dialog */}
      <AlertDialog open={deleteBedOpen} onOpenChange={(open) => !open && setDeleteBedOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bed "{deletingBed?.bedNumber}"?
              This action cannot be undone. The bed will be marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBedLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBed}
              disabled={deletingBedLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingBedLoading ? 'Deleting...' : 'Delete Bed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Ward Dialog */}
      <Dialog open={editWardOpen} onOpenChange={(open) => {
        setEditWardOpen(open)
        if (!open) setEditingWard(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Ward</DialogTitle>
            <DialogDescription>
              Update ward details for {editingWard?.wardName || ''}
            </DialogDescription>
          </DialogHeader>
          {editingWard ? (
            <EditWardForm
              ward={editingWard}
              onSave={handleSaveWard}
              onCancel={() => {
                setEditWardOpen(false)
                setEditingWard(null)
              }}
              saving={savingWard}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Ward Form Dialog */}
      <Dialog open={showWardForm} onOpenChange={(open) => {
        setShowWardForm(open)
        if (!open) setEditingWard(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWard ? 'Edit Ward' : 'New Ward'}</DialogTitle>
            <DialogDescription>
              {editingWard ? `Update ward details for ${editingWard.wardName}` : 'Create a new hospital ward'}
            </DialogDescription>
          </DialogHeader>
          <EditWardForm
            ward={editingWard}
            onSave={async (data) => {
              if (editingWard) {
                await handleSaveWard(data)
              } else {
                await handleCreateWard(data)
              }
            }}
            onCancel={() => {
              setShowWardForm(false)
              setEditingWard(null)
            }}
            saving={savingWard}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Ward Confirmation Dialog */}
      <AlertDialog open={deleteWardOpen} onOpenChange={(open) => !open && setDeleteWardOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ward</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ward "{deletingWard?.wardName}"?
              This action cannot be undone. The ward will be marked as inactive.
              Wards with active beds cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingWardLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWard}
              disabled={deletingWardLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingWardLoading ? 'Deleting...' : 'Delete Ward'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Edit Admission Form Component
function EditAdmissionForm({
  admission,
  onSave,
  onCancel,
  saving
}: {
  admission: Admission
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    admissionDiagnosis: admission?.admissionDiagnosis || '',
    admissionReason: admission?.admissionReason || '',
    expectedDischargeDate: admission?.expectedDischargeDate ? admission.expectedDischargeDate.split('T')[0] : '',
    notes: admission?.notes || '',
  })

  useEffect(() => {
    if (admission) {
      setFormData({
        admissionDiagnosis: admission.admissionDiagnosis || '',
        admissionReason: admission.admissionReason || '',
        expectedDischargeDate: admission.expectedDischargeDate ? admission.expectedDischargeDate.split('T')[0] : '',
        notes: admission.notes || '',
      })
    }
  }, [admission])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      admissionDiagnosis: formData.admissionDiagnosis || null,
      admissionReason: formData.admissionReason || null,
      expectedDischargeDate: formData.expectedDischargeDate || null,
      notes: formData.notes || null,
    })
  }

  if (!admission) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Admission Diagnosis</label>
        <Textarea
          value={formData.admissionDiagnosis}
          onChange={(e) => setFormData({ ...formData, admissionDiagnosis: e.target.value })}
          placeholder="Enter admission diagnosis..."
          className="min-h-[80px]"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Admission Reason</label>
        <Textarea
          value={formData.admissionReason}
          onChange={(e) => setFormData({ ...formData, admissionReason: e.target.value })}
          placeholder="Enter reason for admission..."
          className="min-h-[80px]"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Expected Discharge Date</label>
        <Input
          type="date"
          value={formData.expectedDischargeDate}
          onChange={(e) => setFormData({ ...formData, expectedDischargeDate: e.target.value })}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Notes</label>
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

// Edit Bed Form Component
function EditBedForm({
  bed,
  wards,
  onSave,
  onCancel,
  saving
}: {
  bed: any | null
  wards: any[]
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    bedNumber: bed?.bedNumber || '',
    wardId: bed?.wardId?.toString() || '',
    bedType: bed?.bedType || 'general',
    status: bed?.status || 'available',
    notes: bed?.notes || '',
  })

  useEffect(() => {
    if (bed) {
      setFormData({
        bedNumber: bed.bedNumber || '',
        wardId: bed.wardId?.toString() || '',
        bedType: bed.bedType || 'general',
        status: bed.status || 'available',
        notes: bed.notes || '',
      })
    } else {
      // Reset form for new bed
      setFormData({
        bedNumber: '',
        wardId: '',
        bedType: 'general',
        status: 'available',
        notes: '',
      })
    }
  }, [bed])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      bedNumber: formData.bedNumber || null,
      wardId: formData.wardId ? parseInt(formData.wardId) : null,
      bedType: formData.bedType || null,
      status: formData.status || null,
      notes: formData.notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="bedNumber" className="text-sm font-medium mb-2 block">Bed Number</Label>
        <Input
          id="bedNumber"
          value={formData.bedNumber}
          onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })}
          placeholder="Enter bed number"
          required
        />
      </div>

      <div>
        <Label htmlFor="wardId" className="text-sm font-medium mb-2 block">Ward</Label>
        <Select
          value={formData.wardId}
          onValueChange={(value) => setFormData({ ...formData, wardId: value })}
        >
          <SelectTrigger id="wardId">
            <SelectValue placeholder="Select ward" />
          </SelectTrigger>
          <SelectContent>
            {wards.map((ward) => (
              <SelectItem key={ward.wardId} value={ward.wardId.toString()}>
                {ward.wardName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bedType" className="text-sm font-medium mb-2 block">Bed Type</Label>
        <Select
          value={formData.bedType}
          onValueChange={(value) => setFormData({ ...formData, bedType: value })}
        >
          <SelectTrigger id="bedType">
            <SelectValue placeholder="Select bed type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="semi_private">Semi-Private</SelectItem>
            <SelectItem value="isolation">Isolation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="status" className="text-sm font-medium mb-2 block">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any additional notes"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
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
            bed ? 'Save Changes' : 'Create Bed'
          )}
        </Button>
      </div>
    </form>
  )
}

// Edit Ward Form Component
function EditWardForm({
  ward,
  onSave,
  onCancel,
  saving
}: {
  ward: any | null
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    wardCode: ward?.wardCode || '',
    wardName: ward?.wardName || '',
    wardType: ward?.wardType || '',
    capacity: ward?.capacity?.toString() || '',
    location: ward?.location || '',
    description: ward?.description || '',
  })

  useEffect(() => {
    if (ward) {
      setFormData({
        wardCode: ward.wardCode || '',
        wardName: ward.wardName || '',
        wardType: ward.wardType || '',
        capacity: ward.capacity?.toString() || '',
        location: ward.location || '',
        description: ward.description || '',
      })
    } else {
      // Reset form for new ward
      setFormData({
        wardCode: '',
        wardName: '',
        wardType: '',
        capacity: '',
        location: '',
        description: '',
      })
    }
  }, [ward])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      wardCode: formData.wardCode || null,
      wardName: formData.wardName || null,
      wardType: formData.wardType || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      location: formData.location || null,
      description: formData.description || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="wardCode" className="text-sm font-medium mb-2 block">Ward Code (Optional)</Label>
        <Input
          id="wardCode"
          value={formData.wardCode}
          onChange={(e) => setFormData({ ...formData, wardCode: e.target.value })}
          placeholder="Enter ward code"
        />
      </div>

      <div>
        <Label htmlFor="wardName" className="text-sm font-medium mb-2 block">Ward Name *</Label>
        <Input
          id="wardName"
          value={formData.wardName}
          onChange={(e) => setFormData({ ...formData, wardName: e.target.value })}
          placeholder="Enter ward name"
          required
        />
      </div>

      <div>
        <Label htmlFor="wardType" className="text-sm font-medium mb-2 block">Ward Type (Optional)</Label>
        <Select
          value={formData.wardType || "none"}
          onValueChange={(value) => setFormData({ ...formData, wardType: value === "none" ? "" : value })}
        >
          <SelectTrigger id="wardType">
            <SelectValue placeholder="Select ward type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Maternity">Maternity</SelectItem>
            <SelectItem value="Pediatric">Pediatric</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="capacity" className="text-sm font-medium mb-2 block">Capacity *</Label>
        <Input
          id="capacity"
          type="number"
          min="1"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          placeholder="Enter capacity"
          required
        />
      </div>

      <div>
        <Label htmlFor="location" className="text-sm font-medium mb-2 block">Location (Optional)</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Enter location"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium mb-2 block">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter description"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
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
            ward ? 'Save Changes' : 'Create Ward'
          )}
        </Button>
      </div>
    </form>
  )
}
