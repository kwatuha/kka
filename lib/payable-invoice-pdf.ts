/**
 * Vendor payable invoice PDF download.
 */

import { format } from "date-fns"
import { formatDate } from "@/lib/date-utils"
import { drawFinanceLetterhead, kes, loadFinancePdf, parseAmount, tableFinalY } from "@/lib/finance-pdf-utils"
import { sanitizePrintText } from "@/lib/sanitize-print-text"

export type PayableInvoiceRecord = {
  invoiceNumber?: string
  vendorName?: string
  invoiceDate?: string
  dueDate?: string | null
  totalAmount?: number | string
  paidAmount?: number | string
  outstandingAmount?: number | string
  status?: string
  purchaseOrderNumber?: string | null
  notes?: string | null
}

export async function downloadVendorPayableInvoicePdf(payable: PayableInvoiceRecord) {
  if (typeof window === "undefined") return

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const invNo = payable.invoiceNumber || "invoice"
  const startY = await drawFinanceLetterhead(
    pdf,
    "Vendor Invoice",
    `${invNo} · Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`
  )

  const rows: [string, string][] = [
    ["Vendor", payable.vendorName || "—"],
    ["Invoice number", invNo],
    ["Invoice date", payable.invoiceDate ? formatDate(payable.invoiceDate) : "—"],
    ["Due date", payable.dueDate ? formatDate(payable.dueDate) : "—"],
    ["Status", payable.status || "—"],
    ["Total amount", kes(parseAmount(payable.totalAmount))],
    ["Paid amount", kes(parseAmount(payable.paidAmount))],
    ["Outstanding", kes(parseAmount(payable.outstandingAmount))],
  ]
  if (payable.purchaseOrderNumber) {
    rows.push(["Purchase order", payable.purchaseOrderNumber])
  }
  if (payable.notes?.trim()) {
    rows.push(["Notes", payable.notes.trim()])
  }

  autoTable(pdf, {
    body: rows,
    startY,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 130 },
    },
  })

  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(sanitizePrintText("Accounts payable - vendor invoice copy"), 14, tableFinalY(pdf) + 10)

  const safeName = invNo.replace(/[^\w-]+/g, "_")
  pdf.save(`vendor-invoice-${safeName}.pdf`)
}
