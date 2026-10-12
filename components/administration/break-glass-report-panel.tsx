"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { securityApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

export function BreakGlassReportPanel() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [patientId, setPatientId] = useState("")
  const [filterPatientId, setFilterPatientId] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await securityApi.getBreakGlassLogs({
        limit: 75,
        patientId: filterPatientId.trim() ? Number(filterPatientId) : undefined,
      })
      setLogs(data.logs || [])
    } catch (err: any) {
      toast({
        title: "Break-glass report failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filterPatientId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card id="break-glass-report">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Emergency (break-glass) access report
            </CardTitle>
            <CardDescription>
              Privacy review of documented emergency access per facility and ICT procedures
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex max-w-md flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label className="text-xs">Filter by patient ID</Label>
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Optional"
              inputMode="numeric"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={() => setFilterPatientId(patientId)}>
            Apply
          </Button>
        </div>

        {loading && !logs.length ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No break-glass events recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.logId}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {log.createdAt ? format(new Date(log.createdAt), "dd MMM yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{log.username || log.userId}</TableCell>
                      <TableCell className="text-xs">
                        <Link
                          href={`/patients/${log.patientId}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {log.patientFirstName} {log.patientLastName}
                        </Link>
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          #{log.patientId}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs">{log.reason}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {log.validUntil ? format(new Date(log.validUntil), "dd MMM HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
