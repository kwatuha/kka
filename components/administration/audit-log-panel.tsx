"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Download, Loader2, RefreshCw, ScrollText } from "lucide-react"
import { auditApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function AuditLogPanel() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [patientId, setPatientId] = useState("")
  const [action, setAction] = useState("")
  const [resourceType, setResourceType] = useState("")
  const [filters, setFilters] = useState({ patientId: "", action: "", resourceType: "" })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await auditApi.getLogs({
        limit: 100,
        patientId: filters.patientId.trim() ? Number(filters.patientId) : undefined,
        action: filters.action.trim() || undefined,
        resourceType: filters.resourceType.trim() || undefined,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast({
        title: "Audit log load failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = () => {
    setFilters({ patientId, action, resourceType })
  }

  const downloadCsv = async () => {
    try {
      const q = new URLSearchParams({ limit: "500" })
      if (filters.patientId.trim()) q.set("patientId", filters.patientId.trim())
      const res = await fetch(`/api/audit/logs/export.csv?${q.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hmis-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Audit CSV downloaded (SEC-AUDIT-CSV)" })
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" })
    }
  }

  return (
    <Card id="audit-log-browser">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Audit log browser
            </CardTitle>
            <CardDescription>
              Tamper-evident activity trail — filter by patient, action, or resource; export CSV for review
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void downloadCsv()}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Patient ID</Label>
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Optional"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. BREAK_GLASS, CONSENT_CAPTURE"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Resource type</Label>
            <Input
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              placeholder="e.g. patient"
            />
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={applyFilters}>
          Apply filters
        </Button>

        {loading && !rows.length ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No audit rows match filters
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.auditId}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {r.occurredAt ? format(new Date(r.occurredAt), "dd MMM HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.username || r.userId || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.resourceType}
                        {r.resourceId ? ` #${r.resourceId}` : ""}
                      </TableCell>
                      <TableCell className="text-xs">{r.patientId ?? "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {r.summary || "—"}
                      </TableCell>
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
