"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, Edit, Trash2, Loader2 } from "lucide-react"
import { patientApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

type FamilyHistory = {
  id: string
  familyHistoryId?: number
  relation: string
  condition: string
  ageAtDiagnosis: string
  status: string
  notes: string
}

export function PatientFamilyHistory({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [familyHistory, setFamilyHistory] = useState<FamilyHistory[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FamilyHistory | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    relation: "",
    condition: "",
    ageAtDiagnosis: "",
    status: "Unknown",
    notes: "",
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadFamilyHistory()
  }, [patientId])

  const loadFamilyHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const historyData = await patientApi.getFamilyHistory(patientId)

      const history: FamilyHistory[] = historyData.map((entry: any) => ({
        id: `fh-${entry.familyHistoryId}`,
        familyHistoryId: entry.familyHistoryId,
        relation: entry.relation || 'Unknown',
        condition: entry.condition || 'Not specified',
        ageAtDiagnosis: entry.ageAtDiagnosis ? entry.ageAtDiagnosis.toString() : 'N/A',
        status: entry.status || 'Unknown',
        notes: entry.notes || ''
      }))

      setFamilyHistory(history)
    } catch (err: any) {
      console.error("Error loading family history:", err)
      setError(err.message || "Failed to load family history")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (entry?: FamilyHistory) => {
    if (entry) {
      setEditingEntry(entry)
      setFormData({
        relation: entry.relation,
        condition: entry.condition,
        ageAtDiagnosis: entry.ageAtDiagnosis === 'N/A' ? '' : entry.ageAtDiagnosis,
        status: entry.status,
        notes: entry.notes,
      })
    } else {
      setEditingEntry(null)
      setFormData({
        relation: "",
        condition: "",
        ageAtDiagnosis: "",
        status: "Unknown",
        notes: "",
      })
    }
    setFormError(null)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingEntry(null)
    setFormError(null)
    setFormData({
      relation: "",
      condition: "",
      ageAtDiagnosis: "",
      status: "Unknown",
      notes: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.relation.trim() || !formData.condition.trim()) {
      setFormError("Relation and condition are required")
      return
    }

    setSaving(true)
    try {
      const submitData = {
        relation: formData.relation.trim(),
        condition: formData.condition.trim(),
        ageAtDiagnosis: formData.ageAtDiagnosis ? parseInt(formData.ageAtDiagnosis) : null,
        status: formData.status,
        notes: formData.notes.trim() || null,
      }

      if (editingEntry && editingEntry.familyHistoryId) {
        await patientApi.updateFamilyHistory(patientId, editingEntry.familyHistoryId.toString(), submitData)
        toast({
          title: "Success",
          description: "Family history entry updated successfully.",
        })
      } else {
        await patientApi.createFamilyHistory(patientId, submitData)
        toast({
          title: "Success",
          description: "Family history entry added successfully.",
        })
      }

      handleCloseForm()
      loadFamilyHistory()
    } catch (err: any) {
      console.error("Error saving family history:", err)
      setFormError(err.message || "Failed to save family history entry")
      toast({
        title: "Error",
        description: err.message || "Failed to save family history entry",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry: FamilyHistory) => {
    if (!entry.familyHistoryId) return

    if (!confirm(`Are you sure you want to delete this family history entry?`)) {
      return
    }

    try {
      await patientApi.deleteFamilyHistory(patientId, entry.familyHistoryId.toString())
      toast({
        title: "Success",
        description: "Family history entry deleted successfully.",
      })
      loadFamilyHistory()
    } catch (err: any) {
      console.error("Error deleting family history:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete family history entry",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Family Medical History</h3>
          <Button size="sm" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>

        {familyHistory.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relation</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Age at Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.relation}</TableCell>
                    <TableCell>{entry.condition}</TableCell>
                    <TableCell>{entry.ageAtDiagnosis}</TableCell>
                    <TableCell>{entry.status}</TableCell>
                    <TableCell>{entry.notes}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">No family history recorded for this patient</div>
        )}
      </CardContent>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Family History Entry' : 'Add Family History Entry'}</DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Update family history information' : 'Enter family history details for this patient'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="relation">Relation *</Label>
                <Input
                  id="relation"
                  value={formData.relation}
                  onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                  required
                  placeholder="e.g., Father, Mother, Paternal Grandfather"
                />
              </div>
              <div>
                <Label htmlFor="condition">Condition *</Label>
                <Input
                  id="condition"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  required
                  placeholder="e.g., Diabetes, Hypertension"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ageAtDiagnosis">Age at Diagnosis</Label>
                <Input
                  id="ageAtDiagnosis"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.ageAtDiagnosis}
                  onChange={(e) => setFormData({ ...formData, ageAtDiagnosis: e.target.value })}
                  placeholder="e.g., 45"
                />
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Living">Living</SelectItem>
                    <SelectItem value="Deceased">Deceased</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this condition..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingEntry ? 'Update Entry' : 'Add Entry'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
