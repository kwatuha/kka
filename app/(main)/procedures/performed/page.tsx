"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { proceduresApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Search, RefreshCw, ClipboardList } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function ProceduresPerformedPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [hasOutcomeOnly, setHasOutcomeOnly] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await proceduresApi.getPerformedReport({
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        hasOutcomeOnly: hasOutcomeOnly || undefined,
        limit: 200,
        page: 1,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error(e)
      toast({
        title: "Could not load report",
        description: e.message || "Failed to fetch procedures performed",
        variant: "destructive",
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, dateFrom, dateTo, hasOutcomeOnly])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            Procedures performed
          </h1>
          <p className="text-muted-foreground">
            All recorded patient procedures from <code className="text-xs">patient_procedures</code> — including
            outcomes when captured (e.g. from queue <strong>Complete &amp; outcome</strong>).
          </p>
        </div>
        <Button variant="outline" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by patient, procedure name, notes, or outcome text; narrow by date.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Patient name, MRN, procedure, outcome…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="w-[160px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" className="w-[160px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                id="outcome-only"
                checked={hasOutcomeOnly}
                onCheckedChange={(c) => setHasOutcomeOnly(c === true)}
              />
              <Label htmlFor="outcome-only" className="text-sm font-normal cursor-pointer">
                With outcome only
              </Label>
            </div>
            <Button type="button" onClick={() => load()} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>
            {rows.length} record{rows.length === 1 ? "" : "s"} (max 200 per request). For radiology imaging reports use{" "}
            <Link href="/radiology" className="underline font-medium">
              Radiology → Stored reports
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No procedures found. Adjust filters or record procedures from encounters / queue.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Complications</TableHead>
                    <TableHead>Performed by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.patientProcedureId}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.procedureDate ? format(new Date(r.procedureDate), "yyyy-MM-dd") : "—"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/patients/${r.patientId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.firstName || r.lastName
                            ? `${r.firstName || ""} ${r.lastName || ""}`.trim()
                            : "Patient"}
                        </Link>
                        {r.patientNumber && (
                          <div className="text-xs text-muted-foreground font-mono">{r.patientNumber}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="font-medium text-sm">{r.procedureName || "—"}</div>
                        {r.procedureCode && (
                          <Badge variant="outline" className="text-xs mt-0.5 font-mono">
                            {r.procedureCode}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                        <span className="line-clamp-4 whitespace-pre-wrap">{r.procedureOutcome || "—"}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                        <span className="line-clamp-3">{r.complications || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.performedByFirstName || r.performedByLastName
                          ? `${r.performedByFirstName || ""} ${r.performedByLastName || ""}`.trim()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
