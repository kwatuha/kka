"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ClipboardList, Download, Loader2, RefreshCw } from "lucide-react"
import { evidenceApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

export function HieSmokeRecorderPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [passed, setPassed] = useState(true)
  const [notes, setNotes] = useState("")
  const [steps, setSteps] = useState(
    "1. FHIR Patient publish (live)\n2. Clinical summary Composition publish\n3. Inbound bundle receive\n4. Verify fhir_export_log + outbox"
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await evidenceApi.getHieSmokeLogs(15)
      setLogs(data.logs || [])
    } catch (err: any) {
      toast({ title: "Smoke log load failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const record = async () => {
    try {
      setSaving(true)
      const result = await evidenceApi.recordHieSmoke({
        passed,
        notes: notes.trim() || undefined,
        stepsPerformed: steps.trim() || undefined,
        testLabel: passed ? "AfyaConnect live smoke PASS" : "AfyaConnect live smoke FAIL/partial",
      })
      toast({
        title: passed ? "Smoke test recorded (PASS)" : "Smoke test recorded (FAIL)",
        description: `Log #${result.logId} — attach to evidence pack / portal when credentials are live.`,
      })
      setNotes("")
      await load()
    } catch (err: any) {
      toast({ title: "Record failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const exportLatestJson = async () => {
    try {
      const data = await evidenceApi.getHieSmokeLogs(1)
      const row = data.logs?.[0]
      if (!row) {
        toast({ title: "No smoke log entries yet", variant: "destructive" })
        return
      }
      const res = await fetch(`/api/integrations/evidence/hie-smoke-log?limit=1`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("jwt_token") || ""}`,
        },
      })
      const full = await res.json()
      const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hie-smoke-log-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" })
    }
  }

  return (
    <Card id="hie-smoke-recorder" className="border-amber-200/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5" />
              Live HIE smoke recorder (INT-HIE-SMOKE-LOG)
            </CardTitle>
            <CardDescription>
              Record pass/fail after AfyaConnect credentials and live flip — stores readiness snapshot + audit (
              use now for dry-run notes; re-record when live).
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="smoke-passed">Test passed</Label>
              <Switch id="smoke-passed" checked={passed} onCheckedChange={setPassed} />
            </div>
            <div className="space-y-2">
              <Label>Steps performed</Label>
              <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Assessor notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ticket ref, channel ID, HTTP status, etc."
              />
            </div>
            <Button onClick={() => void record()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record smoke test
            </Button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm">Recent entries</Label>
              <Button size="sm" variant="ghost" onClick={() => void exportLatestJson()}>
                <Download className="mr-2 h-3 w-3" />
                Export list JSON
              </Button>
            </div>
            {loading && !logs.length ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Modes</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                          No recordings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((l) => (
                        <TableRow key={l.logId}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {l.recordedAt ? format(new Date(l.recordedAt), "dd MMM yyyy HH:mm") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={l.passed ? "default" : "destructive"}>
                              {l.passed ? "PASS" : "FAIL"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            FHIR {l.fhirMode} · CR {l.clientRegistryMode}
                          </TableCell>
                          <TableCell className="text-xs">{l.recordedByUsername || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
