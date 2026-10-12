"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Medication {
  medicationId?: number
  medicationCode?: string
  medicationName?: string
  name?: string
  genericName?: string
  dosageForm?: string
  strength?: string
  unit?: string
  category?: string
  manufacturer?: string
  description?: string
}

interface MedicationFormProps {
  medication?: Medication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MedicationForm({ medication, open, onOpenChange, onSuccess }: MedicationFormProps) {
  const [formData, setFormData] = useState<Medication>({
    medicationCode: '',
    medicationName: '',
    genericName: '',
    dosageForm: '',
    strength: '',
    unit: '',
    category: '',
    manufacturer: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (medication) {
      setFormData({
        medicationCode: medication.medicationCode || '',
        medicationName: medication.medicationName || medication.name || '',
        genericName: medication.genericName || '',
        dosageForm: medication.dosageForm || '',
        strength: medication.strength || '',
        unit: medication.unit || '',
        category: medication.category || '',
        manufacturer: medication.manufacturer || '',
        description: medication.description || '',
      })
    } else {
      setFormData({
        medicationCode: '',
        medicationName: '',
        genericName: '',
        dosageForm: '',
        strength: '',
        unit: '',
        category: '',
        manufacturer: '',
        description: '',
      })
    }
    setError(null)
  }, [medication, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { pharmacyApi } = await import('@/lib/api')
      
      const apiData: any = {
        medicationCode: formData.medicationCode || null,
        name: formData.medicationName || null,
        genericName: formData.genericName || null,
        dosageForm: formData.dosageForm || null,
        strength: formData.strength || null,
        category: formData.category || null,
        manufacturer: formData.manufacturer || null,
        description: formData.description || null,
      }

      if (medication?.medicationId) {
        await pharmacyApi.updateMedication(medication.medicationId.toString(), apiData)
      } else {
        await pharmacyApi.createMedication(apiData)
      }
      
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save medication')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medication ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
          <DialogDescription>
            {medication ? 'Update medication information' : 'Enter medication details'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medicationCode">Medication Code</Label>
              <Input
                id="medicationCode"
                value={formData.medicationCode}
                onChange={(e) => setFormData({ ...formData, medicationCode: e.target.value })}
                placeholder="MED-001"
              />
            </div>
            <div>
              <Label htmlFor="medicationName">Medication Name *</Label>
              <Input
                id="medicationName"
                value={formData.medicationName}
                onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                required
                placeholder="Amoxicillin 500mg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genericName">Generic Name</Label>
              <Input
                id="genericName"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                placeholder="Amoxicillin"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Antibiotic"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dosageForm">Dosage Form</Label>
              <Input
                id="dosageForm"
                value={formData.dosageForm}
                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                placeholder="Tablet"
              />
            </div>
            <div>
              <Label htmlFor="strength">Strength</Label>
              <Input
                id="strength"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                placeholder="500mg"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Tablets"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="Manufacturer name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Medication description"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : medication ? 'Update Medication' : 'Add Medication'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

