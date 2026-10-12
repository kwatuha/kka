/** Client-side CSV download for finance and operational exports. */

export function escapeCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function csvFilename(prefix: string): string {
  const d = new Date().toISOString().slice(0, 10)
  return `${prefix}-${d}.csv`
}
