"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { clinicalServicesApi } from "@/lib/api"
import { ClinicalServiceForm } from "@/components/clinical-services-form"
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

interface ClinicalService {
  serviceId: number
  serviceCode: string
  serviceName: string
  description?: string
  category?: string
  cost?: number
  department?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export function ClinicalServices() {
  const [services, setServices] = useState<ClinicalService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<ClinicalService | null>(null)
  const [deletingService, setDeletingService] = useState<ClinicalService | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await clinicalServicesApi.getAll()
      setServices(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load clinical services')
      console.error('Error loading clinical services:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingService(null)
    setIsFormOpen(true)
  }

  const handleEdit = (service: ClinicalService) => {
    setEditingService(service)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingService) return

    setDeleteLoading(true)
    try {
      await clinicalServicesApi.delete(deletingService.serviceId.toString())
      setDeletingService(null)
      loadServices()
    } catch (err: any) {
      setError(err.message || 'Failed to delete clinical service')
      console.error('Error deleting clinical service:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A'
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-4 text-muted-foreground">Loading clinical services...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Clinical Services</h3>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Service
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md mb-4">
              {error}
            </div>
          )}

          {services.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.serviceId}>
                      <TableCell className="font-medium">{service.serviceCode}</TableCell>
                      <TableCell>{service.serviceName}</TableCell>
                      <TableCell>{service.category || 'N/A'}</TableCell>
                      <TableCell>{service.department || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(service.cost)}</TableCell>
                      <TableCell>
                        <Badge variant={service.status === 'Active' ? 'default' : 'outline'}>
                          {service.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingService(service)}
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
              No clinical services found. Click "Add Service" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      <ClinicalServiceForm
        service={editingService}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={loadServices}
      />

      <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clinical Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the clinical service "{deletingService?.serviceName}"? 
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







