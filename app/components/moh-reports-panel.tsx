"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
  Download,
  FileText,
  Loader2,
  Search,
  ClipboardList,
  BookOpen,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { mohReportsApi } from "@/lib/api"
import { branding } from "@/lib/branding"
import {
  MOH_REPORTS_CATALOG,
  getMohReportDef,
  labelIndicatorKey,
  type MohReportDef,
} from "@/lib/moh-reports-catalog"
import { generateMOHIndicatorPDF, generateMOHRegisterPDF } from "@/lib/moh-reports-pdf"

function defaultDates() {
  const now = new Date()
  return {
    start: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    end: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"),
  }
}

type FilterKind = "all" | "summary" | "register" | "priority"

const PRIORITY_CODES = new Set(["717", "705A", "705B", "706", "710", "711", "731", "505", "740"])

type Props = {
  reports?: MohReportDef[]
  initialCode?: string
  /** Compact embed without page chrome */
  embedded?: boolean
}

export function MohReportsPanel({
  reports = MOH_REPORTS_CATALOG.filter((r) => !r.legacy),
  initialCode,
  embedded = false,
}: Props) {
  const defaults = useMemo(() => defaultDates(), [])
  const [code, setCode] = useState(initialCode || "731")
  const [filter, setFilter] = useState<FilterKind>("priority")
  const [query, setQuery] = useState("")
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<{
    indicators?: Record<string, unknown>
    rows?: Record<string, unknown>[]
    title?: string
    kind?: string
  } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reports.filter((r) => {
      if (filter === "summary" && r.kind !== "summary") return false
      if (filter === "register" && r.kind !== "register") return false
      if (filter === "priority" && !PRIORITY_CODES.has(r.code) && r.kind !== "summary") return false
      if (filter === "priority" && r.kind === "summary" && !PRIORITY_CODES.has(r.code) && r.legacy) return false
      if (filter === "priority" && !PRIORITY_CODES.has(r.code)) return false
      if (!q) return true
      return (
        r.code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      )
    })
  }, [reports, filter, query])

  const def = getMohReportDef(code) || reports.find((r) => r.code === code)
  const needsDates = code !== "730"

  const handleGenerate = async () => {
    if (!def) return
    try {
      setGenerating(true)
      const periodStart = startDate || defaults.start
      const periodEnd = endDate || defaults.end
      const payload =
        code === "730"
          ? await mohReportsApi.getByCode("730")
          : await mohReportsApi.getByCode(code, periodStart, periodEnd)

      const isEnvelope = Boolean(payload && (payload.indicators || payload.rows || payload.code))
      const indicators = isEnvelope ? payload.indicators : payload
      const rows = isEnvelope ? payload.rows : undefined
      const title = (isEnvelope && payload.title) || def.title
      const kind = (isEnvelope && payload.kind) || def.kind
      const facilityName = branding.appBrand || "Facility"
      const facilityCode = "00001"

      if (kind === "register" || Array.isArray(rows)) {
        const list = rows || []
        await generateMOHRegisterPDF({
          code,
          title,
          facilityName,
          facilityCode,
          period: { start: periodStart, end: periodEnd },
          rows: list,
        })
        setPreview({ rows: list, title, kind: "register" })
      } else {
        const inds = (indicators || payload || {}) as Record<string, unknown>
        await generateMOHIndicatorPDF({
          code,
          title,
          facilityName,
          facilityCode,
          period: needsDates ? { start: periodStart, end: periodEnd } : null,
          indicators: inds,
        })
        setPreview({ indicators: inds, title, kind: "summary" })
      }

      toast({
        title: "Report ready",
        description: `${title} — use the print dialog to save as PDF.`,
      })
    } catch (error: any) {
      console.error(`Error generating MOH ${code}:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to generate MOH ${code}`,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const summaryEntries = Object.entries(preview?.indicators || {}).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== "object"
  )
  const previewRows = preview?.rows || []
  const rowCols = previewRows[0] ? Object.keys(previewRows[0]).slice(0, 8) : []

  return (
    <div className={cn("space-y-6", !embedded && "")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-700" />
            Ministry of Health reports
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ministry of Health facility summaries and registers. Pick a form, set the period, then generate.
          </p>
        </div>
        {needsDates && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="moh-period-start" className="text-xs">
                From
              </Label>
              <Input
                id="moh-period-start"
                type="date"
                className="w-[150px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="moh-period-end" className="text-xs">
                To
              </Label>
              <Input
                id="moh-period-end"
                type="date"
                className="w-[150px]"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search MOH 731, immunization, lab…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["priority", "Common"],
              ["summary", "Summaries"],
              ["register", "Registers"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={filter === id ? "default" : "outline"}
              className={
                filter === id
                  ? "bg-emerald-900 text-white hover:bg-emerald-800 hover:text-white"
                  : undefined
              }
              onClick={() => setFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid gap-2 sm:grid-cols-2 max-h-[28rem] overflow-y-auto pr-1">
          {filtered.map((r) => {
            const selected = r.code === code
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => {
                  setCode(r.code)
                  setPreview(null)
                }}
                className={cn(
                  "text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700",
                  selected
                    ? "border-emerald-950 bg-emerald-900 text-white shadow-md ring-1 ring-emerald-950"
                    : "bg-background text-foreground hover:border-emerald-700/50 hover:bg-emerald-50/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("font-semibold text-sm leading-snug", selected ? "text-white" : "text-foreground")}>
                    {r.title}
                  </div>
                  <Badge
                    variant={selected ? "outline" : r.kind === "summary" ? "secondary" : "outline"}
                    className={cn(
                      "shrink-0 text-[10px]",
                      selected && "border-white/50 bg-white/20 text-white hover:bg-white/25"
                    )}
                  >
                    {r.kind === "summary" ? "Summary" : "Register"}
                  </Badge>
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs line-clamp-2",
                    selected ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {r.description}
                </p>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full py-8 text-center">No reports match your search.</p>
          )}
        </div>

        <Card className="border-emerald-900/10 bg-gradient-to-b from-emerald-50/50 to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {def?.title || `MOH ${code}`}
            </CardTitle>
            <CardDescription>{def?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {def?.includes?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {def.includes.slice(0, 8).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-md bg-background/80 border px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <Button onClick={handleGenerate} disabled={generating || !def} className="w-full sm:w-auto">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate & print PDF
                </>
              )}
            </Button>

            {summaryEntries.length > 0 && (
              <div className="rounded-md border bg-background overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicator</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryEntries.map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="text-sm">{labelIndicatorKey(key)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="rounded-md border bg-background overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rowCols.map((c) => (
                        <TableHead key={c} className="text-xs">
                          {labelIndicatorKey(c)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 40).map((row, i) => (
                      <TableRow key={i}>
                        {rowCols.map((c) => (
                          <TableCell key={c} className="whitespace-nowrap max-w-[140px] truncate text-xs">
                            {String(row[c] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!preview && (
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Values come from facility encounters, labs, and admissions. Use official KHIS coding for final submission.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
