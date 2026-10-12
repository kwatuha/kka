"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, FileText, Activity, Heart, Edit, Trash2, MoreHorizontal, Loader2, ArrowRight } from "lucide-react"
import { AddAdmissionForm } from "@/components/add-admission-form"
import { AddBedForm } from "@/components/add-bed-form"
import { AddEquipmentForm } from "@/components/add-equipment-form"
import { ICUManagement } from "@/components/icu-management"
import { icuApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function ICUPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [addAdmissionOpen, setAddAdmissionOpen] = useState(false)
  const [editingAdmission, setEditingAdmission] = useState<any>(null)
  const [deletingAdmission, setDeletingAdmission] = useState<any>(null)
  const [changingStatus, setChangingStatus] = useState<any>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [admissions, setAdmissions] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [beds, setBeds] = useState<any[]>([])
  const [bedsLoading, setBedsLoading] = useState(false)
  const [bedStatusFilter, setBedStatusFilter] = useState<string | null>(null)
  const [bedSearchQuery, setBedSearchQuery] = useState("")
  const [editingBed, setEditingBed] = useState<any>(null)
  const [deletingBed, setDeletingBed] = useState<any>(null)
  const [deleteBedLoading, setDeleteBedLoading] = useState(false)
  const [addBedOpen, setAddBedOpen] = useState(false)
  const [equipment, setEquipment] = useState<any[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<string | null>(null)
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState("")
  const [editingEquipment, setEditingEquipment] = useState<any>(null)
  const [deletingEquipment, setDeletingEquipment] = useState<any>(null)
  const [deleteEquipmentLoading, setDeleteEquipmentLoading] = useState(false)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)
  const [viewICUAdmissionOpen, setViewICUAdmissionOpen] = useState(false)
  const [viewingICUAdmission, setViewingICUAdmission] = useState<any>(null)

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load ICU admissions, beds, and equipment from API (only after mount)
  useEffect(() => {
    if (isMounted) {
      loadAdmissions()
      loadBeds()
      loadEquipment()
    }
  }, [isMounted])

  const loadAdmissions = async () => {
    try {
      setLoading(true)
      const data = await icuApi.getAdmissions()
      setAdmissions(data || [])
    } catch (error: any) {
      console.error("Error loading ICU admissions:", error)
      toast({
        title: "Error loading admissions",
        description: error.message || "Failed to load ICU admissions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAdmission) return

    try {
      setDeleteLoading(true)
      await icuApi.deleteAdmission(deletingAdmission.icuAdmissionId.toString())
      toast({
        title: "Admission discharged",
        description: "ICU admission has been discharged successfully.",
      })
      setDeletingAdmission(null)
      loadAdmissions()
    } catch (error: any) {
      console.error("Error deleting admission:", error)
      toast({
        title: "Error discharging admission",
        description: error.message || "Failed to discharge admission",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!changingStatus || !newStatus) return

    try {
      setStatusLoading(true)
      await icuApi.updateAdmission(changingStatus.icuAdmissionId.toString(), {
        status: newStatus,
      })
      toast({
        title: "Status updated",
        description: `Patient status has been updated to ${newStatus}.`,
      })
      setChangingStatus(null)
      setNewStatus("")
      loadAdmissions()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update patient status",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleViewRecords = (admission: any) => {
    setViewingICUAdmission(admission)
    setViewICUAdmissionOpen(true)
  }

  const handleEdit = (admission: any) => {
    setEditingAdmission(admission)
    setAddAdmissionOpen(true)
  }

  const handleCloseForm = (open: boolean) => {
    setAddAdmissionOpen(open)
    if (!open) {
      setEditingAdmission(null)
    }
  }

  // Filter admissions
  const filteredAdmissions = admissions.filter((admission) => {
    const matchesSearch =
      !searchQuery ||
      (admission.firstName && admission.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (admission.lastName && admission.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (admission.patientNumber && admission.patientNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (admission.admissionNumber && admission.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = !statusFilter || admission.status === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const loadBeds = async () => {
    try {
      setBedsLoading(true)
      const data = await icuApi.getBeds(bedStatusFilter || undefined)
      setBeds(data || [])
    } catch (error: any) {
      console.error("Error loading ICU beds:", error)
      toast({
        title: "Error loading beds",
        description: error.message || "Failed to load ICU beds",
        variant: "destructive",
      })
    } finally {
      setBedsLoading(false)
    }
  }

  const handleDeleteBed = async () => {
    if (!deletingBed) return

    try {
      setDeleteBedLoading(true)
      await icuApi.deleteBed(deletingBed.icuBedId.toString())
      toast({
        title: "Bed deactivated",
        description: "ICU bed has been deactivated successfully.",
      })
      setDeletingBed(null)
      loadBeds()
    } catch (error: any) {
      console.error("Error deleting bed:", error)
      toast({
        title: "Error deactivating bed",
        description: error.message || "Failed to deactivate bed",
        variant: "destructive",
      })
    } finally {
      setDeleteBedLoading(false)
    }
  }

  const handleEditBed = (bed: any) => {
    setEditingBed(bed)
    setAddBedOpen(true)
  }

  const handleCloseBedForm = (open: boolean) => {
    setAddBedOpen(open)
    if (!open) {
      setEditingBed(null)
    }
  }

  // Filter beds
  const filteredBeds = beds.filter((bed) => {
    const matchesSearch =
      !bedSearchQuery ||
      (bed.bedNumber && bed.bedNumber.toLowerCase().includes(bedSearchQuery.toLowerCase())) ||
      (bed.firstName && bed.firstName.toLowerCase().includes(bedSearchQuery.toLowerCase())) ||
      (bed.lastName && bed.lastName.toLowerCase().includes(bedSearchQuery.toLowerCase())) ||
      (bed.patientNumber && bed.patientNumber.toLowerCase().includes(bedSearchQuery.toLowerCase()))

    const matchesStatus = !bedStatusFilter || bed.status === bedStatusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const loadEquipment = async () => {
    try {
      setEquipmentLoading(true)
      const data = await icuApi.getEquipment(equipmentStatusFilter || undefined)
      setEquipment(data || [])
    } catch (error: any) {
      console.error("Error loading ICU equipment:", error)
      toast({
        title: "Error loading equipment",
        description: error.message || "Failed to load ICU equipment",
        variant: "destructive",
      })
    } finally {
      setEquipmentLoading(false)
    }
  }

  const handleDeleteEquipment = async () => {
    if (!deletingEquipment) return

    try {
      setDeleteEquipmentLoading(true)
      await icuApi.deleteEquipment(deletingEquipment.icuEquipmentId.toString())
      toast({
        title: "Equipment retired",
        description: "ICU equipment has been retired successfully.",
      })
      setDeletingEquipment(null)
      loadEquipment()
    } catch (error: any) {
      console.error("Error deleting equipment:", error)
      toast({
        title: "Error retiring equipment",
        description: error.message || "Failed to retire equipment",
        variant: "destructive",
      })
    } finally {
      setDeleteEquipmentLoading(false)
    }
  }

  const handleCloseEquipmentForm = (open: boolean) => {
    setAddEquipmentOpen(open)
    if (!open) {
      setEditingEquipment(null)
    }
  }

  // Filter equipment
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      !equipmentSearchQuery ||
      (item.equipmentName && item.equipmentName.toLowerCase().includes(equipmentSearchQuery.toLowerCase())) ||
      (item.equipmentType && item.equipmentType.toLowerCase().includes(equipmentSearchQuery.toLowerCase())) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(equipmentSearchQuery.toLowerCase()))

    const matchesStatus = !equipmentStatusFilter || item.status === equipmentStatusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Intensive Care Unit</h1>
            <p className="text-muted-foreground">Manage ICU patients and monitor critical care</p>
          </div>
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
          <h1 className="text-2xl font-bold tracking-tight">Intensive Care Unit</h1>
          <p className="text-muted-foreground">Manage ICU patients and monitor critical care</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            View Vitals
          </Button>
          <Button onClick={() => setAddAdmissionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Admission
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total ICU Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-xs text-muted-foreground">Fully equipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">40% occupancy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">On ventilator support</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">Ready for admission</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients">ICU Patients</TabsTrigger>
          <TabsTrigger value="beds">Bed Management</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>ICU Patient List</CardTitle>
              <CardDescription>View and manage current ICU patients</CardDescription>
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
                    variant={statusFilter === "critical" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("critical")}
                  >
                    Critical
                  </Button>
                  <Button
                    variant={statusFilter === "serious" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("serious")}
                  >
                    Serious
                  </Button>
                  <Button
                    variant={statusFilter === "stable" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("stable")}
                  >
                    Stable
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search patients..."
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
                      <TableHead>ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Bed</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Vital Signs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading ICU admissions...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredAdmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No ICU admissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdmissions.map((admission) => (
                        <TableRow key={admission.icuAdmissionId}>
                          <TableCell className="font-medium">{admission.admissionNumber || `ICU-${admission.icuAdmissionId}`}</TableCell>
                          <TableCell>
                            {admission.firstName && admission.lastName
                              ? `${admission.firstName} ${admission.lastName}`
                              : "Unknown Patient"}
                            {admission.patientNumber && (
                              <div className="text-xs text-muted-foreground">{admission.patientNumber}</div>
                            )}
                          </TableCell>
                          <TableCell>{admission.bedNumber || "-"}</TableCell>
                          <TableCell>{admission.admissionReason || "-"}</TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              Status: {admission.status || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                admission.status === "critical"
                                  ? "destructive"
                                  : admission.status === "serious"
                                    ? "secondary"
                                    : "default"
                              }
                            >
                              {admission.status ? admission.status.charAt(0).toUpperCase() + admission.status.slice(1) : "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {admission.doctorFirstName && admission.doctorLastName
                              ? `Dr. ${admission.doctorFirstName} ${admission.doctorLastName}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(admission)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setChangingStatus(admission)
                                  setNewStatus(admission.status || "critical")
                                }}>
                                  <ArrowRight className="mr-2 h-4 w-4" />
                                  Change Status
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewRecords(admission)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Records
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingAdmission(admission)}
                                  className="text-red-600"
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
        </TabsContent>

        <TabsContent value="beds" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>ICU Bed Management</CardTitle>
              <CardDescription>View and manage ICU beds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant={bedStatusFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBedStatusFilter(null)
                      loadBeds()
                    }}
                  >
                    All Beds
                  </Button>
                  <Button
                    variant={bedStatusFilter === "available" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBedStatusFilter("available")
                      loadBeds()
                    }}
                  >
                    Available
                  </Button>
                  <Button
                    variant={bedStatusFilter === "occupied" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBedStatusFilter("occupied")
                      loadBeds()
                    }}
                  >
                    Occupied
                  </Button>
                  <Button
                    variant={bedStatusFilter === "maintenance" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBedStatusFilter("maintenance")
                      loadBeds()
                    }}
                  >
                    Maintenance
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setAddBedOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bed
                  </Button>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search beds..."
                      className="w-full pl-8"
                      value={bedSearchQuery}
                      onChange={(e) => setBedSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bed Number</TableHead>
                      <TableHead>Bed Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bedsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading beds...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredBeds.length > 0 ? (
                      filteredBeds.map((bed) => (
                        <TableRow key={bed.icuBedId}>
                          <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{bed.bedType || "standard"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                bed.status === "available"
                                  ? "default"
                                  : bed.status === "occupied"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {bed.status || "available"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bed.firstName && bed.lastName ? (
                              <div>
                                <p className="font-medium">
                                  {bed.firstName} {bed.lastName}
                                </p>
                                {bed.patientNumber && (
                                  <p className="text-xs text-muted-foreground">{bed.patientNumber}</p>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-sm">
                              {bed.equipmentList || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditBed(bed)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingBed(bed)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No beds found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>ICU Equipment Management</CardTitle>
              <CardDescription>View and manage ICU equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant={equipmentStatusFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEquipmentStatusFilter(null)
                      loadEquipment()
                    }}
                  >
                    All Equipment
                  </Button>
                  <Button
                    variant={equipmentStatusFilter === "available" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEquipmentStatusFilter("available")
                      loadEquipment()
                    }}
                  >
                    Available
                  </Button>
                  <Button
                    variant={equipmentStatusFilter === "in_use" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEquipmentStatusFilter("in_use")
                      loadEquipment()
                    }}
                  >
                    In Use
                  </Button>
                  <Button
                    variant={equipmentStatusFilter === "maintenance" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEquipmentStatusFilter("maintenance")
                      loadEquipment()
                    }}
                  >
                    Maintenance
                  </Button>
                  <Button
                    variant={equipmentStatusFilter === "retired" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEquipmentStatusFilter("retired")
                      loadEquipment()
                    }}
                  >
                    Retired
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setAddEquipmentOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Equipment
                  </Button>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search equipment..."
                      className="w-full pl-8"
                      value={equipmentSearchQuery}
                      onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Maintenance</TableHead>
                      <TableHead>Next Maintenance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipmentLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading equipment...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredEquipment.length > 0 ? (
                      filteredEquipment.map((item) => (
                        <TableRow key={item.icuEquipmentId}>
                          <TableCell className="font-medium">{item.equipmentName}</TableCell>
                          <TableCell>{item.equipmentType || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.serialNumber || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "available"
                                  ? "default"
                                  : item.status === "in_use"
                                    ? "secondary"
                                    : item.status === "maintenance"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {item.status || "available"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.lastMaintenanceDate
                              ? new Date(item.lastMaintenanceDate).toISOString().split("T")[0]
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.nextMaintenanceDate
                              ? new Date(item.nextMaintenanceDate).toISOString().split("T")[0]
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingEquipment(item)
                                  setAddEquipmentOpen(true)
                                }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingEquipment(item)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Retire
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No equipment found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddAdmissionForm
        open={addAdmissionOpen}
        onOpenChange={handleCloseForm}
        onSuccess={() => {
          loadAdmissions()
          setEditingAdmission(null)
        }}
        admission={editingAdmission}
        admissionType="icu"
      />

      <AlertDialog open={!!deletingAdmission} onOpenChange={(open) => !open && setDeletingAdmission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discharge ICU Admission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discharge this ICU admission?
              {deletingAdmission && (
                <>
                  <br />
                  <br />
                  <strong>Patient:</strong> {deletingAdmission.firstName} {deletingAdmission.lastName}
                  <br />
                  <strong>Admission:</strong> {deletingAdmission.admissionNumber || `ICU-${deletingAdmission.icuAdmissionId}`}
                  <br />
                  <strong>Bed:</strong> {deletingAdmission.bedNumber || "N/A"}
                  <br />
                  <br />
                  This will free the ICU bed and mark the admission as discharged.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Discharging..." : "Discharge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changingStatus} onOpenChange={(open) => {
        if (!open) {
          setChangingStatus(null)
          setNewStatus("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Patient Status</DialogTitle>
            <DialogDescription>
              Update the ICU status for {changingStatus && `${changingStatus.firstName} ${changingStatus.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="text-sm text-muted-foreground">
                <Badge
                  variant={
                    changingStatus?.status === "critical"
                      ? "destructive"
                      : changingStatus?.status === "serious"
                        ? "secondary"
                        : "default"
                  }
                >
                  {changingStatus?.status ? changingStatus.status.charAt(0).toUpperCase() + changingStatus.status.slice(1) : "Unknown"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="new-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangingStatus(null)
                setNewStatus("")
              }}
              disabled={statusLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={statusLoading || !newStatus || newStatus === changingStatus?.status}
            >
              {statusLoading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddBedForm
        open={addBedOpen}
        onOpenChange={handleCloseBedForm}
        onSuccess={() => {
          loadBeds()
          setEditingBed(null)
        }}
        bed={editingBed}
      />

      <AlertDialog open={!!deletingBed} onOpenChange={(open) => !open && setDeletingBed(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate ICU Bed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this ICU bed?
              {deletingBed && (
                <>
                  <br />
                  <br />
                  <strong>Bed Number:</strong> {deletingBed.bedNumber}
                  <br />
                  <strong>Status:</strong> {deletingBed.status}
                  <br />
                  <br />
                  This will mark the bed as inactive. You cannot deactivate a bed that is currently occupied.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBedLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBed}
              disabled={deleteBedLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteBedLoading ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddEquipmentForm
        open={addEquipmentOpen}
        onOpenChange={handleCloseEquipmentForm}
        onSuccess={() => {
          loadEquipment()
          setEditingEquipment(null)
        }}
        equipment={editingEquipment}
      />

      <AlertDialog open={!!deletingEquipment} onOpenChange={(open) => !open && setDeletingEquipment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire ICU Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to retire this ICU equipment?
              {deletingEquipment && (
                <>
                  <br />
                  <br />
                  <strong>Equipment:</strong> {deletingEquipment.equipmentName}
                  <br />
                  <strong>Status:</strong> {deletingEquipment.status}
                  <br />
                  <br />
                  You cannot retire equipment that is currently in use.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEquipmentLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEquipment}
              disabled={deleteEquipmentLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteEquipmentLoading ? "Retiring..." : "Retire"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ICU Management Dialog */}
      {viewingICUAdmission && (
        <ICUManagement
          icuAdmissionId={viewingICUAdmission.icuAdmissionId.toString()}
          open={viewICUAdmissionOpen}
          onOpenChange={setViewICUAdmissionOpen}
        />
      )}
    </div>
  )
}
