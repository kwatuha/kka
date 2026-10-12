"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

type OutboxEvent = {
  outboxId: number
  eventType: string
  aggregateType: string
  aggregateId: string
  status: string
  attempts: number
  lastError?: string | null
  createdAt?: string
  publishedAt?: string | null
}

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function IntegrationOutboxPanel() {
  const [loading, setLoading] = useState(true)
  const [replaying, setReplaying] = useState<number | "all" | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [events, setEvents] = useState<OutboxEvent[]>([])
  const [rabbitmqConfigured, setRabbitmqConfigured] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/audit/outbox?limit=40", { headers: authHeaders() })
      if (!res.ok) throw new Error("Failed to load outbox")
      const data = await res.json()
      setCounts(data.counts || {})
      setEvents(data.events || [])
      setRabbitmqConfigured(Boolean(data.rabbitmqConfigured))
    } catch (err: any) {
      toast({
        title: "Outbox load failed",
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

  const replayOne = async (id: number) => {
    try {
      setReplaying(id)
      const res = await fetch(`/api/audit/outbox/${id}/replay`, {
        method: "POST",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Replay failed")
      toast({ title: "Event requeued", description: `Outbox #${id} set to pending` })
      await load()
    } catch (err: any) {
      toast({ title: "Replay failed", description: err.message, variant: "destructive" })
    } finally {
      setReplaying(null)
    }
  }

  const replayFailed = async () => {
    try {
      setReplaying("all")
      const res = await fetch("/api/audit/outbox/replay-failed", {
        method: "POST",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Replay failed")
      const data = await res.json()
      toast({ title: "Failed events requeued", description: `${data.count || 0} event(s)` })
      await load()
    } catch (err: any) {
      toast({ title: "Replay failed", description: err.message, variant: "destructive" })
    } finally {
      setReplaying(null)
    }
  }

  return (
    <Card id="integration-outbox">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Integration outbox (RabbitMQ)</CardTitle>
          <CardDescription>
            Integration event spine — patient, encounter, lab, and claim events published to{" "}
            <code>hmis.events</code>. Broker:{" "}
            {rabbitmqConfigured ? (
              <Badge variant="default">configured</Badge>
            ) : (
              <Badge variant="outline">not configured</Badge>
            )}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void replayFailed()}
            disabled={replaying !== null || !(counts.failed > 0)}
          >
            {replaying === "all" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Replay failed ({counts.failed || 0})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {["pending", "published", "failed"].map((s) => (
            <Badge key={s} variant={s === "failed" ? "destructive" : "outline"}>
              {s}: {counts[s] || 0}
            </Badge>
          ))}
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Aggregate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      No outbox events yet. Register a patient or enter lab results to enqueue.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((ev) => (
                    <TableRow key={ev.outboxId}>
                      <TableCell className="font-mono text-xs">{ev.outboxId}</TableCell>
                      <TableCell>{ev.eventType}</TableCell>
                      <TableCell className="text-xs">
                        {ev.aggregateType}/{ev.aggregateId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ev.status === "failed" ? "destructive" : "outline"}>
                          {ev.status}
                        </Badge>
                        {ev.lastError ? (
                          <div className="mt-1 max-w-[220px] truncate text-[10px] text-muted-foreground">
                            {ev.lastError}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{ev.attempts}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={replaying === ev.outboxId}
                          onClick={() => void replayOne(ev.outboxId)}
                        >
                          {replaying === ev.outboxId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Replay"
                          )}
                        </Button>
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
