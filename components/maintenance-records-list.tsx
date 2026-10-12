"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, Edit, Trash2, MoreVertical, Calendar, Wrench, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { MaintenanceRecordForm } from "@/components/maintenance-record-form"
import { CompleteMaintenanceDialog } from "@/components/complete-maintenance-dialog"

interface MaintenanceRecordsListProps {
  assetId?: string
  onRecordChange?: () => void
}

export function MaintenanceRecordsList({ assetId, onRecordChange }: MaintenanceRecordsListProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<any>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [recordToComplete, setRecordToComplete] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadMaintenanceRecords()
    loadStats()
  }, [assetId, statusFilter, typeFilter])

  const loadMaintenanceRecords = async () => {
    try {
      setLoading(true)
      let data: any[] = []

      if (assetId) {
        data = await assetApi.getMaintenanceByAsset(assetId, statusFilter !== "all" ? statusFilter : undefined, typeFilter !== "all" ? typeFilter : undefined)
      } else {
        data = await assetApi.getMaintenanceHistory(undefined, undefined, undefined, statusFilter !== "all" ? statusFilter : undefined, typeFilter !== "all" ? typeFilter : undefined)
      }

      setMaintenanceRecords(data || [])
    } catch (error: any) {
      console.error("Error loading maintenance records:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load maintenance records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await assetApi.getMaintenanceStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading maintenance stats:", error)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    setFormOpen(true)
  }

  const handleEdit = (record: any) => {
    setEditingRecord(record)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!recordToDelete) return

    try {
      await assetApi.deleteMaintenance(recordToDelete.maintenanceId.toString())
      toast({
        title: "Success",
        description: "Maintenance record deleted successfully",
      })
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
      loadMaintenanceRecords()
      loadStats()
      if (onRecordChange) {
        onRecordChange()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete maintenance record",
        variant: "destructive",
      })
    }
  }

  const handleComplete = (record: any) => {
    setRecordToComplete(record)
    setCompleteDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "scheduled":
        return "outline"
      case "overdue":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "outline"
    }
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      scheduled: "Scheduled",
      repair: "Repair",
      inspection: "Inspection",
      calibration: "Calibration",
      cleaning: "Cleaning",
      upgrade: "Upgrade",
      other: "Other",
    }
    return types[type] || type
  }

  const filteredRecords = maintenanceRecords.filter((record) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      record.assetCode?.toLowerCase().includes(query) ||
      record.assetName?.toLowerCase().includes(query) ||
      record.description?.toLowerCase().includes(query) ||
      record.serviceProvider?.toLowerCase().includes(query) ||
      record.maintenanceType?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMaintenance || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.scheduledCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgressCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueCount || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Maintenance Records</CardTitle>
              <CardDescription>
                {assetId ? "Maintenance history for this asset" : "All maintenance records"}
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              New Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All Status
              </Button>
              <Button
                variant={statusFilter === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("scheduled")}
              >
                Scheduled
              </Button>
              <Button
                variant={statusFilter === "in-progress" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("in-progress")}
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
              <Button
                variant={statusFilter === "overdue" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("overdue")}
              >
                Overdue
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search records..."
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
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Next Maintenance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading maintenance records...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No maintenance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.maintenanceId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.assetCode || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{record.assetName || "N/A"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(record.maintenanceType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(record.maintenanceDate)}
                        </div>
                        {record.scheduledDate && record.scheduledDate !== record.maintenanceDate && (
                          <div className="text-xs text-muted-foreground">
                            Scheduled: {formatDate(record.scheduledDate)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(record.status)}>
                          {record.status?.charAt(0).toUpperCase() + record.status?.slice(1).replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(parseFloat(record.cost || 0))}</TableCell>
                      <TableCell>
                        {record.performedByFirstName && record.performedByLastName ? (
                          <div className="text-sm">
                            {record.performedByFirstName} {record.performedByLastName}
                          </div>
                        ) : record.serviceProvider ? (
                          <div className="text-sm">{record.serviceProvider}</div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.nextMaintenanceDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(record.nextMaintenanceDate)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {record.status !== "completed" && (
                              <>
                                <DropdownMenuItem onClick={() => handleComplete(record)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setRecordToDelete(record)
                                setDeleteDialogOpen(true)
                              }}
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

      <MaintenanceRecordForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingRecord(null)
          }
        }}
        onSuccess={() => {
          loadMaintenanceRecords()
          loadStats()
          if (onRecordChange) {
            onRecordChange()
          }
        }}
        maintenance={editingRecord}
        assetId={assetId}
      />

      <CompleteMaintenanceDialog
        open={completeDialogOpen}
        onOpenChange={(open) => {
          setCompleteDialogOpen(open)
          if (!open) {
            setRecordToComplete(null)
          }
        }}
        onSuccess={() => {
          loadMaintenanceRecords()
          loadStats()
          if (onRecordChange) {
            onRecordChange()
          }
        }}
        maintenance={recordToComplete}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the maintenance record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
