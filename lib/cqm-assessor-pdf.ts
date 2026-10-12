/**
 * CQM starter package PDF for facility quality reporting.
 */

import { branding } from "@/lib/branding"
import { sanitizePrintText } from "@/lib/sanitize-print-text"

export type CqmPackage = {
  generatedAt?: string
  period?: { startDate: string; endDate: string; label?: string }
  indicators?: {
    id: string
    name: string
    category?: string
    numerator: number
    denominator?: number | null
    rate?: number | null
    unit?: string
  }[]
  disclaimer?: string
}

export async function downloadCqmAssessorPdf(pkg: CqmPackage, facilityName?: string) {
  if (typeof window === "undefined") return

  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const autoTable =
    (autoTableModule as any).default ||
    (autoTableModule as any).autoTable ||
    ((doc: any, options: any) => doc.autoTable(options))

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const product = branding.productName
  const facility = facilityName || branding.hospitalLocation || "Facility"
  const period = pkg.period?.label || `${pkg.period?.startDate || "—"} to ${pkg.period?.endDate || "—"}`

  pdf.setFillColor(15, 76, 117)
  pdf.rect(0, 0, pageWidth, 32, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.text(sanitizePrintText("Clinical Quality Measures - Assessor Export"), 14, 12)
  pdf.setFontSize(9)
  pdf.text(sanitizePrintText(`${product} - ${facility}`), 14, 19)
  pdf.text(sanitizePrintText(`Period: ${period} - Generated: ${new Date().toLocaleString()}`), 14, 26)
  pdf.setTextColor(0, 0, 0)

  const rows = (pkg.indicators || []).map((i) => [
    i.id,
    i.name,
    i.category || "—",
    String(i.numerator ?? "—"),
    i.denominator != null ? String(i.denominator) : "—",
    i.rate != null ? `${i.rate}%` : "—",
  ])

  autoTable(pdf, {
    head: [["ID", "Indicator", "Category", "Numerator", "Denominator", "Rate"]],
    body: rows.length ? rows : [["—", "Run Calculate indicators first", "—", "—", "—", "—"]],
    startY: 38,
    theme: "striped",
    headStyles: { fillColor: [15, 76, 117], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 62 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 16, halign: "right" },
    },
  })

  const finalY = (pdf as any).lastAutoTable?.finalY || 120
  pdf.setFontSize(8)
  pdf.setTextColor(80, 80, 80)
  const disclaimer =
    pkg.disclaimer ||
    "Starter CQM package for internal quality review. Not electronic submission to a national CQM registry."
  const lines = pdf.splitTextToSize(disclaimer, pageWidth - 28)
  pdf.text(lines, 14, finalY + 8)

  pdf.save(`cqm-report-${pkg.period?.startDate || "export"}.pdf`)
}
