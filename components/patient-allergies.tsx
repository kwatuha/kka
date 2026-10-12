"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { patientApi } from "@/lib/api"
import { AllergyForm } from "@/components/allergy-form"
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

interface Allergy {
  allergyId: number
  allergen: string
  allergyType: string
  severity: string
  reaction?: string
  firstObserved?: string
  lastObserved?: string
  status: string
  notes?: string
  dateIdentified?: string
}

export function PatientAllergies({ patientId }: { patientId: string }) {
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null)
  const [deletingAllergy, setDeletingAllergy] = useState<Allergy | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAllergies()
  }, [patientId])

  const loadAllergies = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await patientApi.getAllergies(patientId)
      setAllergies(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load allergies')
      console.error('Error loading allergies:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAllergy(null)
    setIsFormOpen(true)
  }

  const handleEdit = (allergy: Allergy) => {
    setEditingAllergy(allergy)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingAllergy) return

    setDeleteLoading(true)
    try {
      await patientApi.deleteAllergy(patientId, deletingAllergy.allergyId.toString())
      setDeletingAllergy(null)
      loadAllergies()
    } catch (err: any) {
      setError(err.message || 'Failed to delete allergy')
      console.error('Error deleting allergy:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'severe':
      case 'life_threatening':
        return 'destructive'
      case 'moderate':
        return 'default'
      case 'mild':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatSeverity = (severity: string) => {
    return severity.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-4 text-muted-foreground">Loading allergies...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Allergies & Adverse Reactions</h3>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Allergy
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md mb-4">
              {error}
            </div>
          )}

          {allergies.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Allergen</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Reaction</TableHead>
                    <TableHead>Date Identified</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allergies.map((allergy) => (
                    <TableRow key={allergy.allergyId}>
                      <TableCell className="font-medium">{allergy.allergen}</TableCell>
                      <TableCell>{formatType(allergy.allergyType)}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(allergy.severity)}>
                          {formatSeverity(allergy.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell>{allergy.reaction || 'N/A'}</TableCell>
                      <TableCell>
                        {allergy.firstObserved 
                          ? new Date(allergy.firstObserved).toLocaleDateString()
                          : allergy.dateIdentified 
                          ? new Date(allergy.dateIdentified).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={allergy.status === 'active' ? 'default' : 'outline'}>
                          {allergy.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(allergy)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingAllergy(allergy)}
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
              No allergies recorded for this patient
            </div>
          )}
        </CardContent>
      </Card>

      <AllergyForm
        allergy={editingAllergy}
        patientId={patientId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={loadAllergies}
      />

      <AlertDialog open={!!deletingAllergy} onOpenChange={(open) => !open && setDeletingAllergy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allergy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the allergy record for {deletingAllergy?.allergen}? 
              This will mark it as resolved (soft delete).
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
