"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Eye, Shield, Loader2, Users, Download, FileSpreadsheet, FileText } from "lucide-react"
import { roleApi, privilegeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { RoleForm } from "@/components/administration/role-form"
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
import { formatDate } from "@/lib/date-utils"

export function RolesManagement() {
  const [roles, setRoles] = useState<any[]>([])
  const [privileges, setPrivileges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("") // Input value (what user types)
  const [searchTerm, setSearchTerm] = useState("") // Actual search term used for filtering
  const [formOpen, setFormOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [usersDialogOpen, setUsersDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [roleUsers, setRoleUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<any>(null)

  useEffect(() => {
    loadRoles()
    loadPrivileges()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await roleApi.getAll()
      setRoles(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading roles:", error)
      toast({
        title: "Error",
        description: "Failed to load roles.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPrivileges = async () => {
    try {
      const data = await privilegeApi.getAll()
      setPrivileges(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading privileges:", error)
    }
  }

  const handleAdd = () => {
    setSelectedRole(null)
    setFormOpen(true)
  }

  const handleEdit = async (role: any) => {
    try {
      const fullRole = await roleApi.getById(role.roleId.toString())
      setSelectedRole(fullRole)
      setFormOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load role details.",
        variant: "destructive",
      })
    }
  }

  const handleView = async (role: any) => {
    try {
      const fullRole = await roleApi.getById(role.roleId.toString())
      setSelectedRole(fullRole)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load role details.",
        variant: "destructive",
      })
    }
  }

  const handleViewUsers = async (role: any) => {
    try {
      setLoadingUsers(true)
      setSelectedRole(role)
      const data = await roleApi.getUsersByRole(role.roleId.toString())
      setRoleUsers(data.users || [])
      setUsersDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load users for this role.",
        variant: "destructive",
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleExportToExcel = async () => {
    if (!selectedRole || roleUsers.length === 0) {
      toast({
        title: "No Data",
        description: "No users to export.",
        variant: "destructive",
      })
      return
    }

    try {
      // Dynamically import xlsx only on client side to avoid SSR issues
      if (typeof window === "undefined") {
        toast({
          title: "Error",
          description: "Excel export is only available in the browser.",
          variant: "destructive",
        })
        return
      }

      // Dynamically import xlsx
      // Note: You may need to restart the dev server after installing xlsx
      const xlsxModule = await import("xlsx")
      const XLSX = xlsxModule.default || xlsxModule

      if (!XLSX || !XLSX.utils) {
        throw new Error("Excel library not properly loaded. Please restart the development server.")
      }

      // Prepare data for Excel
      const excelData = roleUsers.map((user, index) => ({
        "#": index + 1,
        "First Name": user.firstName || "",
        "Last Name": user.lastName || "",
        "Full Name": `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        "Username": user.username || "",
        "Email": user.email || "",
        "Phone": user.phone || "",
        "Department": user.department || "",
        "Status": user.isActive ? "Active" : "Inactive",
        "Created Date": user.createdAt ? formatDate(user.createdAt) : "",
      }))

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Users")

      // Set column widths
      const colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // First Name
        { wch: 15 },  // Last Name
        { wch: 20 },  // Full Name
        { wch: 15 },  // Username
        { wch: 25 },  // Email
        { wch: 15 },  // Phone
        { wch: 20 },  // Department
        { wch: 10 },  // Status
        { wch: 15 },  // Created Date
      ]
      ws["!cols"] = colWidths

      // Generate filename
      const roleName = selectedRole.roleName.replace(/[^a-z0-9]/gi, "_")
      const filename = `Users_${roleName}_${new Date().toISOString().split("T")[0]}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      toast({
        title: "Success",
        description: `Exported ${roleUsers.length} user(s) to Excel.`,
      })
    } catch (error: any) {
      console.error("Error exporting to Excel:", error)
      toast({
        title: "Error",
        description: "Failed to export to Excel.",
        variant: "destructive",
      })
    }
  }

  const handleExportToPDF = async () => {
    if (!selectedRole || roleUsers.length === 0) {
      toast({
        title: "No Data",
        description: "No users to export.",
        variant: "destructive",
      })
      return
    }

    try {
      // Dynamically import jsPDF and jspdf-autotable only on client side
      if (typeof window === "undefined") {
        toast({
          title: "Error",
          description: "PDF export is only available in the browser.",
          variant: "destructive",
        })
        return
      }

      const [{ default: jsPDF }, ..._] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])

      // Create PDF document
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      })

      // Add title
      pdf.setFontSize(16)
      pdf.text(`Users with Role: ${selectedRole.roleName}`, 14, 15)

      // Add metadata
      pdf.setFontSize(10)
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22)
      pdf.text(`Total Users: ${roleUsers.length}`, 14, 27)

      // Prepare table data
      const tableData = roleUsers.map((user, index) => [
        index + 1,
        `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        user.username || "",
        user.email || "",
        user.phone || "",
        user.department || "",
        user.isActive ? "Active" : "Inactive",
      ])

      // Add table
      ;(pdf as any).autoTable({
        head: [["#", "Name", "Username", "Email", "Phone", "Department", "Status"]],
        body: tableData,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 10 },  // #
          1: { cellWidth: 35 },   // Name
          2: { cellWidth: 25 },   // Username
          3: { cellWidth: 40 },   // Email
          4: { cellWidth: 25 },   // Phone
          5: { cellWidth: 30 },   // Department
          6: { cellWidth: 20 },   // Status
        },
      })

      // Generate filename
      const roleName = selectedRole.roleName.replace(/[^a-z0-9]/gi, "_")
      const filename = `Users_${roleName}_${new Date().toISOString().split("T")[0]}.pdf`

      // Save PDF
      pdf.save(filename)

      toast({
        title: "Success",
        description: `Exported ${roleUsers.length} user(s) to PDF.`,
      })
    } catch (error: any) {
      console.error("Error exporting to PDF:", error)
      toast({
        title: "Error",
        description: "Failed to export to PDF.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = (role: any) => {
    setRoleToDelete(role)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return

    try {
      await roleApi.delete(roleToDelete.roleId.toString())
      toast({
        title: "Success",
        description: "Role deactivated successfully.",
      })
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
      loadRoles()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role.",
        variant: "destructive",
      })
    }
  }

  const filteredRoles = roles.filter((role) => {
    const search = searchTerm.toLowerCase()
    return (
      role.roleName?.toLowerCase().includes(search) ||
      role.description?.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Role Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage system roles and their permissions
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                All system roles ({filteredRoles.length})
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search roles... (Press Enter)"
                className="pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchTerm(searchInput)
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No roles found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Privileges</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.roleId}>
                    <TableCell className="font-medium">{role.roleName}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role.userCount || 0}</Badge>
                        {role.userCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUsers(role)}
                            title="View Users"
                            className="h-6 px-2"
                          >
                            <Users className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.privilegeCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? "default" : "secondary"}>
                        {role.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(role.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(role)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(role)}
                          title="Edit Role"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role)}
                          title="Delete Role"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Form */}
      <RoleForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setSelectedRole(null)
          }
        }}
        onSuccess={() => {
          loadRoles()
          setSelectedRole(null)
        }}
        role={selectedRole}
        privileges={privileges}
      />

      {/* View Dialog */}
      {selectedRole && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Role Details</DialogTitle>
              <DialogDescription>View complete role information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role Name</p>
                  <p className="text-sm font-semibold">{selectedRole.roleName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedRole.isActive ? "default" : "secondary"}>
                    {selectedRole.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedRole.description || "—"}</p>
                </div>
              </div>
              {selectedRole.privileges && selectedRole.privileges.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Assigned Privileges ({selectedRole.privileges.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRole.privileges.map((priv: any) => (
                      <Badge key={priv.privilegeId} variant="outline">
                        {priv.privilegeName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Users Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  Users with Role: {selectedRole?.roleName}
                </DialogTitle>
                <DialogDescription>
                  {roleUsers.length} user(s) assigned to this role
                </DialogDescription>
              </div>
              {roleUsers.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportToExcel}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportToPDF}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : roleUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users assigned to this role.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>{user.phone || "—"}</TableCell>
                      <TableCell>{user.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {roleToDelete?.roleName}?
              {roleToDelete?.userCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This role is assigned to {roleToDelete.userCount} user(s).
                  Please reassign them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

