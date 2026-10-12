/**
 * Shared jsPDF helpers for finance exports (AZ CarePlus letterhead + logo).
 */

import { branding } from "@/lib/branding"
import { buildFacilityContactLines } from "@/lib/facility-profile"
import { sanitizePrintText } from "@/lib/sanitize-print-text"
import { publicAssetUrl } from "@/lib/utils/url"

function pdfText(value: unknown): string {
  return sanitizePrintText(value)
}

export function kes(amount: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
}

export function parseAmount(v: unknown): number {
  const n = parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}

export async function loadFinancePdf() {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const autoTable =
    (autoTableModule as { default?: unknown; autoTable?: unknown }).default ||
    (autoTableModule as { autoTable?: unknown }).autoTable ||
    ((doc: unknown, options: unknown) => (doc as { autoTable: (o: unknown) => void }).autoTable(options))
  return { jsPDF, autoTable }
}

export type JsPdfDoc = InstanceType<Awaited<ReturnType<typeof loadFinancePdf>>["jsPDF"]>

function printLogoUrl(): string {
  const path = branding.logoPrintPath || branding.logoPath
  if (typeof window === "undefined") return path
  return publicAssetUrl(path)
}

async function loadPrintLogo(): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  if (typeof window === "undefined") return null
  try {
    const res = await fetch(printLogoUrl(), { cache: "force-cache" })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    const format: "PNG" | "JPEG" = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG"
    return { dataUrl, format }
  } catch {
    return null
  }
}

function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Letterhead with AZ CarePlus logo (matches patient detail print/PDF style). Returns start Y for body content. */
export async function drawFinanceLetterhead(pdf: JsPdfDoc, documentTitle: string, subtitle: string): Promise<number> {
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = 10

  const logo = await loadPrintLogo()
  if (logo) {
    const dim = await imageSize(logo.dataUrl)
    const maxW = 52
    const h = (dim.height / dim.width) * maxW
    pdf.addImage(logo.dataUrl, logo.format, (pageWidth - maxW) / 2, y, maxW, h)
    y += h + 5
  } else {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.setTextColor(0, 107, 63)
    pdf.text(pdfText(branding.appBrand || branding.productName), pageWidth / 2, y + 4, { align: "center" })
    y += 10
  }

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(13)
  pdf.setTextColor(0, 107, 63)
  pdf.text(pdfText(documentTitle), pageWidth / 2, y, { align: "center" })
  y += 6

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.setTextColor(80, 80, 80)
  pdf.text(pdfText(subtitle), pageWidth / 2, y, { align: "center" })
  y += 5

  const contact = buildFacilityContactLines(null).slice(0, 2).join(" · ")
  if (contact) {
    pdf.setFontSize(8)
    pdf.text(pdfText(contact), pageWidth / 2, y, { align: "center" })
    y += 5
  }

  pdf.setTextColor(0, 0, 0)
  pdf.setDrawColor(210, 210, 210)
  pdf.line(14, y, pageWidth - 14, y)
  return y + 6
}

/** @deprecated Use drawFinanceLetterhead for logo letterhead. */
export function drawFinanceReportHeader(pdf: JsPdfDoc, title: string, subtitle: string) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  pdf.setFillColor(15, 76, 117)
  pdf.rect(0, 0, pageWidth, 32, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.text(pdfText(title), 14, 12)
  pdf.setFontSize(9)
  pdf.text(pdfText(`${branding.productName} - ${branding.hospitalLocation || "Facility"}`), 14, 19)
  pdf.text(pdfText(subtitle), 14, 26)
  pdf.setTextColor(0, 0, 0)
}

export function tableFinalY(pdf: JsPdfDoc): number {
  return (pdf as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40
}

export const financeTableStyles = {
  theme: "striped" as const,
  headStyles: { fillColor: [0, 107, 63] as [number, number, number], textColor: 255, fontStyle: "bold" as const },
  alternateRowStyles: { fillColor: [245, 248, 250] as [number, number, number] },
  styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" as const },
}

export async function downloadFinanceTablePdf(options: {
  filename: string
  title: string
  subtitle: string
  headers: string[]
  rows: string[][]
  orientation?: "portrait" | "landscape"
}) {
  if (typeof window === "undefined") return

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({
    orientation: options.orientation || "landscape",
    unit: "mm",
    format: "a4",
  })
  const startY = await drawFinanceLetterhead(pdf, options.title, options.subtitle)
  const wideTable = options.headers.length >= 10
  autoTable(pdf, {
    head: [options.headers.map(pdfText)],
    body: options.rows.length
      ? options.rows.map((row) => row.map(pdfText))
      : [["-", "No data to export"]],
    startY,
    ...financeTableStyles,
    ...(wideTable
      ? {
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: 0,
          styles: { ...financeTableStyles.styles, fontSize: 7, cellPadding: 1.5 },
          headStyles: { ...financeTableStyles.headStyles, fontSize: 7 },
        }
      : {}),
  })

  const y = tableFinalY(pdf)
  pdf.setFontSize(8)
  pdf.setTextColor(120, 120, 120)
  pdf.text(pdfText(`Generated ${new Date().toLocaleString("en-KE")}`), 14, y + 8)

  pdf.save(options.filename.endsWith(".pdf") ? options.filename : `${options.filename}.pdf`)
}
