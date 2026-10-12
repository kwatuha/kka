/** Client-side Excel (.xlsx) downloads with numeric columns preserved for finance. */

export type ExcelExportOptions = {
  sheetName?: string
  /** 0-based column indexes stored as numbers (not strings). */
  numberColumns?: number[]
}

export function excelFilename(prefix: string): string {
  const d = new Date().toISOString().slice(0, 10)
  return `${prefix}-${d}.xlsx`
}

export async function downloadExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options?: ExcelExportOptions
): Promise<void> {
  const xlsxModule = await import("xlsx")
  const XLSX = (xlsxModule as { default?: typeof xlsxModule }).default || xlsxModule
  const sheetName = (options?.sheetName || "Export").slice(0, 31)
  const numberCols = new Set(options?.numberColumns ?? [])

  const normalizedRows = rows.map((row) =>
    row.map((cell, colIdx) => {
      if (numberCols.has(colIdx)) {
        const n = typeof cell === "number" ? cell : parseFloat(String(cell))
        return Number.isFinite(n) ? n : cell
      }
      return cell
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...normalizedRows])

  if (numberCols.size > 0 && ws["!ref"]) {
    const range = XLSX.utils.decode_range(ws["!ref"])
    for (let r = 1; r <= range.e.r; r++) {
      for (const c of numberCols) {
        const ref = XLSX.utils.encode_cell({ r, c })
        const cell = ws[ref]
        if (cell && typeof cell.v === "number") {
          cell.t = "n"
          cell.z = "#,##0.00"
        }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}
