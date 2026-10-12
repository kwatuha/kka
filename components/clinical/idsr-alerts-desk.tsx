"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react"
import { integrationsApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "detected", label: "Detected" },
  { value: "published", label: "Published" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "failed", label: "Failed" },
]

function urgencyVariant(urgency: string) {
  const u = String(urgency || "").toLowerCase()
  if (u === "immediate") return "destructive" as const
  if (u === "urgent") return "default" as const
  return "secondary" as const
}

export function IdsrAlertsDesk() {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([])
  const [byStatus, setByStatus] = useState<Record<string, number>>({})
  const [statusFilter, setStatusFilter] = useState("all")
  const [patientFilter, setPatientFilter] = useState("")
  const [appliedPatient, setAppliedPatient] = useState("")
  const [busyId, setBusyId] = useState<number | null>(null)
  const [evalText, setEvalText] = useState("suspected measles rash and fever")
  const [evalPatientId, setEvalPatientId] = useState("")
  const [evaluating, setEvaluating] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true)
      const data = await integrationsApi.getIdsrAlerts({
        limit: 100,
        status: statusFilter === "all" ? undefined : statusFilter,
        patientId: appliedPatient.trim() ? Number(appliedPatient) : undefined,
      })
      setAlerts(data.alerts || [])
      setByStatus(data.byStatus || {})
    } catch (err: any) {
      if (!opts?.silent) {
        toast({
          title: "Could not load IDSR alerts",
          description: err.message,
          variant: "destructive",
        })
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [statusFilter, appliedPatient])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => {
      void load({ silent: true })
    }, 15000)
    return () => clearInterval(timer)
  }, [load])

  const immediateUnacked = alerts.filter(
    (a) =>
      String(a.urgency || "").toLowerCase() === "immediate" &&
      String(a.status || "").toLowerCase() !== "acknowledged"
  )

  const acknowledge = async (alertId: number) => {
    try {
      setBusyId(alertId)
      await integrationsApi.acknowledgeIdsrAlert(alertId)
      toast({ title: "Alert acknowledged" })
      await load()
    } catch (err: any) {
      toast({ title: "Acknowledge failed", description: err.message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const runEvaluate = async () => {
    try {
      setEvaluating(true)
      const result = await integrationsApi.evaluateIdsr({
        text: evalText,
        patientId: evalPatientId.trim() ? Number(evalPatientId) : undefined,
        sourceType: "manual_desk",
        summary: "Manual evaluate from IDSR alerts desk",
      })
      const matched = result?.alerts?.length || result?.matched || 0
      toast({
        title: matched ? "Notifiable condition matched" : "No IDSR match",
        description: matched
          ? `${result.alerts?.[0]?.diseaseName || "Alert created"} — refresh list`
          : "Try keywords from the IDSR catalog (e.g. measles, cholera)",
      })
      await load()
    } catch (err: any) {
      toast({ title: "Evaluate failed", description: err.message, variant: "destructive" })
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-4">
      {immediateUnacked.length > 0 ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {immediateUnacked.length} immediate IDSR alert{immediateUnacked.length === 1 ? "" : "s"} need review
          </p>
          <p className="mt-1 text-muted-foreground">
            {immediateUnacked
              .slice(0, 3)
              .map((a) => a.diseaseName || a.diseaseCode)
              .join(" · ")}
            {immediateUnacked.length > 3 ? ` · +${immediateUnacked.length - 3} more` : ""}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byStatus).map(([status, count]) => (
          <Badge key={status} variant={status === "acknowledged" ? "secondary" : "outline"}>
            {status}: {count}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual IDSR evaluate (sandbox)</CardTitle>
          <CardDescription>
            Triggers the same pipeline as encounter/lab CDS — creates alerts and optional IHR auto-link (
            REP-IHR-AUTO).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label>Clinical text</Label>
            <Textarea value={evalText} onChange={(e) => setEvalText(e.target.value)} rows={2} />
          </div>
          <div className="w-full space-y-2 md:w-36">
            <Label>Patient ID (optional)</Label>
            <Input
              value={evalPatientId}
              onChange={(e) => setEvalPatientId(e.target.value)}
              inputMode="numeric"
              placeholder="—"
            />
          </div>
          <Button onClick={() => void runEvaluate()} disabled={evaluating}>
            {evaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Evaluate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                IDSR alert register
              </CardTitle>
              <CardDescription>
                Facility review queue before national pipe is live (REP-IDSR-NOTIFY / REP-IDSR-DESK)
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading && !alerts.length}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Patient ID</Label>
              <Input
                className="w-[140px]"
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                inputMode="numeric"
                placeholder="Optional"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={() => setAppliedPatient(patientFilter)}>
              Apply
            </Button>
          </div>

          {loading && !alerts.length ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Disease</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>IHR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                        No alerts — use manual evaluate or clinical CDS (lab/radiology/triage).
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((a) => (
                      <TableRow key={a.alertId}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {a.createdAt ? format(new Date(a.createdAt), "dd MMM yyyy HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{a.diseaseName}</div>
                          <div className="text-muted-foreground">{a.diseaseCode}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={urgencyVariant(a.urgency)}>{a.urgency}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.patientId ? (
                            <Link href={`/patients/${a.patientId}`} className="text-primary hover:underline">
                              #{a.patientId}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                          {a.sourceType}
                          {a.summary ? ` · ${a.summary}` : ""}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.ihrEventCode ? (
                            <span title={a.ihrEventTitle || undefined}>{a.ihrEventCode}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {a.status !== "acknowledged" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === a.alertId}
                              onClick={() => void acknowledge(a.alertId)}
                            >
                              {busyId === a.alertId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Ack
                                </>
                              )}
                            </Button>
                          ) : null}
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
    </div>
  )
}
