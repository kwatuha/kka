/**
 * Letterhead HTML print for patient/staff financial statements (browser print, not screenshots).
 */

import { format } from "date-fns"
import { buildDocumentFooterHtml, buildDocumentHeaderHtml } from "@/lib/facility-profile"
import { buildFinancialStatementLines } from "@/lib/finance-statement-pdf"

function kes(amount: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
}

function openPrintHtml(html: string) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    toastFallback(html)
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300)
  }
}

function toastFallback(html: string) {
  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "statement.html"
  a.click()
  URL.revokeObjectURL(url)
}

function statementTableHtml(statement: Record<string, unknown>): string {
  const opening = parseFloat(String(statement.openingBalance ?? 0)) || 0
  const lines = buildFinancialStatementLines(statement as Parameters<typeof buildFinancialStatementLines>[0])
  let running = opening
  const rows =
    lines.length > 0
      ? lines
          .map((t) => {
            running += t.debit - t.credit
            return `<tr>
          <td>${format(new Date(t.transactionDate), "dd MMM yyyy")}</td>
          <td>${escapeHtml(t.transactionNumber || "")}</td>
          <td>${escapeHtml(t.description || "")}</td>
          <td>${escapeHtml(t.referenceNumber || "")}</td>
          <td class="num">${t.debit > 0 ? kes(t.debit) : ""}</td>
          <td class="num">${t.credit > 0 ? kes(t.credit) : ""}</td>
          <td class="num">${kes(running)}</td>
        </tr>`
          })
          .join("")
      : `<tr><td colspan="7" style="text-align:center;color:#666;">No activity in this period</td></tr>`

  const summary = (statement.summary || {}) as Record<string, unknown>
  return `
    <div class="summary">
      <p><strong>Opening balance:</strong> ${kes(opening)}</p>
      <p><strong>Amount invoiced:</strong> ${kes(parseFloat(String(summary.totalInvoiced ?? summary.totalDebits ?? 0)))}</p>
      <p><strong>Amount paid:</strong> ${kes(parseFloat(String(summary.totalPaid ?? summary.totalCredits ?? 0)))}</p>
      <p><strong>Closing balance:</strong> ${kes(parseFloat(String(statement.closingBalance ?? 0)))}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Txn #</th><th>Description</th><th>Reference</th>
          <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const printStyles = `
  body { font-family: Arial, sans-serif; color: #222; margin: 24px; font-size: 12px; }
  .meta { margin: 16px 0; line-height: 1.6; }
  .summary { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; }
  .summary p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-size: 11px; }
  td.num, th.num { text-align: right; }
  @media print { body { margin: 12px; } }
`

export function printPatientFinancialStatement(statement: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const patient = statement.patient as Record<string, unknown>
  const origin = window.location.origin
  const stmtDate = statement.statementDate
    ? format(new Date(String(statement.statementDate)), "dd MMMM yyyy")
    : format(new Date(), "dd MMMM yyyy")

  const header = buildDocumentHeaderHtml(null, origin, {
    documentTitle: "Patient Financial Statement",
    subtitle: `${patient?.patientNumber || ""} · ${stmtDate}`,
    showFacilityNameUnderLogo: true,
  })

  const meta = `
    <div class="meta">
      <div><strong>Name:</strong> ${escapeHtml(`${patient?.firstName || ""} ${patient?.lastName || ""}`.trim())}</div>
      <div><strong>Phone:</strong> ${escapeHtml(String(patient?.phone || "—"))}</div>
      <div><strong>Gender:</strong> ${escapeHtml(String(patient?.gender || "—"))}</div>
    </div>
  `

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Patient Statement</title><style>${printStyles}</style></head><body>
    ${header}${meta}${statementTableHtml(statement)}
    ${buildDocumentFooterHtml(null)}
    <p style="font-size:11px;color:#888;margin-top:16px;">Generated ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
  </body></html>`

  openPrintHtml(html)
}

export function printStaffFinancialStatement(statement: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const staff = statement.staff as Record<string, unknown>
  const origin = window.location.origin
  const stmtDate = statement.statementDate
    ? format(new Date(String(statement.statementDate)), "dd MMMM yyyy")
    : format(new Date(), "dd MMMM yyyy")

  const header = buildDocumentHeaderHtml(null, origin, {
    documentTitle: "Staff Financial Statement",
    subtitle: `${staff?.username || ""} · ${stmtDate}`,
    showFacilityNameUnderLogo: true,
  })

  const meta = `
    <div class="meta">
      <div><strong>Name:</strong> ${escapeHtml(`${staff?.firstName || ""} ${staff?.lastName || ""}`.trim())}</div>
      <div><strong>Role:</strong> ${escapeHtml(String(staff?.roleName || "—"))}</div>
    </div>
  `

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Staff Statement</title><style>${printStyles}</style></head><body>
    ${header}${meta}${statementTableHtml(statement)}
    ${buildDocumentFooterHtml(null)}
  </body></html>`

  openPrintHtml(html)
}
