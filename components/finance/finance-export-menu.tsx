"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { csvFilename, downloadCsv } from "@/lib/csv-export"
import { downloadExcel, excelFilename } from "@/lib/excel-export"
import { downloadFinanceTablePdf, kes, parseAmount } from "@/lib/finance-pdf-utils"
import { sanitizePrintText } from "@/lib/sanitize-print-text"
import { toast } from "@/components/ui/use-toast"

export type FinanceExportPayload = {
  headers: string[]
  rows: (string | number)[][]
  /** 0-based indexes exported as Excel numbers. */
  numberColumns?: number[]
  pdfTitle: string
  pdfSubtitle: string
  /** e.g. accounts-payable */
  filenamePrefix: string
  pdfLandscape?: boolean
  /** Overrides generic table PDF (e.g. wide payroll register). */
  pdfExportFn?: () => Promise<void>
}

type FinanceExportMenuProps = {
  disabled?: boolean
  getPayload: () => FinanceExportPayload | null | Promise<FinanceExportPayload | null>
  onSuccess?: (format: "csv" | "excel" | "pdf", rowCount: number) => void
}

function rowToCsv(row: (string | number)[]): string[] {
  return row.map((c) => (typeof c === "number" ? String(c) : sanitizePrintText(c)))
}

function rowToPdf(
  row: (string | number)[],
  numberColumns: Set<number>
): string[] {
  return row.map((c, i) => {
    if (numberColumns.has(i) && (typeof c === "number" || c !== "")) {
      return kes(parseAmount(c))
    }
    return sanitizePrintText(String(c ?? ""))
  })
}

export function FinanceExportMenu({ disabled, getPayload, onSuccess }: FinanceExportMenuProps) {
  const [busy, setBusy] = useState(false)

  const run = async (format: "csv" | "excel" | "pdf") => {
    const payload = await Promise.resolve(getPayload())
    if (!payload || payload.rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Load or filter data before exporting.",
        variant: "destructive",
      })
      return
    }

    try {
      setBusy(true)
      const {
        headers,
        rows,
        numberColumns = [],
        filenamePrefix,
        pdfTitle,
        pdfSubtitle,
        pdfLandscape,
        pdfExportFn,
      } = payload
      const base = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}`

      if (format === "csv") {
        downloadCsv(csvFilename(filenamePrefix), [headers, ...rows.map(rowToCsv)])
      } else if (format === "excel") {
        await downloadExcel(excelFilename(filenamePrefix), headers, rows, {
          sheetName: pdfTitle.slice(0, 31),
          numberColumns,
        })
      } else if (pdfExportFn) {
        await pdfExportFn()
      } else {
        const numSet = new Set(numberColumns)
        await downloadFinanceTablePdf({
          filename: `${base}.pdf`,
          title: pdfTitle,
          subtitle: pdfSubtitle,
          headers,
          rows: rows.map((r) => rowToPdf(r, numSet)),
          orientation: pdfLandscape ? "landscape" : "portrait",
        })
      }

      onSuccess?.(format, rows.length)
      toast({
        title: "Export downloaded",
        description: `${rows.length} row(s) exported as ${format.toUpperCase()}.`,
      })
    } catch (error) {
      console.error("Finance export:", error)
      toast({
        title: "Export failed",
        description: "Could not generate the file.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          PDF (print-ready)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("csv")}>
          <Download className="mr-2 h-4 w-4" />
          CSV (raw)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
