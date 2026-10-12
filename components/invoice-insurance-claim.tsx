"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { billingApi, insuranceApi } from "@/lib/api"
import { FileText, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { ClaimDetailsDialog } from "@/components/claim-details-dialog"
import { CreateInsuranceClaimDialog } from "@/components/create-insurance-claim-dialog"

interface InvoiceInsuranceClaimProps {
  invoiceId: string
  invoiceNumber: string
  patientId: string
  onUpdate?: () => void
}

export function InvoiceInsuranceClaim({ invoiceId, invoiceNumber, patientId, onUpdate }: InvoiceInsuranceClaimProps) {
  const [insuranceInfo, setInsuranceInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creatingClaim, setCreatingClaim] = useState(false)
  const [claimDetailsOpen, setClaimDetailsOpen] = useState(false)
  const [createClaimDialogOpen, setCreateClaimDialogOpen] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)

  useEffect(() => {
    loadInsuranceInfo()
  }, [invoiceId])

  const loadInsuranceInfo = async () => {
    try {
      setLoading(true)
      const info = await billingApi.getInvoiceInsuranceInfo(invoiceId)
      setInsuranceInfo(info)

      // If claim exists, set claim ID for details dialog
      if (info.existingClaim) {
        setClaimId(info.existingClaim.claimId.toString())
      }
    } catch (error: any) {
      console.error('Error loading insurance info:', error)
      toast.error('Failed to load insurance information')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClaim = () => {
    if (!insuranceInfo?.canCreateClaim) {
      toast.error('Cannot create claim: ' + (insuranceInfo?.reason || 'Unknown error'))
      return
    }
    setCreateClaimDialogOpen(true)
  }

  const handleViewClaim = () => {
    if (insuranceInfo?.existingClaim) {
      setClaimId(insuranceInfo.existingClaim.claimId.toString())
      setClaimDetailsOpen(true)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading insurance information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!insuranceInfo) {
    return null
  }

  // Patient is not insurance
  if (!insuranceInfo.hasInsurance) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{insuranceInfo.reason || 'Patient is not registered as insurance patient'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Patient has insurance but no active policy
  if (!insuranceInfo.patientInsurance) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {insuranceInfo.reason || 'No active insurance policy found. Please create an insurance policy for this patient.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const { patientInsurance, existingClaim } = insuranceInfo

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Insurance Information</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Provider: {patientInsurance.providerName} ({patientInsurance.providerCode})
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Insurance Patient
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Policy:</span>
              <span className="ml-1 font-medium">{patientInsurance.policyNumber}</span>
            </div>
            {patientInsurance.memberId && (
              <div>
                <span className="text-muted-foreground">Member ID:</span>
                <span className="ml-1 font-medium">{patientInsurance.memberId}</span>
              </div>
            )}
          </div>

          {existingClaim ? (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Claim Status</p>
                  <p className="text-xs text-muted-foreground">Claim #{existingClaim.claimNumber}</p>
                </div>
                <Badge
                  variant={
                    existingClaim.status === 'approved' || existingClaim.status === 'paid'
                      ? 'default'
                      : existingClaim.status === 'rejected'
                      ? 'destructive'
                      : 'outline'
                  }
                  className={
                    existingClaim.status === 'approved' || existingClaim.status === 'paid'
                      ? 'bg-green-500'
                      : existingClaim.status === 'submitted' || existingClaim.status === 'under_review'
                      ? 'bg-yellow-500'
                      : ''
                  }
                >
                  {existingClaim.status === 'draft' ? 'Draft' :
                   existingClaim.status === 'submitted' ? 'Submitted' :
                   existingClaim.status === 'under_review' ? 'Under Review' :
                   existingClaim.status === 'approved' ? 'Approved' :
                   existingClaim.status === 'partially_approved' ? 'Partially Approved' :
                   existingClaim.status === 'rejected' ? 'Rejected' :
                   existingClaim.status === 'paid' ? 'Paid' :
                   existingClaim.status}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleViewClaim}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Claim & Requirements
              </Button>
            </div>
          ) : (
            <div className="pt-2 border-t">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  No claim created yet. Create a claim to submit this invoice to {patientInsurance.providerName}.
                </AlertDescription>
              </Alert>
              <Button
                className="w-full mt-3"
                onClick={handleCreateClaim}
                disabled={!insuranceInfo.canCreateClaim}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Insurance Claim
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInsuranceClaimDialog
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        open={createClaimDialogOpen}
        onOpenChange={setCreateClaimDialogOpen}
        onSuccess={() => {
          loadInsuranceInfo()
          onUpdate?.()
        }}
      />

      <ClaimDetailsDialog
        claimId={claimId}
        open={claimDetailsOpen}
        onOpenChange={setClaimDetailsOpen}
        onUpdate={() => {
          loadInsuranceInfo()
          onUpdate?.()
        }}
      />
    </>
  )
}


