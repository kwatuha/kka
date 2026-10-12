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
import { Loader2 } from "lucide-react"

interface TestType {
  testTypeId?: number
  testCode?: string
  testName?: string
  category?: string
  specimenType?: string
  turnaroundTime?: string
  cost?: number
  description?: string
  normalRange?: string
  preparationInstructions?: string
  isActive?: boolean
}

interface TestTypeFormProps {
  testType?: TestType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TestTypeForm({ testType, open, onOpenChange, onSuccess }: TestTypeFormProps) {
  const [formData, setFormData] = useState<TestType>({
    testCode: '',
    testName: '',
    category: '',
    specimenType: '',
    turnaroundTime: '',
    cost: undefined,
    description: '',
    normalRange: '',
    preparationInstructions: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (testType) {
      setFormData({
        testCode: testType.testCode || '',
        testName: testType.testName || '',
        category: testType.category || '',
        specimenType: testType.specimenType || '',
        turnaroundTime: testType.turnaroundTime || '',
        cost: testType.cost,
        description: testType.description || '',
        normalRange: testType.normalRange || '',
        preparationInstructions: testType.preparationInstructions || '',
      })
    } else {
      setFormData({
        testCode: '',
        testName: '',
        category: '',
        specimenType: '',
        turnaroundTime: '',
        cost: undefined,
        description: '',
        normalRange: '',
        preparationInstructions: '',
      })
    }
    setError(null)
  }, [testType, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { laboratoryApi } = await import('@/lib/api')
      
      const apiData: any = {
        testCode: formData.testCode || null,
        testName: formData.testName || null,
        category: formData.category || null,
        specimenType: formData.specimenType || null,
        turnaroundTime: formData.turnaroundTime || null,
        cost: formData.cost || null,
        description: formData.description || null,
        normalRange: formData.normalRange || null,
        preparationInstructions: formData.preparationInstructions || null,
      }

      if (testType?.testTypeId) {
        await laboratoryApi.updateTestType(testType.testTypeId.toString(), apiData)
      } else {
        await laboratoryApi.createTestType(apiData)
      }
      
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save test type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{testType ? 'Edit Test Type' : 'Add New Test Type'}</DialogTitle>
          <DialogDescription>
            {testType ? 'Update test type information' : 'Enter test type details'}
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
              <Label htmlFor="testCode">Test Code</Label>
              <Input
                id="testCode"
                value={formData.testCode}
                onChange={(e) => setFormData({ ...formData, testCode: e.target.value })}
                placeholder="LAB-CBC"
              />
            </div>
            <div>
              <Label htmlFor="testName">Test Name *</Label>
              <Input
                id="testName"
                value={formData.testName}
                onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                required
                placeholder="Complete Blood Count"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Hematology"
              />
            </div>
            <div>
              <Label htmlFor="specimenType">Specimen Type</Label>
              <Input
                id="specimenType"
                value={formData.specimenType}
                onChange={(e) => setFormData({ ...formData, specimenType: e.target.value })}
                placeholder="Blood"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="turnaroundTime">Turnaround Time</Label>
              <Input
                id="turnaroundTime"
                value={formData.turnaroundTime}
                onChange={(e) => setFormData({ ...formData, turnaroundTime: e.target.value })}
                placeholder="2 hours"
              />
            </div>
            <div>
              <Label htmlFor="cost">Cost (KES)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="1500.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Test description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="normalRange">Normal Range</Label>
            <Textarea
              id="normalRange"
              value={formData.normalRange}
              onChange={(e) => setFormData({ ...formData, normalRange: e.target.value })}
              placeholder="Normal range values"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="preparationInstructions">Preparation Instructions</Label>
            <Textarea
              id="preparationInstructions"
              value={formData.preparationInstructions}
              onChange={(e) => setFormData({ ...formData, preparationInstructions: e.target.value })}
              placeholder="Patient preparation instructions"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testType ? 'Update' : 'Create'} Test Type
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}








