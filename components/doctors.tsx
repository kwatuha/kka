"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
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

export function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadDoctors()
  }, [])

  const loadDoctors = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await doctorsApi.getAll()
      setDoctors(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load doctors')
      console.error('Error loading doctors:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingDoctor(null)
    setIsFormOpen(true)
  }

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingDoctor) return

    setDeleteLoading(true)
    try {
      await doctorsApi.delete(deletingDoctor.userId.toString())
      setDeletingDoctor(null)
      loadDoctors()
    } catch (err: any) {
      setError(err.message || 'Failed to delete doctor')
      console.error('Error deleting doctor:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-4 text-muted-foreground">Loading doctors...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Doctors</h3>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Doctor
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md mb-4">
              {error}
            </div>
          )}

          {doctors.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor) => (
                    <TableRow key={doctor.userId}>
                      <TableCell className="font-medium">
                        {doctor.firstName} {doctor.lastName}
                      </TableCell>
                      <TableCell>{doctor.email}</TableCell>
                      <TableCell>{doctor.phone || 'N/A'}</TableCell>
                      <TableCell>{doctor.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={doctor.isActive ? 'default' : 'outline'}>
                          {doctor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(doctor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingDoctor(doctor)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No doctors found. Click "Add Doctor" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      <DoctorForm
        doctor={editingDoctor}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={loadDoctors}
      />

      <AlertDialog open={!!deletingDoctor} onOpenChange={(open) => !open && setDeletingDoctor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Dr. {deletingDoctor?.firstName} {deletingDoctor?.lastName}? 
              This will soft delete the record (set voided to 1).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

