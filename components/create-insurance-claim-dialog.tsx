"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { billingApi, insuranceApi } from "@/lib/api"
import { Loader2, FileText, CheckCircle2, AlertCircle, Building2, User, CreditCard, Calendar } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/date-utils"
import { ClaimDetailsDialog } from "@/components/claim-details-dialog"

interface CreateInsuranceClaimDialogProps {
  invoiceId: string | null
  invoiceNumber?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateInsuranceClaimDialog({
  invoiceId,
  invoiceNumber,
  open,
  onOpenChange,
  onSuccess
}: CreateInsuranceClaimDialogProps) {
  const [loading, setLoading] = useState(false)
  const [creatingClaim, setCreatingClaim] = useState(false)
  const [invoice, setInvoice] = useState<any>(null)
  const [insuranceInfo, setInsuranceInfo] = useState<any>(null)
  const [claimDetailsOpen, setClaimDetailsOpen] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)

  useEffect(() => {
    if (open && invoiceId) {
      loadData()
    }
  }, [open, invoiceId])

  const loadData = async () => {
    if (!invoiceId) return

    try {
      setLoading(true)
      const [invoiceData, insuranceData] = await Promise.all([
        billingApi.getInvoiceById(invoiceId),
        billingApi.getInvoiceInsuranceInfo(invoiceId).catch(() => null)
      ])
      setInvoice(invoiceData)
      setInsuranceInfo(insuranceData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load invoice information')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClaim = async () => {
    if (!invoiceId || !insuranceInfo?.canCreateClaim) {
      toast.error('Cannot create claim: ' + (insuranceInfo?.reason || 'Unknown error'))
      return
    }

    try {
      setCreatingClaim(true)
      const claim = await billingApi.createClaimFromInvoice(invoiceId)

      toast.success('Insurance claim created successfully')
      setClaimId(claim.claimId.toString())
      await loadData()
      onSuccess?.()

      // Open claim details dialog
      setClaimDetailsOpen(true)
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating claim:', error)
      toast.error(error.message || 'Failed to create claim')
    } finally {
      setCreatingClaim(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading invoice information...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!invoice || !insuranceInfo) {
    return null
  }

  const totalAmount = parseFloat(invoice.totalAmount || 0)
  const insuranceCoverage = parseFloat(invoice.insuranceCoverage || 0)
  const patientResponsibility = totalAmount - insuranceCoverage

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create Insurance Claim
            </DialogTitle>
            <DialogDescription>
              Review invoice details and create an insurance claim for {invoiceNumber || invoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Invoice Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Date</p>
                    <p className="font-semibold">
                      {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-semibold">
                      {invoice.patientFirstName} {invoice.patientLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Number</p>
                    <p className="font-semibold">{invoice.patientNumber || 'N/A'}</p>
                  </div>
                </div>

                {/* Invoice Items */}
                {invoice.items && invoice.items.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Invoice Items</p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.items.map((item: any, index: number) => {
                            let displayName = item.chargeName || item.description || item.itemDescription || 'Service';
                            if (displayName.includes('Prescription Item:') && item.medicationName) {
                              if (displayName.includes('Unknown')) {
                                displayName = `Prescription Item: ${item.medicationName}`;
                              } else {
                                displayName = `Prescription Item: ${item.medicationName}`;
                              }
                            }
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{displayName}</TableCell>
                                <TableCell className="text-right">{item.quantity || 1}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(parseFloat(item.unitPrice || item.price || 0))}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(parseFloat(item.totalPrice || item.total || 0))}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="font-bold bg-muted">
                            <TableCell colSpan={3} className="text-right">Total Amount:</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Amount Breakdown */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Invoice Amount:</span>
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">Insurance Coverage:</span>
                      <span className="font-semibold">{formatCurrency(insuranceCoverage)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-orange-600">
                      <span className="text-sm font-medium">Patient Responsibility:</span>
                      <span className="font-bold">{formatCurrency(patientResponsibility)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insurance Information */}
            {insuranceInfo.hasInsurance && insuranceInfo.patientInsurance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Insurance Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Insurance Provider</p>
                      <p className="font-semibold text-lg">
                        {insuranceInfo.patientInsurance.providerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Code: {insuranceInfo.patientInsurance.providerCode}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Insurance Patient
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Policy Number
                      </p>
                      <p className="font-semibold">{insuranceInfo.patientInsurance.policyNumber}</p>
                    </div>
                    {insuranceInfo.patientInsurance.memberId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Member ID</p>
                        <p className="font-semibold">{insuranceInfo.patientInsurance.memberId}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Messages */}
            {!insuranceInfo.hasInsurance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {insuranceInfo.reason || 'Patient is not registered as insurance patient'}
                </AlertDescription>
              </Alert>
            )}

            {insuranceInfo.hasInsurance && !insuranceInfo.patientInsurance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {insuranceInfo.reason || 'No active insurance policy found. Please create an insurance policy for this patient.'}
                </AlertDescription>
              </Alert>
            )}

            {insuranceInfo.existingClaim && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  A claim already exists for this invoice. Claim Number: {insuranceInfo.existingClaim.claimNumber}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateClaim}
              disabled={creatingClaim || !insuranceInfo.canCreateClaim || !!insuranceInfo.existingClaim}
            >
              {creatingClaim ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Claim...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Insurance Claim
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClaimDetailsDialog
        claimId={claimId}
        open={claimDetailsOpen}
        onOpenChange={setClaimDetailsOpen}
        onUpdate={() => {
          loadData()
          onSuccess?.()
        }}
      />
    </>
  )
}







