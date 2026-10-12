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
import { Search, Plus, Edit, Trash2, MoreVertical, Calendar, User, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { AssetAssignmentForm } from "@/components/asset-assignment-form"
import { ReturnAssetDialog } from "@/components/return-asset-dialog"

interface AssetAssignmentsListProps {
  assetId?: string
  onAssignmentChange?: () => void
}

export function AssetAssignmentsList({ assetId, onAssignmentChange }: AssetAssignmentsListProps) {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [assignmentToReturn, setAssignmentToReturn] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadAssignments()
    loadStats()
  }, [assetId, statusFilter])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      let data: any[] = []

      if (assetId) {
        data = await assetApi.getAssignmentsByAsset(assetId, statusFilter !== "all" ? statusFilter : undefined)
      } else {
        data = await assetApi.getAssignmentHistory(undefined, undefined, statusFilter !== "all" ? statusFilter : undefined)
      }

      setAssignments(data || [])
    } catch (error: any) {
      console.error("Error loading assignments:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load assignments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await assetApi.getAssignmentStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading assignment stats:", error)
    }
  }

  const handleAdd = () => {
    setEditingAssignment(null)
    setFormOpen(true)
  }

  const handleEdit = (assignment: any) => {
    setEditingAssignment(assignment)
    setFormOpen(true)
  }

  const handleReturn = (assignment: any) => {
    setAssignmentToReturn(assignment)
    setReturnDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!assignmentToDelete) return

    try {
      await assetApi.deleteAssignment(assignmentToDelete.assignmentId.toString())
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      })
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
      loadAssignments()
      loadStats()
      if (onAssignmentChange) {
        onAssignmentChange()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "returned":
        return "secondary"
      case "lost":
        return "destructive"
      case "damaged":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getConditionBadge = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "excellent":
        return "default"
      case "good":
        return "secondary"
      case "fair":
        return "outline"
      case "poor":
        return "destructive"
      default:
        return "outline"
    }
  }

  const filteredAssignments = assignments.filter((assignment) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      assignment.assetCode?.toLowerCase().includes(query) ||
      assignment.assetName?.toLowerCase().includes(query) ||
      assignment.assignedToFirstName?.toLowerCase().includes(query) ||
      assignment.assignedToLastName?.toLowerCase().includes(query) ||
      assignment.assignedToEmail?.toLowerCase().includes(query) ||
      assignment.department?.toLowerCase().includes(query) ||
      assignment.location?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignments || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeAssignments || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Returned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.returnedAssignments || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lost/Damaged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{(stats.lostAssignments || 0) + (stats.damagedAssignments || 0)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset Assignments</CardTitle>
              <CardDescription>
                {assetId ? "Assignment history for this asset" : "All asset assignments"}
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
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
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "returned" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("returned")}
              >
                Returned
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assignments..."
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
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Assignment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Days Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading assignments...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No assignments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.assignmentId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.assetCode || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{assignment.assetName || "N/A"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {assignment.assignedToFirstName} {assignment.assignedToLastName}
                            </div>
                            {assignment.assignedToEmail && (
                              <div className="text-xs text-muted-foreground">{assignment.assignedToEmail}</div>
                            )}
                            {assignment.assignedToDepartment && (
                              <div className="text-xs text-muted-foreground">{assignment.assignedToDepartment}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(assignment.assignmentDate)}
                        </div>
                        {assignment.returnDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Returned: {formatDate(assignment.returnDate)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(assignment.status)}>
                          {assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={getConditionBadge(assignment.conditionAtAssignment)} className="text-xs">
                            {assignment.conditionAtAssignment?.charAt(0).toUpperCase() + assignment.conditionAtAssignment?.slice(1)}
                          </Badge>
                          {assignment.conditionAtReturn && (
                            <div className="text-xs text-muted-foreground">
                              Return: {assignment.conditionAtReturn?.charAt(0).toUpperCase() + assignment.conditionAtReturn?.slice(1)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.location ? (
                          <div className="text-sm">{assignment.location}</div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.daysAssigned !== null && assignment.daysAssigned !== undefined ? (
                          <div className="text-sm">{assignment.daysAssigned} days</div>
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
                            {assignment.status === "active" && (
                              <>
                                <DropdownMenuItem onClick={() => handleReturn(assignment)}>
                                  <ArrowLeft className="mr-2 h-4 w-4" />
                                  Return Asset
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(assignment)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setAssignmentToDelete(assignment)
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

      <AssetAssignmentForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingAssignment(null)
          }
        }}
        onSuccess={() => {
          loadAssignments()
          loadStats()
          if (onAssignmentChange) {
            onAssignmentChange()
          }
        }}
        assignment={editingAssignment}
        assetId={assetId}
      />

      <ReturnAssetDialog
        open={returnDialogOpen}
        onOpenChange={(open) => {
          setReturnDialogOpen(open)
          if (!open) {
            setAssignmentToReturn(null)
          }
        }}
        onSuccess={() => {
          loadAssignments()
          loadStats()
          if (onAssignmentChange) {
            onAssignmentChange()
          }
        }}
        assignment={assignmentToReturn}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the assignment record. This action cannot be undone.
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
