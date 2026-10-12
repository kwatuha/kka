"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, FileText, AlertCircle } from "lucide-react"
import { insuranceApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

type Insurance = {
  provider: string
  policyNumber: string
  groupNumber: string
  startDate: string
  endDate: string
  policyHolder: string
  relationship: string
  coverageType: string
  status: string
  contactNumber: string
  notes: string
}

export function PatientInsurance({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insurance, setInsurance] = useState<Insurance | null>(null)

  useEffect(() => {
    loadInsurance()
  }, [patientId])

  const loadInsurance = async () => {
    try {
      setLoading(true)
      setError(null)

      const policies = await insuranceApi.getPolicies(patientId, undefined, 'active')

      if (policies && policies.length > 0) {
        const policy = policies[0] // Get the first active policy
        
        // Get provider details
        let providerName = 'Unknown Provider'
        let providerPhone = ''
        if (policy.providerId) {
          try {
            const provider = await insuranceApi.getProviderById(policy.providerId.toString())
            providerName = provider.providerName || providerName
            providerPhone = provider.phone || ''
          } catch (err) {
            console.error('Error loading provider details:', err)
          }
        }

        setInsurance({
          provider: providerName,
          policyNumber: policy.policyNumber || 'N/A',
          groupNumber: policy.memberId || policy.groupNumber || 'N/A',
          startDate: policy.coverageStartDate ? new Date(policy.coverageStartDate).toISOString().split('T')[0] : 'N/A',
          endDate: policy.coverageEndDate ? new Date(policy.coverageEndDate).toISOString().split('T')[0] : 'N/A',
          policyHolder: policy.memberName || policy.policyHolderName || 'N/A',
          relationship: policy.relationship || 'self',
          coverageType: policy.coverageType || 'Comprehensive',
          status: policy.isActive ? 'Active' : 'Inactive',
          contactNumber: providerPhone,
          notes: policy.notes || 'No additional notes'
        })
      } else {
        setInsurance(null) // No insurance found
      }
    } catch (err: any) {
      console.error("Error loading insurance:", err)
      setError(err.message || "Failed to load insurance information")
    } finally {
      setLoading(false)
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

  if (!insurance) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-4 text-muted-foreground">
            No active insurance policy found for this patient
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Insurance Information</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              Verify Coverage
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Insurance Provider</div>
            <div className="font-medium">{insurance.provider}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div>
              <Badge variant={insurance.status === "Active" ? "default" : "outline"}>{insurance.status}</Badge>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Policy Number</div>
            <div className="font-medium">{insurance.policyNumber}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Group Number</div>
            <div className="font-medium">{insurance.groupNumber}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Policy Holder</div>
            <div className="font-medium">{insurance.policyHolder}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Relationship to Patient</div>
            <div className="font-medium capitalize">{insurance.relationship}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Coverage Type</div>
            <div className="font-medium">{insurance.coverageType}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Contact Number</div>
            <div className="font-medium">{insurance.contactNumber || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Start Date</div>
            <div className="font-medium">{insurance.startDate}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">End Date</div>
            <div className="font-medium">{insurance.endDate}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-muted-foreground">Notes</div>
            <div className="font-medium">{insurance.notes}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
