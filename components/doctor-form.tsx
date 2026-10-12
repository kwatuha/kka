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

interface Doctor {
  userId?: number
  username?: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  department?: string
  isActive?: boolean
  password?: string
}

interface DoctorFormProps {
  doctor?: Doctor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DoctorForm({ doctor, open, onOpenChange, onSuccess }: DoctorFormProps) {
  const [formData, setFormData] = useState<Doctor>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    isActive: true,
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (doctor) {
      setFormData({
        username: doctor.username,
        email: doctor.email || '',
        firstName: doctor.firstName || '',
        lastName: doctor.lastName || '',
        phone: doctor.phone || '',
        department: doctor.department || '',
        isActive: doctor.isActive !== undefined ? doctor.isActive : true,
        password: '', // Don't pre-fill password
      })
    } else {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        isActive: true,
        password: '',
      })
    }
    setError(null)
  }, [doctor, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { doctorsApi } = await import('@/lib/api')
      
      // Prepare data for API (exclude password if editing and not changed)
      const apiData: any = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        department: formData.department,
        isActive: formData.isActive,
      }

      // Only include password if creating new doctor or if password is provided for update
      if (!doctor && formData.password) {
        apiData.password = formData.password
      } else if (doctor && formData.password) {
        apiData.password = formData.password
      }

      if (doctor?.userId) {
        await doctorsApi.update(doctor.userId.toString(), apiData)
      } else {
        await doctorsApi.create(apiData)
      }
      
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save doctor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doctor ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
          <DialogDescription>
            {doctor ? 'Update doctor information' : 'Enter doctor details'}
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
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="doctor@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254700000000"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Cardiology"
              />
            </div>
          </div>

          {!doctor && (
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!doctor}
                placeholder="Enter password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default password will be set if not provided
              </p>
            </div>
          )}

          {doctor && (
            <div>
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>
          )}

          <div>
            <Label htmlFor="isActive">Status</Label>
            <Select
              value={formData.isActive ? 'true' : 'false'}
              onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : doctor ? 'Update Doctor' : 'Add Doctor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

