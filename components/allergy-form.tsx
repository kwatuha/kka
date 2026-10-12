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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Allergy {
  allergyId?: number
  allergen: string
  allergyType: string
  severity: string
  reaction?: string
  firstObserved?: string
  lastObserved?: string
  status?: string
  notes?: string
}

interface AllergyFormProps {
  allergy?: Allergy | null
  patientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AllergyForm({ allergy, patientId, open, onOpenChange, onSuccess }: AllergyFormProps) {
  const [formData, setFormData] = useState<Allergy>({
    allergen: '',
    allergyType: 'drug',
    severity: 'moderate',
    reaction: '',
    firstObserved: '',
    lastObserved: '',
    status: 'active',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (allergy) {
      setFormData({
        allergen: allergy.allergen || '',
        allergyType: allergy.allergyType || 'drug',
        severity: allergy.severity || 'moderate',
        reaction: allergy.reaction || '',
        firstObserved: allergy.firstObserved ? allergy.firstObserved.split('T')[0] : '',
        lastObserved: allergy.lastObserved ? allergy.lastObserved.split('T')[0] : '',
        status: allergy.status || 'active',
        notes: allergy.notes || '',
      })
    } else {
      setFormData({
        allergen: '',
        allergyType: 'drug',
        severity: 'moderate',
        reaction: '',
        firstObserved: '',
        lastObserved: '',
        status: 'active',
        notes: '',
      })
    }
    setError(null)
  }, [allergy, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { patientApi } = await import('@/lib/api')
      
      if (allergy?.allergyId) {
        await patientApi.updateAllergy(patientId, allergy.allergyId.toString(), formData)
      } else {
        await patientApi.createAllergy(patientId, formData)
      }
      
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save allergy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{allergy ? 'Edit Allergy' : 'Add New Allergy'}</DialogTitle>
          <DialogDescription>
            {allergy ? 'Update allergy information' : 'Enter allergy details for this patient'}
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
              <Label htmlFor="allergen">Allergen *</Label>
              <Input
                id="allergen"
                value={formData.allergen}
                onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
                required
                placeholder="e.g., Penicillin, Peanuts"
              />
            </div>
            <div>
              <Label htmlFor="allergyType">Type *</Label>
              <Select
                value={formData.allergyType}
                onValueChange={(value) => setFormData({ ...formData, allergyType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drug">Drug</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                  <SelectItem value="life_threatening">Life Threatening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="reaction">Reaction</Label>
            <Input
              id="reaction"
              value={formData.reaction}
              onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
              placeholder="e.g., Hives, Anaphylaxis"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstObserved">First Observed</Label>
              <Input
                id="firstObserved"
                type="date"
                value={formData.firstObserved}
                onChange={(e) => setFormData({ ...formData, firstObserved: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="lastObserved">Last Observed</Label>
              <Input
                id="lastObserved"
                type="date"
                value={formData.lastObserved}
                onChange={(e) => setFormData({ ...formData, lastObserved: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this allergy"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : allergy ? 'Update Allergy' : 'Add Allergy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}








