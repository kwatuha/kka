/**
 * Payroll register PDF — wide table with horizontal pages and readable column widths.
 */

import { drawFinanceLetterhead, loadFinancePdf, tableFinalY } from "@/lib/finance-pdf-utils"
import { sanitizePrintText } from "@/lib/sanitize-print-text"

function num(v: unknown): number {
  return parseFloat(String(v ?? 0)) || 0
}

function d(v: unknown): string {
  if (!v) return ""
  return String(v).slice(0, 10)
}

/** Compact amounts (KES in subtitle); avoids "Ksh …" breaking narrow cells. */
function pdfAmount(v: unknown): string {
  const n = num(v)
  if (n === 0 && (v === "" || v == null)) return ""
  return n.toLocaleString("en-KE", { maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

const HEADERS = [
  "Payroll",
  "Emp #",
  "Employee name",
  "Department",
  "From",
  "To",
  "Pay date",
  "Base",
  "Allow",
  "OT",
  "Bonus",
  "Gross",
  "PAYE",
  "NSSF",
  "SHA",
  "Other",
  "Deductions",
  "Net pay",
  "Status",
  "Bank",
  "Account",
]

/** Minimum mm widths — total exceeds A4 landscape so autotable uses horizontal page breaks. */
const COLUMN_WIDTHS: Record<number, number> = {
  0: 24,
  1: 17,
  2: 38,
  3: 28,
  4: 21,
  5: 21,
  6: 21,
  7: 17,
  8: 17,
  9: 14,
  10: 16,
  11: 18,
  12: 16,
  13: 16,
  14: 14,
  15: 16,
  16: 18,
  17: 18,
  18: 16,
  19: 22,
  20: 26,
}

const AMOUNT_COLS = new Set([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

function rowFromTransaction(row: Record<string, unknown>): string[] {
  return [
    String(row.payrollNumber || ""),
    String(row.employeeNumber || ""),
    String(row.employeeName || ""),
    String(row.departmentName || ""),
    d(row.payPeriodStart),
    d(row.payPeriodEnd),
    d(row.paymentDate),
    pdfAmount(row.baseSalary),
    pdfAmount(row.allowances),
    pdfAmount(row.overtime),
    pdfAmount(row.bonuses),
    pdfAmount(row.grossSalary),
    pdfAmount(row.tax),
    pdfAmount(row.nssf),
    pdfAmount(row.nhif),
    pdfAmount(row.otherDeductions),
    pdfAmount(row.deductions),
    pdfAmount(row.netSalary),
    String(row.paymentStatus || ""),
    String(row.bankName || ""),
    String(row.bankAccount || ""),
  ].map(sanitizePrintText)
}

function totalsRow(transactions: Record<string, unknown>[]): string[] {
  const sum = (key: string) => transactions.reduce((s, t) => s + num(t[key]), 0)
  return [
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    pdfAmount(sum("baseSalary")),
    pdfAmount(sum("allowances")),
    pdfAmount(sum("overtime")),
    pdfAmount(sum("bonuses")),
    pdfAmount(sum("grossSalary")),
    pdfAmount(sum("tax")),
    pdfAmount(sum("nssf")),
    pdfAmount(sum("nhif")),
    pdfAmount(sum("otherDeductions")),
    pdfAmount(sum("deductions")),
    pdfAmount(sum("netSalary")),
    "",
    "",
    "",
  ].map(sanitizePrintText)
}

export async function downloadPayrollRegisterPdf(opts: {
  filename: string
  title: string
  subtitle: string
  transactions: Record<string, unknown>[]
}) {
  if (typeof window === "undefined") return

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const startY = await drawFinanceLetterhead(pdf, opts.title, sanitizePrintText(opts.subtitle))

  const body = opts.transactions.map(rowFromTransaction)
  if (body.length > 0) {
    body.push(totalsRow(opts.transactions))
  }

  const columnStyles: Record<number, { cellWidth: number; halign?: "left" | "right" | "center" }> = {}
  for (const [idx, w] of Object.entries(COLUMN_WIDTHS)) {
    const i = Number(idx)
    columnStyles[i] = {
      cellWidth: w,
      halign: AMOUNT_COLS.has(i) ? "right" : "left",
    }
  }

  autoTable(pdf, {
    head: [HEADERS.map(sanitizePrintText)],
    body: body.length ? body : [["No payroll rows in this period"]],
    startY,
    margin: { top: startY, left: 8, right: 8, bottom: 12 },
    tableWidth: "auto",
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 1, 2],
    showHead: "everyPage",
    theme: "striped",
    headStyles: {
      fillColor: [0, 107, 63],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 1.5,
      valign: "middle",
      overflow: "linebreak",
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
      valign: "top",
      overflow: "linebreak",
    },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles,
    didParseCell(data) {
      if (data.section === "body" && AMOUNT_COLS.has(data.column.index)) {
        data.cell.styles.halign = "right"
      }
    },
  })

  pdf.setFontSize(7)
  pdf.setTextColor(100, 100, 100)
  pdf.text(
    sanitizePrintText("Amounts in KES (whole shillings). Bank details included; use Excel export for full precision."),
    8,
    tableFinalY(pdf) + 6
  )

  pdf.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`)
}
