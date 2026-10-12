"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { billingApi } from "@/lib/api"
import { Loader2, Download, Printer, X } from "lucide-react"
import { InvoiceInsuranceClaim } from "@/components/invoice-insurance-claim"
import { CreateInsuranceClaimDialog } from "@/components/create-insurance-claim-dialog"
import { formatDate } from "@/lib/date-utils"
import {
  buildDocumentFooterHtml,
  buildDocumentHeaderHtml,
  facilityProfileFromInvoice,
} from "@/lib/facility-profile"

interface InvoiceDetailsDialogProps {
  invoiceId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function InvoiceDetailsDialog({ invoiceId, open, onOpenChange, onUpdate }: InvoiceDetailsDialogProps) {
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && invoiceId) {
      loadInvoice()
    }
  }, [open, invoiceId])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const data = await billingApi.getInvoiceById(invoiceId!)
      setInvoice(data)
    } catch (error: any) {
      console.error('Error loading invoice:', error)
    } finally {
      setLoading(false)
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: { variant: 'default' as const, label: 'Paid', className: 'bg-green-500' },
      pending: { variant: 'outline' as const, label: 'Pending' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      partial: { variant: 'secondary' as const, label: 'Partial' },
    }

    const config = variants[status?.toLowerCase()] || { variant: 'outline' as const, label: status }
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
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

  if (!invoice) {
    return null
  }

  const totalAmount = parseFloat(invoice.totalAmount || 0)
  const paidAmount = parseFloat(invoice.paidAmount || 0)
  const balance = parseFloat(invoice.balance || totalAmount)
  const isPaid = invoice.status === 'paid' || balance <= 0

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            @media print {
              @page { margin: 20mm; }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header img {
              max-width: 250px;
              height: auto;
              margin-bottom: 15px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-section h3 {
              margin-top: 0;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
            }
            .info-label { font-weight: bold; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .text-right { text-align: right; }
            .total-row {
              font-weight: bold;
              background-color: #f9f9f9;
            }
            .summary {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #000;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 16px;
            }
            .summary-total {
              font-size: 20px;
              font-weight: bold;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px solid #000;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
          <body>
            ${buildDocumentHeaderHtml(facilityProfileFromInvoice(invoice), window.location.origin, {
              documentTitle: "INVOICE",
              subtitle: `Invoice Number: ${invoice.invoiceNumber} · Date: ${invoice.invoiceDate ? formatDate(invoice.invoiceDate) : "N/A"}`,
            })}

            <div class="info-grid">
            <div class="info-section">
              <h3>Bill To:</h3>
              <div class="info-row">
                <span class="info-label">Patient:</span>
                <span>${invoice.patientFirstName} ${invoice.patientLastName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Patient Number:</span>
                <span>${invoice.patientNumber || 'N/A'}</span>
              </div>
            </div>
            <div class="info-section">
              <h3>Invoice Details:</h3>
              <div class="info-row">
                <span class="info-label">Invoice Date:</span>
                <span>${invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Due Date:</span>
                <span>${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span>${invoice.status?.toUpperCase() || 'PENDING'}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any) => {
                // For prescription items, use medicationName if available
                let displayName = item.chargeName || item.description || item.itemDescription || 'Service';
                if (displayName.includes('Prescription Item:') && item.medicationName) {
                  if (displayName.includes('Unknown')) {
                    displayName = `Prescription Item: ${item.medicationName}`;
                  } else {
                    displayName = `Prescription Item: ${item.medicationName}`;
                  }
                }
                return `
                <tr>
                  <td>${displayName}</td>
                  <td class="text-right">${item.quantity || 1}</td>
                  <td class="text-right">${formatCurrency(parseFloat(item.unitPrice || item.price || 0))}</td>
                  <td class="text-right">${formatCurrency(parseFloat(item.totalPrice || item.total || 0))}</td>
                </tr>
              `;
              }).join('') : '<tr><td colspan="4" style="text-align: center;">No items</td></tr>'}
              <tr class="total-row">
                <td colspan="3" class="text-right"><strong>Total</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(totalAmount)}</span>
            </div>
            ${paidAmount > 0 ? `
              <div class="summary-row">
                <span>Paid Amount:</span>
                <span>${formatCurrency(paidAmount)}</span>
              </div>
            ` : ''}
            ${balance > 0 ? `
              <div class="summary-row">
                <span>Balance:</span>
                <span>${formatCurrency(balance)}</span>
              </div>
            ` : ''}
            ${isPaid && invoice.paymentMethod ? `
              <div class="summary-row">
                <span>Payment Method:</span>
                <span>${invoice.paymentMethod.toUpperCase()}</span>
              </div>
            ` : ''}
            ${isPaid && invoice.paymentDate ? `
              <div class="summary-row">
                <span>Payment Date:</span>
                <span>${formatDate(invoice.paymentDate)}</span>
              </div>
            ` : ''}
          </div>

          ${invoice.notes ? `
            <div style="margin-top: 30px;">
              <h3>Notes:</h3>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          ${buildDocumentFooterHtml(facilityProfileFromInvoice(invoice))}
          <p style="text-align:center;font-size:11px;color:#888;margin-top:8px;">Generated on ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const handleDownloadPDF = () => {
    // For now, trigger print which allows saving as PDF
    // In production, you might want to use a PDF library like jsPDF or html2pdf
    handlePrint()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details - {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Patient: {invoice.patientFirstName} {invoice.patientLastName} ({invoice.patientNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="text-sm font-medium">
                    {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                </div>
              </div>
              {balance > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Paid Amount</p>
                      <p className="text-sm font-medium">{formatCurrency(paidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-sm font-semibold text-orange-600">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insurance Claim Section */}
          <InvoiceInsuranceClaim
            invoiceId={invoiceId!}
            invoiceNumber={invoice.invoiceNumber}
            patientId={invoice.patientId?.toString() || ''}
            onUpdate={() => {
              loadInvoice()
              onUpdate?.()
            }}
          />

          {/* Invoice Items */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Invoice Items</h3>
              {invoice.items && invoice.items.length > 0 ? (
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
                        // For prescription items, use medicationName if available
                        let displayName = item.chargeName || item.description || item.itemDescription || 'Service';
                        if (displayName.includes('Prescription Item:') && item.medicationName) {
                          // Replace "Unknown" or use medicationName directly
                          if (displayName.includes('Unknown')) {
                            displayName = `Prescription Item: ${item.medicationName}`;
                          } else {
                            // If description already has a name but we have medicationName, prefer medicationName for accuracy
                            displayName = `Prescription Item: ${item.medicationName}`;
                          }
                        }

                        return (
                          <TableRow key={index}>
                            <TableCell>{displayName}</TableCell>
                            <TableCell className="text-right">{item.quantity || 1}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(item.unitPrice || item.price || 0))}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(parseFloat(item.totalPrice || item.total || 0))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-semibold">
                        <TableCell colSpan={3} className="text-right">Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items found</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


