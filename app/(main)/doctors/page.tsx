"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Edit, Trash2, MoreVertical } from "lucide-react"
import { doctorsApi } from "@/lib/api"
import { DoctorForm } from "@/components/doctor-form"
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
} from "@/components/ui/dropdown-menu"

interface Doctor {
  userId: number
  username: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  department?: string
  isActive: boolean
  role?: string
  createdAt?: string
  updatedAt?: string
}

export default function DoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadDoctors = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await doctorsApi.getAll(searchQuery || undefined)
      setDoctors(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load doctors')
      console.error('Error loading doctors:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDoctors()
  }, [searchQuery])

  const handleAddSuccess = () => {
    loadDoctors()
  }

  const handleEditClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    loadDoctors()
    setIsEditDialogOpen(false)
    setSelectedDoctor(null)
  }

  const handleDeleteClick = (doctor: Doctor) => {
    setDoctorToDelete(doctor)
    setDeleteError(null)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!doctorToDelete) return

    try {
      setIsDeleting(true)
      setDeleteError(null)
      await doctorsApi.delete(doctorToDelete.userId.toString())
      setIsDeleteDialogOpen(false)
      setDoctorToDelete(null)
      loadDoctors()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete doctor')
      console.error('Error deleting doctor:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Helper function to get full name
  const getFullName = (firstName: string, lastName: string) => {
    return `Dr. ${firstName} ${lastName}`
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Doctors</h1>
          <p className="text-sm text-muted-foreground">View and manage doctor profiles</p>
        </div>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-4">Loading doctors...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Doctors</h1>
          <p className="text-sm text-muted-foreground">View and manage doctor profiles</p>
        </div>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Doctors</h1>
            <p className="text-sm text-muted-foreground">View and manage doctor profiles</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.length > 0 ? (
            doctors.map((doctor) => (
              <Card key={doctor.userId}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-md">{getFullName(doctor.firstName, doctor.lastName)}</CardTitle>
                      <CardDescription>{doctor.department || "No Department"}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/doctors/${doctor.userId}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(doctor)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(doctor)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm space-y-1">
                      {doctor.email && <p className="text-muted-foreground">{doctor.email}</p>}
                      {doctor.phone && <p className="text-muted-foreground">{doctor.phone}</p>}
                      <p className="text-muted-foreground">
                        Status: <span className={doctor.isActive ? "text-green-600" : "text-gray-500"}>
                          {doctor.isActive ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/doctors/${doctor.userId}`}>View Profile</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No doctors found{searchQuery ? ` matching "${searchQuery}"` : ""}
            </div>
          )}
        </div>
      </div>

      {/* Add Doctor Dialog */}
      <DoctorForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Doctor Dialog */}
      {selectedDoctor && (
        <DoctorForm
          doctor={selectedDoctor}
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) setSelectedDoctor(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open)
        if (!open) {
          setDoctorToDelete(null)
          setDeleteError(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {doctorToDelete && getFullName(doctorToDelete.firstName, doctorToDelete.lastName)}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
