"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { billingApi } from "@/lib/api"
import { Loader2, Printer, Download } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { displayUnitPriceForInvoiceLine } from "@/lib/invoice-line-display"
import { buildDocumentHeaderHtml, buildDocumentFooterHtml } from "@/lib/facility-profile"

interface GroupedPaymentReceiptDialogProps {
  batchReceiptNumber: string | null
  patientId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupedPaymentReceiptDialog({
  batchReceiptNumber,
  patientId,
  open,
  onOpenChange
}: GroupedPaymentReceiptDialogProps) {
  const [batchData, setBatchData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && batchReceiptNumber) {
      loadBatchReceipt()
    }
  }, [open, batchReceiptNumber])

  const loadBatchReceipt = async () => {
    try {
      setLoading(true)
      const data = await billingApi.getPaymentBatch(batchReceiptNumber!, patientId)
      setBatchData(data)
    } catch (error: any) {
      console.error('Error loading batch receipt:', error)
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !batchData) return

    const totalAmount = batchData.invoices.reduce((sum: number, inv: any) =>
      sum + parseFloat(inv.amountPaid || 0), 0
    )

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${batchReceiptNumber}</title>
          <style>
            @media print {
              @page { margin: 15mm; }
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 700px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header img {
              max-width: 250px;
              height: auto;
              margin-bottom: 15px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .header h2 {
              margin: 5px 0;
              font-size: 18px;
              color: #333;
            }
            .receipt-info {
              text-align: center;
              margin-bottom: 25px;
            }
            .receipt-info p {
              margin: 5px 0;
              font-size: 14px;
            }
            .info-section {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
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
            .payment-details {
              margin: 25px 0;
              padding: 15px;
              background-color: #fff;
              border: 2px solid #000;
              border-radius: 5px;
            }
            .payment-details h3 {
              margin-top: 0;
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              font-size: 16px;
            }
            .total-row {
              font-size: 20px;
              font-weight: bold;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 3px solid #000;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #000;
              font-size: 12px;
              color: #666;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              background-color: #10b981;
              color: white;
              border-radius: 20px;
              font-weight: bold;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          ${buildDocumentHeaderHtml(null, window.location.origin, {
            documentTitle: "PAYMENT RECEIPT",
            subtitle: "Grouped Payment Receipt",
          })}

          <div class="receipt-info">
            <p><strong>Receipt Number:</strong> ${batchReceiptNumber}</p>
            <p><strong>Date:</strong> ${batchData.paymentDate ? formatDate(batchData.paymentDate) : formatDate(new Date().toISOString())}</p>
            <p><span class="status-badge">PAID</span></p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span>${batchData.patientName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient Number:</span>
              <span>${batchData.patientNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method:</span>
              <span>${(batchData.paymentMethod || 'Cash').toUpperCase()}</span>
            </div>
            ${batchData.referenceNumber ? `
              <div class="info-row">
                <span class="info-label">Reference Number:</span>
                <span>${batchData.referenceNumber}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Number of Invoices:</span>
              <span>${batchData.invoices.length}</span>
            </div>
          </div>

          <div class="payment-details">
            <h3>Invoices Paid</h3>
            ${batchData.invoices.map((inv: any) => `
              <div style="margin-bottom: 25px;">
                <h4 style="margin: 15px 0 10px 0; font-size: 16px; font-weight: bold; border-bottom: 2px solid #ddd; padding-bottom: 5px;">
                  Invoice: ${inv.invoiceNumber} (${inv.invoiceDate ? formatDate(inv.invoiceDate) : 'N/A'})
                </h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                  <thead>
                    <tr style="background-color: #f5f5f5;">
                      <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
                      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantity</th>
                      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Unit Price</th>
                      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inv.items && inv.items.length > 0 ? inv.items.map((item: any) => {
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
                          <td style="border: 1px solid #ddd; padding: 8px;">${displayName}</td>
                          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity || 1}</td>
                          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(displayUnitPriceForInvoiceLine(item))}</td>
                          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(parseFloat(item.totalPrice || item.total || 0))}</td>
                        </tr>
                      `;
                    }).join('') : '<tr><td colspan="4" style="text-align: center; padding: 10px;">No items</td></tr>'}
                    <tr style="font-weight: bold; background-color: #f9f9f9;">
                      <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Invoice Total:</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(parseFloat(inv.totalAmount || 0))}</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #e8f5e9;">
                      <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount Paid:</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(parseFloat(inv.amountPaid || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `).join('')}
            <div style="margin-top: 20px; padding-top: 15px; border-top: 3px solid #000;">
              <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                <span>Total Paid:</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            ${buildDocumentFooterHtml(null)}
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>This is a computer-generated receipt.</p>
          </div>
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
    handlePrint()
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!batchData) {
    return null
  }

  const totalAmount = batchData.invoices.reduce((sum: number, inv: any) =>
    sum + parseFloat(inv.amountPaid || 0), 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grouped Payment Receipt</DialogTitle>
          <DialogDescription>
            Receipt Number: {batchReceiptNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">PAYMENT RECEIPT</h2>
                <p className="text-sm text-muted-foreground">Grouped Payment Receipt</p>
                <p className="text-sm text-muted-foreground">Receipt Number: {batchReceiptNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Date: {batchData.paymentDate ? formatDate(batchData.paymentDate) : formatDate(new Date().toISOString())}
                </p>
                <Badge className="mt-2 bg-green-500">PAID</Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="font-medium">Patient Name:</span>
                  <span>{batchData.patientName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Patient Number:</span>
                  <span>{batchData.patientNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <span>{(batchData.paymentMethod || 'Cash').toUpperCase()}</span>
                </div>
                {batchData.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium">Reference Number:</span>
                    <span>{batchData.referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Number of Invoices:</span>
                  <span>{batchData.invoices.length}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Invoices Paid</h3>
                <div className="space-y-6">
                  {batchData.invoices.map((inv: any, invoiceIndex: number) => (
                    <div key={invoiceIndex} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <h4 className="font-semibold text-base">
                          Invoice: {inv.invoiceNumber}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {inv.invoiceDate ? formatDate(inv.invoiceDate) : 'N/A'}
                        </span>
                      </div>
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
                            {inv.items && inv.items.length > 0 ? (
                              inv.items.map((item: any, itemIndex: number) => {
                                let displayName = item.chargeName || item.description || item.itemDescription || 'Service';
                                if (displayName.includes('Prescription Item:') && item.medicationName) {
                                  if (displayName.includes('Unknown')) {
                                    displayName = `Prescription Item: ${item.medicationName}`;
                                  } else {
                                    displayName = `Prescription Item: ${item.medicationName}`;
                                  }
                                }
                                return (
                                  <TableRow key={itemIndex}>
                                    <TableCell>{displayName}</TableCell>
                                    <TableCell className="text-right">{item.quantity || 1}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(displayUnitPriceForInvoiceLine(item))}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(parseFloat(item.totalPrice || item.total || 0))}</TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No items</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="font-bold bg-muted">
                              <TableCell colSpan={3} className="text-right">Invoice Total:</TableCell>
                              <TableCell className="text-right">{formatCurrency(parseFloat(inv.totalAmount || 0))}</TableCell>
                            </TableRow>
                            <TableRow className="font-bold bg-green-50 dark:bg-green-950/20">
                              <TableCell colSpan={3} className="text-right">Amount Paid:</TableCell>
                              <TableCell className="text-right">{formatCurrency(parseFloat(inv.amountPaid || 0))}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Paid:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
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

