"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { CalendarClock, Loader2, RefreshCw } from "lucide-react"
import { auditApi, integrationsApi, mohReportsApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

export function IntegrationRunbookPanel() {
  const [loading, setLoading] = useState(true)
  const [mohExports, setMohExports] = useState<any[]>([])
  const [idsrReports, setIdsrReports] = useState<any[]>([])
  const [outboxCounts, setOutboxCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [moh, idsr, outbox] = await Promise.all([
        mohReportsApi.getExports(10).catch(() => ({ exports: [] })),
        integrationsApi.getIdsrWeeklyReports(8).catch(() => ({ reports: [] })),
        auditApi.getOutbox({ limit: 5 }).catch(() => ({ counts: {} })),
      ])
      setMohExports(moh.exports || [])
      setIdsrReports(idsr.reports || [])
      setOutboxCounts(outbox.counts || {})
    } catch (err: any) {
      toast({
        title: "Runbook status failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card id="integration-runbook">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Scheduled integration &amp; reporting status
            </CardTitle>
            <CardDescription>
              Status of MOH exports, IDSR weekly bundles, and integration outbox — see ICT runbook for schedules
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {Object.entries(outboxCounts).map(([status, count]) => (
            <Badge key={status} variant="secondary">
              Outbox {status}: {count}
            </Badge>
          ))}
          {!Object.keys(outboxCounts).length && !loading ? (
            <span className="text-xs text-muted-foreground">Outbox counts unavailable</span>
          ) : null}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Recent MOH scheduled exports</h3>
          {loading && !mohExports.length ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : mohExports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No MOH export rows — run cron or manual export from Reports.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generated</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SHA-256</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mohExports.map((row) => (
                    <TableRow key={row.exportId}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.generatedAt ? format(new Date(row.generatedAt), "dd MMM yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{row.reportCode}</TableCell>
                      <TableCell className="text-xs">{row.periodLabel || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {row.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-[10px]">
                        {row.sha256 || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Recent IDSR weekly exports</h3>
          {loading && !idsrReports.length ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : idsrReports.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No weekly IDSR bundles — use Reporting panel or{" "}
              <code className="text-[10px]">deploy/run-idsr-weekly-cron.sh</code>.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week ending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {idsrReports.map((row) => (
                    <TableRow key={row.reportId}>
                      <TableCell className="text-xs">{row.weekEnding || row.referenceDate || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {row.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.alertCount ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.createdAt ? format(new Date(row.createdAt), "dd MMM yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
