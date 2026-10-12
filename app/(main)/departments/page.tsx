"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Activity, Building2, FileText, FlaskConical, ImageIcon, Pill, Stethoscope, UserPlus, Edit, Trash2, Eye, Plus, Search, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { departmentApi } from "@/lib/api"
import { DepartmentForm } from "@/components/department-form"
import { toast } from "@/components/ui/use-toast"
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

// Icon mapping for departments
const departmentIcons: Record<string, any> = {
  'Registration': UserPlus,
  'Consultation': Stethoscope,
  'Laboratory': FlaskConical,
  'Pharmacy': Pill,
  'Radiology': ImageIcon,
  'Nursing': Activity,
  'Medical Records': FileText,
  'Administration': Building2,
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewDepartment, setViewDepartment] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<any>(null)

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await departmentApi.getAll(searchTerm || undefined)

      // Remove duplicates by departmentName, keeping the most recent active one
      const departmentMap = new Map<string, any>()

      data.forEach((dept: any) => {
        const key = dept.departmentName?.toLowerCase().trim() || ''
        if (!key) return

        const existing = departmentMap.get(key)

        // Prefer active departments over inactive ones
        if (!existing) {
          departmentMap.set(key, dept)
        } else {
          // If both are active or both inactive, prefer the one with higher ID (more recent)
          if (dept.isActive && !existing.isActive) {
            departmentMap.set(key, dept)
          } else if (dept.isActive === existing.isActive && dept.departmentId > existing.departmentId) {
            departmentMap.set(key, dept)
          }
        }
      })

      const uniqueDepartments = Array.from(departmentMap.values())
        .filter(dept => dept.isActive) // Only show active departments
        .sort((a, b) => (a.departmentName || '').localeCompare(b.departmentName || ''))

      setDepartments(uniqueDepartments)
    } catch (err: any) {
      setError(err.message || 'Failed to load departments')
      console.error('Error loading departments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadDepartments()
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleAdd = () => {
    setSelectedDepartment(null)
    setFormOpen(true)
  }

  const handleEdit = (department: any) => {
    setSelectedDepartment(department)
    setFormOpen(true)
  }

  const handleView = async (department: any) => {
    try {
      const fullDepartment = await departmentApi.getById(department.departmentId.toString())
      setViewDepartment(fullDepartment)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load department details.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!departmentToDelete) return

    try {
      await departmentApi.delete(departmentToDelete.departmentId.toString())
      toast({
        title: "Success",
        description: "Department deactivated successfully.",
      })
      setDeleteDialogOpen(false)
      setDepartmentToDelete(null)
      loadDepartments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate department.",
        variant: "destructive",
      })
    }
  }

  // Map departments to include icon and href
  const departmentsWithIcons = useMemo(() => {
    return departments.map(dept => {
      const iconName = dept.departmentName.split(' ')[0]
      const Icon = departmentIcons[dept.departmentName] || departmentIcons[iconName] || Building2

      const href = `/departments/${dept.departmentName.toLowerCase().replace(/\s+/g, '-')}`

      return {
        ...dept,
        icon: Icon,
        href,
        status: 'implemented'
      }
    })
  }, [departments])

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BreadcrumbsEnhanced segments={[{ title: "Departments", href: "/departments" }]} className="mb-4" />
        <div className="text-center py-8">Loading departments...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BreadcrumbsEnhanced segments={[{ title: "Departments", href: "/departments" }]} className="mb-4" />
        <div className="text-center py-8 text-red-500">Error: {error}</div>
        <Button onClick={loadDepartments}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced segments={[{ title: "Departments", href: "/departments" }]} className="mb-4" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage hospital departments and services</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search departments..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departmentsWithIcons.map((department) => {
            const Icon = department.icon
            return (
              <Card key={department.departmentId} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{department.departmentName}</CardTitle>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription className="line-clamp-2">
                    {department.description || 'Department services'}
                  </CardDescription>
                  {department.departmentCode && (
                    <CardDescription className="text-xs mt-1">
                      Code: {department.departmentCode}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {department.status === "implemented" ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Available</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 hover:bg-yellow-100">
                        Coming Soon
                      </Badge>
                    )}
                    {department.location && (
                      <p className="text-xs text-muted-foreground">{department.location}</p>
                    )}
                    {department.headOfDepartmentName && (
                      <p className="text-xs text-muted-foreground">
                        Head: {department.headOfDepartmentName}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant={department.status === "implemented" ? "default" : "outline"}
                    className="w-full"
                    disabled={department.status !== "implemented"}
                  >
                    <Link href={department.href}>
                      {department.status === "implemented" ? "Open Department" : "Not Available Yet"}
                    </Link>
                  </Button>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleView(department)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(department)}
                      title="Edit Department"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDepartmentToDelete(department)
                        setDeleteDialogOpen(true)
                      }}
                      title="Delete Department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {departments.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "No departments found matching your search." : "No departments found."}
        </div>
      )}

      {/* Department Form */}
      <DepartmentForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setSelectedDepartment(null)
          }
        }}
        onSuccess={() => {
          loadDepartments()
          setSelectedDepartment(null)
        }}
        department={selectedDepartment}
      />

      {/* View Dialog */}
      {viewDepartment && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Department Details</DialogTitle>
              <DialogDescription>View complete department information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department Name</p>
                  <p className="text-sm font-semibold">{viewDepartment.departmentName}</p>
                </div>
                {viewDepartment.departmentCode && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Department Code</p>
                    <p className="text-sm font-semibold">{viewDepartment.departmentCode}</p>
                  </div>
                )}
                {viewDepartment.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-sm">{viewDepartment.location}</p>
                  </div>
                )}
                {viewDepartment.headOfDepartmentName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Head of Department</p>
                    <p className="text-sm">{viewDepartment.headOfDepartmentName}</p>
                  </div>
                )}
              </div>
              {viewDepartment.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{viewDepartment.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={viewDepartment.isActive ? "default" : "secondary"}>
                  {viewDepartment.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {departmentToDelete?.departmentName}?
              This will mark the department as inactive. You can reactivate it later by editing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
