"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, Loader2 } from "lucide-react"
import { ihrApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

export function IhrCompliancePanel() {
  const [events, setEvents] = useState<any[]>([])
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [eventCode, setEventCode] = useState("")
  const [alertId, setAlertId] = useState("")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [cat, decl] = await Promise.all([
        ihrApi.getCatalog(),
        ihrApi.getDeclarations(25),
      ])
      setEvents(cat?.events || [])
      setDeclarations(decl?.declarations || [])
    } catch (err: any) {
      toast({
        title: "Could not load IHR data",
        description: err.message || "Request failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const declare = async () => {
    if (!eventCode) {
      toast({ title: "Select an IHR event type", variant: "destructive" })
      return
    }
    try {
      setSubmitting(true)
      await ihrApi.declareEvent({
        eventCode,
        idsrAlertId: alertId ? Number(alertId) : undefined,
        title: title || undefined,
        summary: summary || undefined,
      })
      toast({
        title: "IHR event declared",
        description: "Staff alert sent and declaration recorded for audit.",
      })
      setTitle("")
      setSummary("")
      setAlertId("")
      await load()
    } catch (err: any) {
      toast({
        title: "Declaration failed",
        description: err.message || "Could not declare event",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card id="ihr-compliance">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          IHR &amp; public health events
        </CardTitle>
        <CardDescription>
          Facility workflow for International Health Regulations: declare events, link IDSR alerts, and
          notify public-health roles. National IHR pipe connects when MoH provides credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>IHR event type</Label>
                <Select value={eventCode} onValueChange={setEventCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.eventCode} value={ev.eventCode}>
                        {ev.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ihrAlertId">Linked IDSR alert ID (optional)</Label>
                <Input
                  id="ihrAlertId"
                  inputMode="numeric"
                  placeholder="e.g. 12"
                  value={alertId}
                  onChange={(e) => setAlertId(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ihrTitle">Title override (optional)</Label>
              <Input id="ihrTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ihrSummary">Summary for public health team</Label>
              <Textarea
                id="ihrSummary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the event, contacts, and immediate actions taken."
              />
            </div>
            <Button onClick={() => void declare()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Declare IHR event &amp; send alert
            </Button>

            <div>
              <h4 className="text-sm font-semibold mb-2">Recent declarations</h4>
              {declarations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No declarations yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>IDSR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declarations.map((d) => (
                      <TableRow key={d.declarationId}>
                        <TableCell>{d.declarationId}</TableCell>
                        <TableCell>{d.title || d.catalogTitle || d.eventCode}</TableCell>
                        <TableCell>{d.idsrAlertId || "—"}</TableCell>
                        <TableCell>{d.status}</TableCell>
                        <TableCell>
                          {d.declaredAt ? String(d.declaredAt).slice(0, 16).replace("T", " ") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
