"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Plus, X, Loader2, Users, Building2 } from "lucide-react"
import { nursingApi, userApi, inpatientApi, roleApi } from "@/lib/api"
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

interface Nurse {
  userId: number
  username: string
  firstName: string
  lastName: string
  email: string
  role: string
  roleId: number
}

interface Ward {
  wardId: number
  wardName: string
  wardType: string
}

interface Assignment {
  assignmentId: number
  wardId: number
  wardName: string
  wardType: string
  isActive: boolean
}

export function NurseWardAssignments() {
  const [nurses, setNurses] = useState<Nurse[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [assignments, setAssignments] = useState<Record<number, Assignment[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [wardSearch, setWardSearch] = useState("")
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null)
  const [selectedWardIds, setSelectedWardIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadNurses(), loadWards()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadNurses = async () => {
    try {
      // Get all roles that might be nurses
      const roles = await roleApi.getAll()
      const nurseRoleIds: number[] = []

      // Find all roles that could be nurses
      roles.forEach((r: any) => {
        const roleName = (r.roleName || '').toLowerCase()
        if ((roleName.includes('nurse') || roleName.includes('triage')) &&
            !roleName.includes('doctor')) {
          nurseRoleIds.push(r.roleId)
        }
      })

      // Get users from all nurse-related roles
      const allNurses: Nurse[] = []

      if (nurseRoleIds.length > 0) {
        for (const roleId of nurseRoleIds) {
          try {
            const roleUsers = await roleApi.getUsersByRole(roleId.toString())
            if (roleUsers?.users && roleUsers.users.length > 0) {
              allNurses.push(...roleUsers.users.map((u: any) => ({
                userId: u.userId,
                username: u.username,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                email: u.email || '',
                role: u.role || u.roleName || '',
                roleId: u.roleId || roleId,
              })))
            }
          } catch (err) {
            console.error(`Error loading users for role ${roleId}:`, err)
          }
        }
      }

      // Fallback: also check all users and filter by role name
      if (allNurses.length === 0) {
        const allUsers = await userApi.getAll()
        const nursesList = allUsers.filter((u: any) => {
          const roleName = (u.role || u.roleName || '').toLowerCase()
          return roleName === 'nurse' ||
                 roleName === 'nursing' ||
                 roleName === 'triage' ||
                 (roleName.includes('nurse') && !roleName.includes('doctor'))
        })

        allNurses.push(...nursesList.map((u: any) => ({
          userId: u.userId,
          username: u.username,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          role: u.role || u.roleName || '',
          roleId: u.roleId || 0,
        })))
      }

      // Remove duplicates based on userId
      const uniqueNurses = Array.from(
        new Map(allNurses.map(nurse => [nurse.userId, nurse])).values()
      )

      setNurses(uniqueNurses)

      // Load assignments for each nurse
      for (const nurse of uniqueNurses) {
        await loadNurseAssignments(nurse.userId)
      }
    } catch (error: any) {
      console.error("Error loading nurses:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to load nurses",
        variant: "destructive",
      })
    }
  }

  const loadWards = async () => {
    try {
      const wardsData = await inpatientApi.getWards()
      const uniqueWards = Array.from(
        new Map(
          (wardsData || []).map((w: any) => [w.wardId, {
            wardId: w.wardId,
            wardName: w.wardName,
            wardType: w.wardType,
          }]),
        ).values(),
      )
      setWards(uniqueWards)
    } catch (error: any) {
      console.error("Error loading wards:", error)
      toast({
        title: "Error",
        description: "Failed to load wards",
        variant: "destructive",
      })
    }
  }

  const loadNurseAssignments = async (nurseUserId: number) => {
    try {
      const assignedWards = await nursingApi.getNurseAssignments(nurseUserId)
      setAssignments(prev => ({
        ...prev,
        [nurseUserId]: assignedWards || []
      }))
    } catch (error: any) {
      console.error(`Error loading assignments for nurse ${nurseUserId}:`, error)
      setAssignments(prev => ({
        ...prev,
        [nurseUserId]: []
      }))
    }
  }

  const handleAssignWards = (nurse: Nurse) => {
    setSelectedNurse(nurse)
    // Get current assignments for this nurse
    const currentAssignments = assignments[nurse.userId] || []
    setSelectedWardIds(currentAssignments.map(a => a.wardId))
    setAssignDialogOpen(true)
  }

  const handleSaveAssignments = async () => {
    if (!selectedNurse) return

    try {
      setSubmitting(true)
      await nursingApi.assignWards(selectedNurse.userId, selectedWardIds)

      toast({
        title: "Success",
        description: `Ward assignments updated for ${selectedNurse.firstName} ${selectedNurse.lastName}`,
      })

      setAssignDialogOpen(false)
      // Reload assignments for this nurse
      await loadNurseAssignments(selectedNurse.userId)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to update ward assignments",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleWardSelection = (wardId: number) => {
    setSelectedWardIds(prev =>
      prev.includes(wardId)
        ? prev.filter(id => id !== wardId)
        : [...prev, wardId]
    )
  }

  const filteredNurses = nurses.filter(nurse =>
    `${nurse.firstName} ${nurse.lastName} ${nurse.username} ${nurse.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  const filteredWards = wards.filter(ward =>
    `${ward.wardName} ${ward.wardType || ""}`.toLowerCase().includes(wardSearch.toLowerCase())
  )

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Nurse Ward Assignments
              </CardTitle>
              <CardDescription>
                Assign nurses to wards to restrict drug pickup requests to their assigned wards
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search nurses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nurse</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Wards</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNurses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No nurses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNurses.map((nurse) => {
                    const nurseAssignments = assignments[nurse.userId] || []
                    return (
                      <TableRow key={nurse.userId}>
                        <TableCell className="font-medium">
                          {nurse.firstName} {nurse.lastName}
                        </TableCell>
                        <TableCell>{nurse.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{nurse.role || 'Nurse'}</Badge>
                        </TableCell>
                        <TableCell>
                          {nurseAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {nurseAssignments.map((assignment) => (
                                <Badge key={assignment.assignmentId} variant="outline">
                                  {assignment.wardName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No wards assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignWards(nurse)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Assign Wards
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
              Assign Wards to {selectedNurse?.firstName} {selectedNurse?.lastName}
            </DialogTitle>
            <DialogDescription>
              Select the wards this nurse should be assigned to. Nurses can only see and request drug pickups for patients in their assigned wards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {wards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No wards available
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search wards..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredWards.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No wards match your search
                    </div>
                  ) : (
                    filteredWards.map((ward) => (
                      <div
                        key={ward.wardId}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent"
                      >
                        <Checkbox
                          checked={selectedWardIds.includes(ward.wardId)}
                          onCheckedChange={() => toggleWardSelection(ward.wardId)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{ward.wardName}</div>
                          {ward.wardType && (
                            <div className="text-sm text-muted-foreground">{ward.wardType}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Assignments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
