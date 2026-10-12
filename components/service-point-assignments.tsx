"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Loader2, Users, MapPin } from "lucide-react"
import { pharmacyApi, servicePointApi, userApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface StaffUser {
  userId: number
  username: string
  firstName: string
  lastName: string
  email: string
  role: string
  branchId?: number
  branchName?: string
}

interface ServicePointOption {
  servicePointId: number
  pointName: string
  pointType: string
  branchId: number
  branchName?: string
}

interface Assignment {
  assignmentId: number
  servicePointId: number
  pointName: string
  pointType: string
  isDefault: boolean
  branchName?: string
}

const POINT_TYPE_LABELS: Record<string, string> = {
  registration: "Registration",
  triage: "Triage",
  consultation: "Consultation",
  cashier: "Cashier",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  radiology: "Radiology",
  billing: "Billing",
  telemedicine: "Telemedicine",
  procedure: "Procedure",
}

export function ServicePointAssignments() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [assignments, setAssignments] = useState<Record<number, Assignment[]>>({})
  const [servicePoints, setServicePoints] = useState<ServicePointOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [branches, setBranches] = useState<{ branchId: number; branchName: string }[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)
  const [selectedPointIds, setSelectedPointIds] = useState<number[]>([])
  const [defaultPointId, setDefaultPointId] = useState<number | null>(null)
  const [pointSearch, setPointSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadBranches = useCallback(async () => {
    const data = await pharmacyApi.getBranches(undefined, "true")
    setBranches(data || [])
  }, [])

  const loadServicePoints = useCallback(async () => {
    const data = await servicePointApi.getAll(undefined, undefined, undefined, "true")
    setServicePoints(
      (data || []).map((sp: any) => ({
        servicePointId: sp.servicePointId,
        pointName: sp.pointName,
        pointType: sp.pointType,
        branchId: sp.branchId,
        branchName: sp.branchName,
      })),
    )
  }, [])

  const loadUserAssignments = useCallback(async (userId: number) => {
    try {
      const rows = await servicePointApi.getUserAssignments(userId)
      setAssignments((prev) => ({
        ...prev,
        [userId]: (rows || []).map((row: any) => ({
          assignmentId: row.assignmentId,
          servicePointId: row.servicePointId,
          pointName: row.pointName,
          pointType: row.pointType,
          isDefault: Boolean(row.isDefault),
          branchName: row.branchName,
        })),
      }))
    } catch {
      setAssignments((prev) => ({ ...prev, [userId]: [] }))
    }
  }, [])

  const loadUsers = useCallback(async () => {
    const data = await userApi.getAll(undefined, 1, 500)
    const staff = (data || [])
      .filter((u: any) => u.isActive !== false && u.isActive !== 0)
      .map((u: any) => ({
        userId: u.userId,
        username: u.username,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        role: u.role || u.roleName || "",
        branchId: u.branchId,
        branchName: u.branchName,
      }))
    setUsers(staff)
    await Promise.all(staff.map((u) => loadUserAssignments(u.userId)))
  }, [loadUserAssignments])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        await Promise.all([loadBranches(), loadServicePoints(), loadUsers()])
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load staff assignments",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadBranches, loadServicePoints, loadUsers])

  const handleAssign = (user: StaffUser) => {
    const current = assignments[user.userId] || []
    setSelectedUser(user)
    setSelectedPointIds(current.map((a) => a.servicePointId))
    setDefaultPointId(current.find((a) => a.isDefault)?.servicePointId ?? current[0]?.servicePointId ?? null)
    setPointSearch("")
    setAssignDialogOpen(true)
  }

  const togglePoint = (pointId: number) => {
    setSelectedPointIds((prev) => {
      const next = prev.includes(pointId) ? prev.filter((id) => id !== pointId) : [...prev, pointId]
      if (!next.includes(defaultPointId ?? -1)) {
        setDefaultPointId(next[0] ?? null)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedUser) return
    try {
      setSubmitting(true)
      await servicePointApi.assignUser({
        userId: selectedUser.userId,
        servicePointIds: selectedPointIds,
        defaultServicePointId: defaultPointId,
      })
      toast({
        title: "Assignments saved",
        description: `Updated desks for ${selectedUser.firstName} ${selectedUser.lastName}`,
      })
      setAssignDialogOpen(false)
      await loadUserAssignments(selectedUser.userId)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save assignments",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = `${user.firstName} ${user.lastName} ${user.username} ${user.email} ${user.role}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesBranch =
        branchFilter === "all" || String(user.branchId || "") === branchFilter
      return matchesSearch && matchesBranch
    })
  }, [users, searchQuery, branchFilter])

  const dialogPoints = useMemo(() => {
    if (!selectedUser) return []
    const branchId = selectedUser.branchId
    return servicePoints.filter((sp) => {
      if (branchId && sp.branchId !== branchId) return false
      const label = `${sp.pointName} ${sp.pointType} ${sp.branchName || ""}`.toLowerCase()
      return label.includes(pointSearch.toLowerCase())
    })
  }, [selectedUser, servicePoints, pointSearch])

  const pointsByType = useMemo(() => {
    const groups: Record<string, ServicePointOption[]> = {}
    for (const point of dialogPoints) {
      if (!groups[point.pointType]) groups[point.pointType] = []
      groups[point.pointType].push(point)
    }
    return groups
  }, [dialogPoints])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff desk assignments
          </CardTitle>
          <CardDescription>
            Assign staff to registration desks, triage bays, cashier windows, and other queue stations.
            Assigned staff only see their desks in the queue dashboard selector; others see all desks at their facility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.branchId} value={String(branch.branchId)}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Home facility</TableHead>
                  <TableHead>Assigned desks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No staff found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const userAssignments = assignments[user.userId] || []
                    return (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                          <div className="text-xs text-muted-foreground">{user.username}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role || "—"}</Badge>
                        </TableCell>
                        <TableCell>{user.branchName || "—"}</TableCell>
                        <TableCell>
                          {userAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {userAssignments.map((assignment) => (
                                <Badge
                                  key={assignment.assignmentId}
                                  variant={assignment.isDefault ? "default" : "outline"}
                                >
                                  {assignment.pointName}
                                  {assignment.isDefault ? " (default)" : ""}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              All desks at facility (no restriction)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleAssign(user)}>
                            <MapPin className="mr-1 h-4 w-4" />
                            Assign desks
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assign desks — {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Select queue stations this staff member may work from.
              {selectedUser?.branchName
                ? ` Showing desks at ${selectedUser.branchName}.`
                : " Showing all active desks."}
              {" "}Leave empty to allow any desk at their facility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search desks..."
                value={pointSearch}
                onChange={(e) => setPointSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {dialogPoints.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                No service points match this staff member&apos;s facility.
              </p>
            ) : (
              Object.entries(pointsByType).map(([pointType, points]) => (
                <div key={pointType} className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {POINT_TYPE_LABELS[pointType] || pointType}
                  </h4>
                  <div className="space-y-2">
                    {points.map((point) => (
                      <div
                        key={point.servicePointId}
                        className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={selectedPointIds.includes(point.servicePointId)}
                          onCheckedChange={() => togglePoint(point.servicePointId)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{point.pointName}</div>
                          {point.branchName ? (
                            <div className="text-xs text-muted-foreground">{point.branchName}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {selectedPointIds.length > 0 ? (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                <Label>Default desk on login</Label>
                <RadioGroup
                  value={defaultPointId ? String(defaultPointId) : undefined}
                  onValueChange={(value) => setDefaultPointId(Number(value))}
                >
                  {selectedPointIds.map((id) => {
                    const point = servicePoints.find((p) => p.servicePointId === id)
                    if (!point) return null
                    return (
                      <div key={id} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(id)} id={`default-sp-${id}`} />
                        <Label htmlFor={`default-sp-${id}`} className="font-normal cursor-pointer">
                          {point.pointName}
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save assignments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
