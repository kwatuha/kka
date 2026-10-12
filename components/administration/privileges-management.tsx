"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Key, Loader2 } from "lucide-react"
import { privilegeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { PrivilegeForm } from "@/components/administration/privilege-form"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/date-utils"

export function PrivilegesManagement() {
  const [privileges, setPrivileges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrivilege, setSelectedPrivilege] = useState<any>(null)
  const [privilegeToDelete, setPrivilegeToDelete] = useState<any>(null)

  useEffect(() => {
    loadPrivileges()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPrivileges()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, moduleFilter])

  const loadPrivileges = async () => {
    try {
      setLoading(true)
      const data = await privilegeApi.getAll(moduleFilter !== "all" ? moduleFilter : undefined)
      setPrivileges(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading privileges:", error)
      toast({
        title: "Error",
        description: "Failed to load privileges.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedPrivilege(null)
    setFormOpen(true)
  }

  const handleEdit = (privilege: any) => {
    setSelectedPrivilege(privilege)
    setFormOpen(true)
  }

  const handleDelete = (privilege: any) => {
    setPrivilegeToDelete(privilege)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!privilegeToDelete) return

    try {
      await privilegeApi.delete(privilegeToDelete.privilegeId.toString())
      toast({
        title: "Success",
        description: "Privilege deleted successfully.",
      })
      setDeleteDialogOpen(false)
      setPrivilegeToDelete(null)
      loadPrivileges()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete privilege.",
        variant: "destructive",
      })
    }
  }

  const filteredPrivileges = privileges.filter((priv) => {
    const search = searchTerm.toLowerCase()
    return (
      priv.privilegeName?.toLowerCase().includes(search) ||
      priv.description?.toLowerCase().includes(search) ||
      priv.module?.toLowerCase().includes(search)
    )
  })

  // Get unique modules for filter
  const modules = Array.from(new Set(privileges.map((p) => p.module).filter(Boolean)))

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
          <h2 className="text-xl font-semibold">Privilege Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage system privileges and permissions
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Privilege
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Privileges</CardTitle>
              <CardDescription>
                All system privileges ({filteredPrivileges.length})
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search privileges..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPrivileges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No privileges found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Privilege Name</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrivileges.map((priv) => (
                  <TableRow key={priv.privilegeId}>
                    <TableCell className="font-medium">{priv.privilegeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{priv.module || "Other"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {priv.description || "—"}
                    </TableCell>
                    <TableCell>{formatDate(priv.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(priv)}
                          title="Edit Privilege"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(priv)}
                          title="Delete Privilege"
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

      {/* Privilege Form */}
      <PrivilegeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setSelectedPrivilege(null)
          }
        }}
        onSuccess={() => {
          loadPrivileges()
          setSelectedPrivilege(null)
        }}
        privilege={selectedPrivilege}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Privilege</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {privilegeToDelete?.privilegeName}?
              This action cannot be undone. Make sure this privilege is not assigned to any roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

