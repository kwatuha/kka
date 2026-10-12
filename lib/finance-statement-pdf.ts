/**
 * Patient and staff financial statement PDF downloads (jsPDF + autotable + letterhead logo).
 */

import { format } from "date-fns"
import { sanitizePrintText } from "@/lib/sanitize-print-text"
import {
  drawFinanceLetterhead,
  financeTableStyles,
  kes,
  loadFinancePdf,
  parseAmount,
  tableFinalY,
} from "@/lib/finance-pdf-utils"

export type StatementLedgerLine = {
  transactionDate: string
  transactionNumber?: string
  description?: string
  referenceNumber?: string
  debit: number
  credit: number
}

/** Lines for PDF/table: GL transactions, or synthetic rows from invoices + payments. */
export function buildFinancialStatementLines(statement: {
  transactions?: Array<Record<string, unknown>>
  invoices?: Array<Record<string, unknown>>
  payments?: Array<Record<string, unknown>>
}): StatementLedgerLine[] {
  const txs = statement.transactions || []
  const withAmounts = txs.filter((t) => parseAmount(t.debit) > 0 || parseAmount(t.credit) > 0)
  if (withAmounts.length > 0) {
    return withAmounts.map((t) => ({
      transactionDate: String(t.transactionDate || ""),
      transactionNumber: String(t.transactionNumber || ""),
      description: String(t.description || ""),
      referenceNumber: String(t.referenceNumber || ""),
      debit: parseAmount(t.debit),
      credit: parseAmount(t.credit),
    }))
  }

  const lines: StatementLedgerLine[] = []
  for (const inv of statement.invoices || []) {
    const amount = parseAmount(inv.totalAmount)
    if (amount <= 0) continue
    lines.push({
      transactionDate: String(inv.invoiceDate || ""),
      transactionNumber: String(inv.invoiceNumber || ""),
      description: `Invoice ${inv.invoiceNumber || ""}${inv.notes ? ` — ${inv.notes}` : ""}`,
      referenceNumber: String(inv.invoiceNumber || ""),
      debit: amount,
      credit: 0,
    })
  }
  for (const pay of statement.payments || []) {
    const amount = parseAmount(pay.amount)
    if (amount <= 0) continue
    lines.push({
      transactionDate: String(pay.paymentDate || ""),
      transactionNumber: String(pay.paymentNumber || pay.paymentId || ""),
      description: `Payment for Invoice ${pay.invoiceNumber || ""}${pay.paymentMethod ? ` — ${pay.paymentMethod}` : ""}`,
      referenceNumber: String(pay.invoiceNumber || pay.referenceNumber || ""),
      debit: 0,
      credit: amount,
    })
  }

  lines.sort((a, b) => {
    const da = new Date(a.transactionDate).getTime()
    const db = new Date(b.transactionDate).getTime()
    if (da !== db) return da - db
    if (a.debit > 0 && b.credit > 0) return -1
    if (a.credit > 0 && b.debit > 0) return 1
    return 0
  })
  return lines
}

function formatLineDate(value: string): string {
  if (!value) return "-"
  try {
    return format(new Date(value), "dd MMM yyyy")
  } catch {
    return value.slice(0, 10)
  }
}

async function renderStatementPdf(
  statement: Record<string, unknown>,
  options: { title: string; subtitle: string; metaLines: string[]; filename: string }
) {
  const lines = buildFinancialStatementLines(statement as Parameters<typeof buildFinancialStatementLines>[0])
  const opening = parseAmount(statement.openingBalance)
  const summary = (statement.summary || {}) as Record<string, unknown>

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  let y = await drawFinanceLetterhead(pdf, options.title, options.subtitle)

  pdf.setFontSize(10)
  for (const line of options.metaLines) {
    pdf.text(sanitizePrintText(line), 14, y)
    y += 5
  }

  y += 2
  pdf.setFontSize(9)
  pdf.text(sanitizePrintText(`Opening balance: ${kes(opening)}`), 14, y)
  y += 5
  pdf.text(
    sanitizePrintText(
      `Invoiced: ${kes(parseAmount(summary.totalInvoiced ?? summary.totalDebits))} - Paid: ${kes(parseAmount(summary.totalPaid ?? summary.totalCredits))} - Outstanding: ${kes(parseAmount(summary.totalOutstanding ?? statement.closingBalance))}`
    ),
    14,
    y
  )
  y += 5
  pdf.setFont("helvetica", "bold")
  pdf.text(sanitizePrintText(`Closing balance: ${kes(parseAmount(statement.closingBalance))}`), 14, y)
  pdf.setFont("helvetica", "normal")

  let running = opening
  const body =
    lines.length > 0
      ? lines.map((t) => {
          running += t.debit - t.credit
          return [
            formatLineDate(t.transactionDate),
            t.transactionNumber || "",
            t.description || "",
            t.referenceNumber || "",
            t.debit > 0 ? kes(t.debit) : "",
            t.credit > 0 ? kes(t.credit) : "",
            kes(running),
          ]
        })
      : [["-", "-", "No activity lines in this period", "-", "-", "-", kes(opening)]]

  autoTable(pdf, {
    head: [["Date", "Txn #", "Description", "Reference", "Debit", "Credit", "Balance"]],
    body,
    startY: y + 4,
    ...financeTableStyles,
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 52 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 24, halign: "right" },
    },
  })

  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, tableFinalY(pdf) + 8)

  pdf.save(options.filename)
}

export async function downloadPatientFinancialStatementPdf(statement: Record<string, unknown>) {
  if (typeof window === "undefined") return

  const patient = statement.patient as Record<string, unknown>
  const stmtDate = statement.statementDate
    ? format(new Date(String(statement.statementDate)), "dd MMMM yyyy")
    : format(new Date(), "dd MMMM yyyy")

  const fileId = String(patient?.patientNumber || "patient").replace(/[^\w-]+/g, "_")
  await renderStatementPdf(statement, {
    title: "Patient Financial Statement",
    subtitle: `Statement date: ${stmtDate} - ${patient?.patientNumber || "-"}`,
    metaLines: [
      `Name: ${patient?.firstName || ""} ${patient?.lastName || ""}`.trim(),
      `Phone: ${patient?.phone || "-"}`,
      `Gender: ${patient?.gender || "-"}`,
    ],
    filename: `patient-statement-${fileId}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
  })
}

export async function downloadStaffFinancialStatementPdf(statement: Record<string, unknown>) {
  if (typeof window === "undefined") return

  const staff = statement.staff as Record<string, unknown>
  const stmtDate = statement.statementDate
    ? format(new Date(String(statement.statementDate)), "dd MMMM yyyy")
    : format(new Date(), "dd MMMM yyyy")

  const username = String(staff?.username || "staff").replace(/[^\w-]+/g, "_")
  await renderStatementPdf(statement, {
    title: "Staff Financial Statement",
    subtitle: `Statement date: ${stmtDate} - ${staff?.username || "-"}`,
    metaLines: [
      `Name: ${staff?.firstName || ""} ${staff?.lastName || ""}`.trim(),
      `Role: ${staff?.roleName || "-"} - Department: ${staff?.department || "-"}`,
    ],
    filename: `staff-statement-${username}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
  })
}
