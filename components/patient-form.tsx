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
import { insuranceApi, patientApi, standardsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  DEFAULT_FACILITY_COUNTY,
  NEXT_OF_KIN_RELATIONSHIPS,
  PATIENT_ID_TYPES,
} from "@/lib/patient-demographics"
import { KenyaLocationSelect } from "@/components/kenya-location-select"

interface Patient {
  patientId?: number
  patientNumber?: string
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth?: string
  gender?: string
  patientType?: string
  insuranceCompanyId?: number | string
  insuranceNumber?: string
  phone?: string
  email?: string
  address?: string
  county?: string
  subcounty?: string
  ward?: string
  idNumber?: string
  idType?: string
  bloodGroup?: string
  nextOfKinName?: string
  nextOfKinPhone?: string
  nextOfKinRelationship?: string
}

interface PatientFormProps {
  patient?: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PatientForm({ patient, open, onOpenChange, onSuccess }: PatientFormProps) {
  const [formData, setFormData] = useState<Patient>({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    patientType: 'paying',
    insuranceCompanyId: '',
    insuranceNumber: '',
    phone: '',
    email: '',
    address: '',
    county: '',
    subcounty: '',
    ward: '',
    idNumber: '',
    idType: '',
    bloodGroup: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  // Load insurance companies when form opens
  useEffect(() => {
    if (open) {
      loadInsuranceCompanies()
    }
  }, [open])

  const loadInsuranceCompanies = async () => {
    try {
      setLoadingCompanies(true)
      const companies = await insuranceApi.getProviders('active')

      // Deduplicate by providerName, keeping the first occurrence (preferring ones with providerCode)
      const uniqueCompanies = (companies || []).reduce((acc: any[], company: any) => {
        const existing = acc.find(c =>
          c.providerName?.toLowerCase().trim() === company.providerName?.toLowerCase().trim()
        )
        if (!existing) {
          acc.push(company)
        } else {
          // If current has providerCode and existing doesn't, replace it
          if (company.providerCode && !existing.providerCode) {
            const index = acc.indexOf(existing)
            acc[index] = company
          }
        }
        return acc
      }, [])

      setInsuranceCompanies(uniqueCompanies)
    } catch (error) {
      console.error('Error loading insurance companies:', error)
    } finally {
      setLoadingCompanies(false)
    }
  }

  useEffect(() => {
    if (patient) {
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        middleName: patient.middleName || '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
        gender: patient.gender || '',
        patientType: patient.patientType || 'paying',
        insuranceCompanyId: patient.insuranceCompanyId || '',
        insuranceNumber: patient.insuranceNumber || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        county: patient.county || '',
        subcounty: patient.subcounty || '',
        ward: patient.ward || '',
        idNumber: patient.idNumber || '',
        idType: patient.idType || '',
        bloodGroup: patient.bloodGroup || '',
        nextOfKinName: (patient as any).nextOfKinName || '',
        nextOfKinPhone: (patient as any).nextOfKinPhone || '',
        nextOfKinRelationship: (patient as any).nextOfKinRelationship || '',
      })
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: '',
        patientType: 'paying',
        insuranceCompanyId: '',
        insuranceNumber: '',
        phone: '',
        email: '',
        address: '',
        county: DEFAULT_FACILITY_COUNTY,
        subcounty: '',
        ward: '',
        idNumber: '',
        idType: 'National ID',
        bloodGroup: '',
        nextOfKinName: '',
        nextOfKinPhone: '',
        nextOfKinRelationship: 'Spouse',
      })
    }
    setError(null)
  }, [patient, open])

  // Clear insurance fields when patient type changes to "paying"
  useEffect(() => {
    if (formData.patientType !== 'insurance') {
      setFormData(prev => ({
        ...prev,
        insuranceCompanyId: '',
        insuranceNumber: '',
      }))
    }
  }, [formData.patientType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const missing: string[] = []
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) missing.push("name")
    if (!formData.dateOfBirth) missing.push("date of birth")
    if (!formData.gender) missing.push("gender")
    if (!formData.phone?.trim() || formData.phone.trim().length < 10) missing.push("phone")
    if (!formData.county?.trim()) missing.push("county")
    if (!formData.subcounty?.trim()) missing.push("sub-county")
    if (!formData.ward?.trim()) missing.push("ward")
    const idNum = formData.idNumber?.trim()
    if (idNum && !formData.idType?.trim()) missing.push("ID type")
    if (!idNum) missing.push("national ID")
    if (!formData.nextOfKinName?.trim()) missing.push("next of kin name")
    if (!formData.nextOfKinPhone?.trim() || formData.nextOfKinPhone.trim().length < 10) {
      missing.push("next of kin phone")
    }
    if (missing.length) {
      setError(`Please complete required demographics: ${missing.join(", ")}.`)
      setLoading(false)
      return
    }

    try {
      // Format data for API
      const patientData = {
        ...formData,
        insuranceCompanyId: formData.insuranceCompanyId ? parseInt(formData.insuranceCompanyId.toString()) : null,
        idType: formData.idType || (idNum ? "National ID" : null),
      }

      if (patient?.patientId) {
        await patientApi.update(patient.patientId.toString(), patientData)
        try {
          const kenhdd = await standardsApi.validateKenhddPatient(patient.patientId)
          toast({
            title: "Patient updated",
            description: `KENHDD readiness: ${kenhdd.overallScore}%`,
          })
        } catch {
          toast({ title: "Patient updated" })
        }
      } else {
        const created = await patientApi.create(patientData)
        const newId = created?.patientId ?? created?.id
        if (newId) {
          try {
            const kenhdd = await standardsApi.validateKenhddPatient(newId)
            toast({
              title: "Patient created",
              description: `KENHDD readiness: ${kenhdd.overallScore}%`,
            })
          } catch {
            toast({ title: "Patient created" })
          }
        }
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save patient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
          <DialogDescription>
            {patient ? 'Update patient information' : 'Enter patient details to create a new record'}
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
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="patientType">Patient Type</Label>
              <Select
                value={formData.patientType}
                onValueChange={(value) => setFormData({ ...formData, patientType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paying">Paying</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="non_paying">Non-paying</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.patientType === 'insurance' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insuranceCompanyId">Insurance Company</Label>
                <Select
                  value={formData.insuranceCompanyId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, insuranceCompanyId: value })}
                  disabled={loadingCompanies}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select insurance company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {insuranceCompanies.map((company) => (
                      <SelectItem key={company.providerId} value={company.providerId.toString()}>
                        {company.providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="insuranceNumber">Insurance Number</Label>
                <Input
                  id="insuranceNumber"
                  value={formData.insuranceNumber}
                  onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                  placeholder="INS-12345678"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                value={formData.bloodGroup}
                onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

            <div>
              <Label htmlFor="address">Residential address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <KenyaLocationSelect
            value={{
              county: formData.county || DEFAULT_FACILITY_COUNTY,
              subcounty: formData.subcounty || "",
              ward: formData.ward || "",
            }}
            onChange={(loc) =>
              setFormData({
                ...formData,
                county: loc.county,
                subcounty: loc.subcounty,
                ward: loc.ward,
              })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="idType">ID Type</Label>
              <Select
                value={formData.idType}
                onValueChange={(value) => setFormData({ ...formData, idType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_ID_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="nextOfKinName">Next of kin name *</Label>
              <Input
                id="nextOfKinName"
                value={formData.nextOfKinName || ""}
                onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nextOfKinRelationship">Relationship *</Label>
              <Select
                value={formData.nextOfKinRelationship || "Spouse"}
                onValueChange={(value) => setFormData({ ...formData, nextOfKinRelationship: value })}
              >
                <SelectTrigger id="nextOfKinRelationship">
                  <SelectValue placeholder="Relationship" />
                </SelectTrigger>
                <SelectContent>
                  {NEXT_OF_KIN_RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nextOfKinPhone">Next of kin phone *</Label>
              <Input
                id="nextOfKinPhone"
                value={formData.nextOfKinPhone || ""}
                onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : patient ? 'Update Patient' : 'Create Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}








