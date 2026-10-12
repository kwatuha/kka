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
import { Plus, Search, Edit, Trash2, MoreHorizontal, Loader2, FileText, ArrowRight } from "lucide-react"
import { AddTriageForm } from "@/components/add-triage-form"
import { triageApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function TriagingPage() {
  const router = useRouter()
  const [addTriageOpen, setAddTriageOpen] = useState(false)
  const [editingTriage, setEditingTriage] = useState<any>(null)
  const [deletingTriage, setDeletingTriage] = useState<any>(null)
  const [changingStatus, setChangingStatus] = useState<any>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [changingPriority, setChangingPriority] = useState<any>(null)
  const [newPriority, setNewPriority] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [priorityLoading, setPriorityLoading] = useState(false)
  const [triageRecords, setTriageRecords] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all")

  // Load triage records from API
  useEffect(() => {
    loadTriageRecords()
  }, [])

  const loadTriageRecords = async () => {
    try {
      setLoading(true)
      const data = await triageApi.getAll()
      // Filter out any null or undefined records
      setTriageRecords((data || []).filter(record => record != null))
    } catch (error: any) {
      console.error("Error loading triage records:", error)
      toast({
        title: "Error loading triage records",
        description: error.message || "Failed to load triage records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTriage) return

    try {
      setDeleteLoading(true)
      await triageApi.delete(deletingTriage.triageId.toString())
      toast({
        title: "Triage record deleted",
        description: "Triage assessment has been deleted successfully.",
      })
      setDeletingTriage(null)
      loadTriageRecords()
    } catch (error: any) {
      console.error("Error deleting triage:", error)
      toast({
        title: "Error deleting triage",
        description: error.message || "Failed to delete triage record",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdit = (triage: any) => {
    setEditingTriage(triage)
    setAddTriageOpen(true)
  }

  const handleCloseForm = (open: boolean) => {
    setAddTriageOpen(open)
    if (!open) {
      setEditingTriage(null)
    }
  }

  const handleViewRecords = (triage: any) => {
    if (triage.patientId) {
      router.push(`/patients/${triage.patientId}`)
    } else {
      toast({
        title: "Error",
        description: "Patient ID not found",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async () => {
    if (!changingStatus || !newStatus) return

    try {
      setStatusLoading(true)
      await triageApi.update(changingStatus.triageId.toString(), {
        status: newStatus,
      })
      toast({
        title: "Status updated",
        description: `Triage status has been updated to ${newStatus.replace('_', ' ')}.`,
      })
      setChangingStatus(null)
      setNewStatus("")
      loadTriageRecords()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update triage status",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handlePriorityChange = async () => {
    if (!changingPriority || !newPriority) return

    try {
      setPriorityLoading(true)
      await triageApi.update(changingPriority.triageId.toString(), {
        priority: newPriority,
      })
      toast({
        title: "Priority updated",
        description: `Triage priority has been updated to ${newPriority}.`,
      })
      setChangingPriority(null)
      setNewPriority("")
      loadTriageRecords()
    } catch (error: any) {
      console.error("Error updating priority:", error)
      toast({
        title: "Error updating priority",
        description: error.message || "Failed to update triage priority",
        variant: "destructive",
      })
    } finally {
      setPriorityLoading(false)
    }
  }

  // Get current priority for a record
  const getCurrentPriority = (record: any) => {
    if (!record) return "Non-urgent"
    return getPriorityLabel(record)
  }

  // Format status label
  const formatStatus = (status: string) => {
    if (!status) return "Pending"
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Filter triage records
  const filteredRecords = triageRecords.filter((record) => {
    if (!record) return false

    const matchesSearch =
      !searchQuery ||
      (record.firstName && record.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.lastName && record.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.patientNumber && record.patientNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.triageNumber && record.triageNumber.toLowerCase().includes(searchQuery.toLowerCase()))

    // Map triage category to priority for filtering
    let priority = "Non-urgent"
    if (record.triageCategory === "red") {
      priority = "Emergency"
    } else if (record.triageCategory === "yellow") {
      // priorityLevel: 1=Emergency, 2=Urgent, 3=Semi-urgent, 4=Non-urgent
      if (record.priorityLevel === 2) {
        priority = "Urgent"
      } else if (record.priorityLevel === 3) {
        priority = "Semi-urgent"
      } else if (record.priorityLevel === 1) {
        priority = "Emergency" // Red category should be emergency, but handle yellow with level 1
      } else {
        priority = "Urgent" // Default yellow to urgent if priorityLevel is not set
      }
    } else if (record.triageCategory === "green") {
      priority = "Non-urgent"
    }

    // Normalize both filter and priority for case-insensitive comparison
    const normalizedFilter = priorityFilter ? priorityFilter.toLowerCase() : null
    const normalizedPriority = priority.toLowerCase()

    const matchesPriority = !priorityFilter ||
      (normalizedFilter === "emergency" && normalizedPriority === "emergency") ||
      (normalizedFilter === "urgent" && normalizedPriority === "urgent") ||
      (normalizedFilter === "semi-urgent" && normalizedPriority === "semi-urgent") ||
      (normalizedFilter === "non-urgent" && normalizedPriority === "non-urgent")

    const matchesStatus = !statusFilter ||
      (record.status && record.status.toLowerCase() === statusFilter.toLowerCase())

    return matchesSearch && matchesPriority && matchesStatus
  })

  // Format vital signs for display
  const formatVitalSigns = (record: any) => {
    const parts = []
    if (record.systolicBP && record.diastolicBP) {
      parts.push(`BP: ${record.systolicBP}/${record.diastolicBP}`)
    }
    if (record.heartRate) {
      parts.push(`HR: ${record.heartRate}`)
    }
    if (record.temperature) {
      parts.push(`Temp: ${record.temperature}°C`)
    }
    if (record.weight) {
      parts.push(`Wt: ${record.weight}kg`)
    }
    if (record.height) {
      parts.push(`Ht: ${record.height}cm`)
    }
    return parts.length > 0 ? parts.join(", ") : "N/A"
  }

  // Get priority label from triage category
  const getPriorityLabel = (record: any) => {
    if (!record) return "Non-urgent"
    if (record.triageCategory === "red") return "Emergency"
    if (record.triageCategory === "yellow") {
      // priorityLevel: 1=Emergency, 2=Urgent, 3=Semi-urgent, 4=Non-urgent
      if (record.priorityLevel === 2) {
        return "Urgent"
      } else if (record.priorityLevel === 3) {
        return "Semi-urgent"
      } else {
        return "Urgent" // Default yellow to urgent if priorityLevel is not set
      }
    }
    return "Non-urgent"
  }

  // Format arrival time
  const formatArrivalTime = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Triaging</h1>
          <p className="text-muted-foreground">Manage patient triage and prioritization</p>
        </div>
        <Button onClick={() => setAddTriageOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Triage
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Triage Management</CardTitle>
          <CardDescription>View and manage patient triage status and priority</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value)
            if (value === "all") {
              setPriorityFilter(null)
            } else {
              setPriorityFilter(value)
            }
            setStatusFilter(null)
          }}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  All Patients
                </TabsTrigger>
                <TabsTrigger value="emergency">
                  Emergency
                </TabsTrigger>
                <TabsTrigger value="urgent">
                  Urgent
                </TabsTrigger>
                <TabsTrigger value="semi-urgent">
                  Semi-urgent
                </TabsTrigger>
                <TabsTrigger value="non-urgent">
                  Non-urgent
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter("pending")
                    setPriorityFilter(null)
                  }}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter("in_progress")
                    setPriorityFilter(null)
                  }}
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter("completed")
                    setPriorityFilter(null)
                  }}
                >
                  Completed
                </Button>
                <Button
                  variant={statusFilter === "cancelled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter("cancelled")
                    setPriorityFilter(null)
                  }}
                >
                  Cancelled
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

            <TabsContent value="all" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Patient Number</TableHead>
                      <TableHead>Arrival Time</TableHead>
                      <TableHead>Vital Signs</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading triage records...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No triage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.filter(record => record != null).map((record) => {
                        if (!record) return null
                        const priority = getPriorityLabel(record)
                        return (
                          <TableRow key={record.triageId}>
                            <TableCell className="font-medium">{record.triageNumber || `TRI-${record.triageId}`}</TableCell>
                            <TableCell>
                              {record.firstName && record.lastName
                                ? `${record.firstName} ${record.lastName}`
                                : "Unknown Patient"}
                            </TableCell>
                            <TableCell>{record.patientNumber || "-"}</TableCell>
                            <TableCell>{formatArrivalTime(record.triageDate)}</TableCell>
                            <TableCell>{formatVitalSigns(record)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  priority === "Emergency"
                                    ? "destructive"
                                    : priority === "Urgent"
                                      ? "default"
                                      : priority === "Semi-urgent"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                                {record.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(record)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingPriority(record)
                                      setNewPriority(getCurrentPriority(record))
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingStatus(record)
                                      setNewStatus(record.status || "pending")
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewRecords(record)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Records
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingTriage(record)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      }).filter(Boolean)
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Patient Number</TableHead>
                      <TableHead>Arrival Time</TableHead>
                      <TableHead>Vital Signs</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading triage records...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No triage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.filter(record => record != null).map((record) => {
                        if (!record) return null
                        const priority = getPriorityLabel(record)
                        return (
                          <TableRow key={record.triageId}>
                            <TableCell className="font-medium">{record.triageNumber || `TRI-${record.triageId}`}</TableCell>
                            <TableCell>
                              {record.firstName && record.lastName
                                ? `${record.firstName} ${record.lastName}`
                                : "Unknown Patient"}
                            </TableCell>
                            <TableCell>{record.patientNumber || "-"}</TableCell>
                            <TableCell>{formatArrivalTime(record.triageDate)}</TableCell>
                            <TableCell>{formatVitalSigns(record)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  priority === "Emergency"
                                    ? "destructive"
                                    : priority === "Urgent"
                                      ? "default"
                                      : priority === "Semi-urgent"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                                {record.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(record)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingPriority(record)
                                      setNewPriority(getCurrentPriority(record))
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingStatus(record)
                                      setNewStatus(record.status || "pending")
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewRecords(record)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Records
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingTriage(record)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      }).filter(Boolean)
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="urgent" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Patient Number</TableHead>
                      <TableHead>Arrival Time</TableHead>
                      <TableHead>Vital Signs</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading triage records...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No triage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.filter(record => record != null).map((record) => {
                        if (!record) return null
                        const priority = getPriorityLabel(record)
                        return (
                          <TableRow key={record.triageId}>
                            <TableCell className="font-medium">{record.triageNumber || `TRI-${record.triageId}`}</TableCell>
                            <TableCell>
                              {record.firstName && record.lastName
                                ? `${record.firstName} ${record.lastName}`
                                : "Unknown Patient"}
                            </TableCell>
                            <TableCell>{record.patientNumber || "-"}</TableCell>
                            <TableCell>{formatArrivalTime(record.triageDate)}</TableCell>
                            <TableCell>{formatVitalSigns(record)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  priority === "Emergency"
                                    ? "destructive"
                                    : priority === "Urgent"
                                      ? "default"
                                      : priority === "Semi-urgent"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                                {record.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(record)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingPriority(record)
                                      setNewPriority(getCurrentPriority(record))
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingStatus(record)
                                      setNewStatus(record.status || "pending")
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewRecords(record)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Records
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingTriage(record)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      }).filter(Boolean)
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="semi-urgent" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Patient Number</TableHead>
                      <TableHead>Arrival Time</TableHead>
                      <TableHead>Vital Signs</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading triage records...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No triage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.filter(record => record != null).map((record) => {
                        if (!record) return null
                        const priority = getPriorityLabel(record)
                        return (
                          <TableRow key={record.triageId}>
                            <TableCell className="font-medium">{record.triageNumber || `TRI-${record.triageId}`}</TableCell>
                            <TableCell>
                              {record.firstName && record.lastName
                                ? `${record.firstName} ${record.lastName}`
                                : "Unknown Patient"}
                            </TableCell>
                            <TableCell>{record.patientNumber || "-"}</TableCell>
                            <TableCell>{formatArrivalTime(record.triageDate)}</TableCell>
                            <TableCell>{formatVitalSigns(record)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  priority === "Emergency"
                                    ? "destructive"
                                    : priority === "Urgent"
                                      ? "default"
                                      : priority === "Semi-urgent"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                                {record.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(record)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingPriority(record)
                                      setNewPriority(getCurrentPriority(record))
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingStatus(record)
                                      setNewStatus(record.status || "pending")
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewRecords(record)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Records
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingTriage(record)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      }).filter(Boolean)
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="non-urgent" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Patient Number</TableHead>
                      <TableHead>Arrival Time</TableHead>
                      <TableHead>Vital Signs</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading triage records...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No triage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.filter(record => record != null).map((record) => {
                        if (!record) return null
                        const priority = getPriorityLabel(record)
                        return (
                          <TableRow key={record.triageId}>
                            <TableCell className="font-medium">{record.triageNumber || `TRI-${record.triageId}`}</TableCell>
                            <TableCell>
                              {record.firstName && record.lastName
                                ? `${record.firstName} ${record.lastName}`
                                : "Unknown Patient"}
                            </TableCell>
                            <TableCell>{record.patientNumber || "-"}</TableCell>
                            <TableCell>{formatArrivalTime(record.triageDate)}</TableCell>
                            <TableCell>{formatVitalSigns(record)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  priority === "Emergency"
                                    ? "destructive"
                                    : priority === "Urgent"
                                      ? "default"
                                      : priority === "Semi-urgent"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                                {record.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(record)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingPriority(record)
                                      setNewPriority(getCurrentPriority(record))
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (record) {
                                      setChangingStatus(record)
                                      setNewStatus(record.status || "pending")
                                    }
                                  }}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewRecords(record)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Records
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingTriage(record)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      }).filter(Boolean)
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddTriageForm
        open={addTriageOpen}
        onOpenChange={handleCloseForm}
        onSuccess={() => {
          loadTriageRecords()
          setEditingTriage(null)
        }}
        triage={editingTriage}
      />

      <AlertDialog open={!!deletingTriage} onOpenChange={(open) => !open && setDeletingTriage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Triage Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this triage record?
              {deletingTriage && (
                <>
                  <br />
                  <br />
                  <strong>Patient:</strong> {deletingTriage.firstName} {deletingTriage.lastName}
                  <br />
                  <strong>Triage Number:</strong> {deletingTriage.triageNumber || `TRI-${deletingTriage.triageId}`}
                  <br />
                  <br />
                  This action cannot be undone.
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
              {deleteLoading ? "Deleting..." : "Delete"}
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
            <DialogTitle>Change Triage Status</DialogTitle>
            <DialogDescription>
              Update the status for {changingStatus && `${changingStatus.firstName} ${changingStatus.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="text-sm text-muted-foreground">
                <Badge
                  variant={
                    changingStatus?.status === "completed"
                      ? "default"
                      : changingStatus?.status === "in_progress"
                        ? "secondary"
                        : changingStatus?.status === "cancelled"
                          ? "destructive"
                          : "outline"
                  }
                >
                  {formatStatus(changingStatus?.status || "pending")}
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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

      {changingPriority && (
        <Dialog open={!!changingPriority} onOpenChange={(open) => {
          if (!open) {
            setChangingPriority(null)
            setNewPriority("")
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Triage Priority</DialogTitle>
              <DialogDescription>
                Update the priority for {changingPriority.firstName} {changingPriority.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Priority</Label>
                <div className="text-sm text-muted-foreground">
                  <Badge
                    variant={
                      getCurrentPriority(changingPriority) === "Emergency"
                        ? "destructive"
                        : getCurrentPriority(changingPriority) === "Urgent"
                          ? "default"
                          : getCurrentPriority(changingPriority) === "Semi-urgent"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {getCurrentPriority(changingPriority)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-priority">New Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger id="new-priority">
                    <SelectValue placeholder="Select new priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Semi-urgent">Semi-urgent</SelectItem>
                    <SelectItem value="Non-urgent">Non-urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setChangingPriority(null)
                  setNewPriority("")
                }}
                disabled={priorityLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePriorityChange}
                disabled={priorityLoading || !newPriority || newPriority === getCurrentPriority(changingPriority)}
              >
                {priorityLoading ? "Updating..." : "Update Priority"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
