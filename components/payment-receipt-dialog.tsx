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
import {
  buildDocumentFooterHtml,
  buildDocumentHeaderHtml,
  type FacilityProfile,
} from "@/lib/facility-profile"

interface PaymentReceiptDialogProps {
  invoiceId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentReceiptDialog({ invoiceId, open, onOpenChange }: PaymentReceiptDialogProps) {
  const [invoice, setInvoice] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && invoiceId) {
      loadReceiptData()
    }
  }, [open, invoiceId])

  const loadReceiptData = async () => {
    try {
      setLoading(true)
      const [invoiceData, paymentsData] = await Promise.all([
        billingApi.getInvoiceById(invoiceId!),
        billingApi.getInvoicePayments(invoiceId!).catch(() => []) // Fallback to empty array if endpoint doesn't exist
      ])
      setInvoice(invoiceData)
      setPayments(paymentsData || [])
    } catch (error: any) {
      console.error('Error loading receipt data:', error)
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
    if (!printWindow) return

    const totalAmount = parseFloat(invoice.totalAmount || 0)
    const paidAmount = parseFloat(invoice.paidAmount || 0)
    const facilityProfile: FacilityProfile = {
      branchId: invoice.branchId,
      branchName: invoice.branchName,
      letterheadTitle: invoice.letterheadTitle,
      logoUrl: invoice.logoUrl,
      address: invoice.branchAddress,
      postalAddress: invoice.branchPostalAddress,
      phone: invoice.branchPhone,
      email: invoice.branchEmail,
      website: invoice.branchWebsite,
      receiptHeader: invoice.branchReceiptHeader,
      receiptFooter: invoice.branchReceiptFooter,
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${invoice.invoiceNumber}</title>
          <style>
            @media print {
              @page { margin: 15mm; }
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
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
          ${buildDocumentHeaderHtml(facilityProfile, window.location.origin, {
            documentTitle: "PAYMENT RECEIPT",
            subtitle: "Official Receipt",
          })}

          <div class="receipt-info">
            <p><strong>Receipt Number:</strong> ${invoice.invoiceNumber || 'N/A'}</p>
            <p><strong>Date:</strong> ${invoice.paymentDate ? formatDate(invoice.paymentDate) : formatDate(new Date().toISOString())}</p>
            <p><span class="status-badge">PAID</span></p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span>${invoice.patientFirstName} ${invoice.patientLastName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient Number:</span>
              <span>${invoice.patientNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Invoice Number:</span>
              <span>${invoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Invoice Date:</span>
              <span>${invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method:</span>
              <span>${(invoice.paymentMethod || 'Cash').toUpperCase()}</span>
            </div>
            ${invoice.paymentReference ? `
              <div class="info-row">
                <span class="info-label">Reference Number:</span>
                <span>${invoice.paymentReference}</span>
              </div>
            ` : ''}
          </div>

          <div class="payment-details">
            <h3>Invoice Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Description</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Quantity</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Unit Price</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any) => {
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
                  <td colspan="3" style="border: 1px solid #ddd; padding: 10px; text-align: right;">Invoice Total:</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="payment-details">
            <h3>Payment Summary</h3>
            <div class="amount-row">
              <span>Invoice Amount:</span>
              <span>${formatCurrency(totalAmount)}</span>
            </div>
            ${payments.length > 0 ? payments.map((payment: any) => `
              <div class="amount-row">
                <span>Payment (${payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'}):</span>
                <span>${formatCurrency(parseFloat(payment.amount || 0))}</span>
              </div>
            `).join('') : `
              <div class="amount-row">
                <span>Amount Paid:</span>
                <span>${formatCurrency(paidAmount)}</span>
              </div>
            `}
            <div class="amount-row total-row">
              <span>Total Paid:</span>
              <span>${formatCurrency(paidAmount)}</span>
            </div>
          </div>

          ${invoice.notes ? `
            <div class="info-section">
              <p><strong>Notes:</strong></p>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          ${buildDocumentFooterHtml(facilityProfile)}
          <div class="footer">
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
        <DialogContent className="max-w-2xl">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>
            Invoice: {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">PAYMENT RECEIPT</h2>
                <p className="text-sm text-muted-foreground">Receipt Number: {invoice.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Date: {invoice.paymentDate ? formatDate(invoice.paymentDate) : formatDate(new Date().toISOString())}
                </p>
                <Badge className="mt-2 bg-green-500">PAID</Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="font-medium">Patient Name:</span>
                  <span>{invoice.patientFirstName} {invoice.patientLastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Patient Number:</span>
                  <span>{invoice.patientNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Invoice Number:</span>
                  <span>{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Invoice Date:</span>
                  <span>{invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <span>{(invoice.paymentMethod || 'Cash').toUpperCase()}</span>
                </div>
                {invoice.paymentReference && (
                  <div className="flex justify-between">
                    <span className="font-medium">Reference Number:</span>
                    <span>{invoice.paymentReference}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-6">
                <h3 className="font-semibold mb-4">Invoice Items</h3>
                <div className="rounded-md border">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-2 text-left">Description</th>
                        <th className="border p-2 text-right">Quantity</th>
                        <th className="border p-2 text-right">Unit Price</th>
                        <th className="border p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((item: any, index: number) => {
                          let displayName = item.chargeName || item.description || item.itemDescription || 'Service';
                          if (displayName.includes('Prescription Item:') && item.medicationName) {
                            if (displayName.includes('Unknown')) {
                              displayName = `Prescription Item: ${item.medicationName}`;
                            } else {
                              displayName = `Prescription Item: ${item.medicationName}`;
                            }
                          }
                          return (
                            <tr key={index}>
                              <td className="border p-2">{displayName}</td>
                              <td className="border p-2 text-right">{item.quantity || 1}</td>
                              <td className="border p-2 text-right">{formatCurrency(displayUnitPriceForInvoiceLine(item))}</td>
                              <td className="border p-2 text-right">{formatCurrency(parseFloat(item.totalPrice || item.total || 0))}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="border p-2 text-center text-muted-foreground">No items</td>
                        </tr>
                      )}
                      <tr className="font-bold bg-muted">
                        <td colSpan={3} className="border p-2 text-right">Invoice Total:</td>
                        <td className="border p-2 text-right">{formatCurrency(totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Invoice Amount:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {payments.length > 0 ? (
                  payments.map((payment: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm text-muted-foreground">
                      <span>Payment ({payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'}):</span>
                      <span>{formatCurrency(parseFloat(payment.amount || 0))}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(paidAmount)}</span>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 pt-4 border-t">
                  <p className="font-medium mb-2">Notes:</p>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
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

