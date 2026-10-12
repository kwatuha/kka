"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { insuranceApi } from "@/lib/api"
import { CheckCircle2, XCircle, AlertCircle, FileText, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ClaimDetailsDialogProps {
  claimId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function ClaimDetailsDialog({ claimId, open, onOpenChange, onUpdate }: ClaimDetailsDialogProps) {
  const [claim, setClaim] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (open && claimId) {
      loadClaimDetails()
    }
  }, [open, claimId])

  const loadClaimDetails = async () => {
    try {
      setLoading(true)
      const data = await insuranceApi.getClaimById(claimId!)
      setClaim(data)
      setRequirements(data.requirements || [])
    } catch (error: any) {
      console.error('Error loading claim:', error)
      toast.error('Failed to load claim details')
    } finally {
      setLoading(false)
    }
  }

  const handleRequirementToggle = async (requirement: any) => {
    try {
      setUpdating(requirement.requirementId.toString())
      const newStatus = !requirement.isCompleted

      await insuranceApi.updateClaimRequirement(claimId!, requirement.requirementId.toString(), {
        isCompleted: newStatus,
        documentPath: requirement.documentPath,
        documentName: requirement.documentName,
        notes: requirement.completionNotes
      })

      // Update local state
      setRequirements(prev => prev.map(r =>
        r.requirementId === requirement.requirementId
          ? { ...r, isCompleted: newStatus, completionDate: newStatus ? new Date() : null }
          : r
      ))

      // Reload claim to get updated requirements summary
      await loadClaimDetails()

      toast.success(`Requirement ${newStatus ? 'completed' : 'marked as incomplete'}`)
      onUpdate?.()
    } catch (error: any) {
      console.error('Error updating requirement:', error)
      toast.error('Failed to update requirement')
    } finally {
      setUpdating(null)
    }
  }

  const handleSubmitClaim = async () => {
    if (!claim?.requirementsSummary?.allRequiredMet) {
      toast.error('Cannot submit: All required requirements must be completed')
      return
    }

    if (!confirm('Are you sure you want to submit this claim? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await insuranceApi.updateClaim(claimId!, {
        status: 'submitted',
        submissionDate: new Date().toISOString().split('T')[0]
      })

      toast.success('Claim submitted successfully')
      await loadClaimDetails()
      onUpdate?.()
    } catch (error: any) {
      console.error('Error submitting claim:', error)
      toast.error(error.message || 'Failed to submit claim')
    } finally {
      setLoading(false)
    }
  }

  const getRequirementTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'information':
        return <AlertCircle className="h-4 w-4" />
      case 'verification':
        return <CheckCircle2 className="h-4 w-4" />
      case 'authorization':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'outline' as const, label: 'Draft' },
      submitted: { variant: 'default' as const, label: 'Submitted' },
      under_review: { variant: 'default' as const, label: 'Under Review' },
      approved: { variant: 'default' as const, label: 'Approved', className: 'bg-green-500' },
      partially_approved: { variant: 'default' as const, label: 'Partially Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
      paid: { variant: 'default' as const, label: 'Paid', className: 'bg-blue-500' },
    }

    const config = variants[status] || { variant: 'outline' as const, label: status }
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  if (loading && !claim) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!claim) {
    return null
  }

  const summary = claim.requirementsSummary || {
    total: 0,
    completed: 0,
    required: 0,
    completedRequired: 0,
    allRequiredMet: false,
    completionPercentage: 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claim Details - {claim.claimNumber}</DialogTitle>
          <DialogDescription>
            Patient: {claim.firstName} {claim.lastName} ({claim.patientNumber}) | Provider: {claim.providerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Claim Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Claim Information</CardTitle>
                {getStatusBadge(claim.status)}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Claim Amount</p>
                <p className="text-lg font-semibold">KES {parseFloat(claim.claimAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Claim Date</p>
                <p className="text-sm font-medium">{new Date(claim.claimDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="text-sm font-medium">{claim.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="text-sm font-medium">{claim.policyNumber || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Claim Requirements Checklist</CardTitle>
                  <CardDescription>
                    Complete all required items before submitting the claim
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-lg font-semibold">{summary.completionPercentage}%</p>
                </div>
              </div>
              <Progress value={summary.completionPercentage} className="mt-2" />
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-muted-foreground">
                  {summary.completed} of {summary.total} completed
                </span>
                <span className="text-muted-foreground">
                  {summary.completedRequired} of {summary.required} required completed
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.total === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No requirements configured for this provider. Contact administrator to set up claim requirements.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {!summary.allRequiredMet && claim.status === 'draft' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        All required requirements must be completed before submitting the claim.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    {requirements.map((req) => (
                      <div
                        key={req.requirementId}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          req.isRequired && !req.isCompleted ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="mt-1">
                          {updating === req.requirementId.toString() ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox
                              checked={req.isCompleted || false}
                              onCheckedChange={() => handleRequirementToggle(req)}
                              disabled={claim.status !== 'draft' || updating !== null}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              {getRequirementTypeIcon(req.requirementType)}
                            </div>
                            <Label className="font-medium cursor-pointer" htmlFor={`req-${req.requirementId}`}>
                              {req.requirementName}
                              {req.isRequired && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </Label>
                            {req.requirementCode && (
                              <Badge variant="outline" className="text-xs">
                                {req.requirementCode}
                              </Badge>
                            )}
                          </div>
                          {req.description && (
                            <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                          )}
                          {req.isCompleted && req.completionDate && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Completed: {new Date(req.completionDate).toLocaleString()}
                              {req.completedByFirstName && (
                                <span> by {req.completedByFirstName} {req.completedByLastName}</span>
                              )}
                            </div>
                          )}
                          {req.documentName && (
                            <div className="mt-1 text-xs text-blue-600">
                              Document: {req.documentName}
                            </div>
                          )}
                        </div>
                        <div>
                          {req.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {claim.status === 'draft' && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={handleSubmitClaim}
                disabled={!summary.allRequiredMet || loading}
              >
                Submit Claim
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}









