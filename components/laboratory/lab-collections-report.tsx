"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { billingApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, FlaskConical } from "lucide-react"
import { format } from "date-fns"
import { onLabBillingUpdated } from "@/lib/lab-billing-events"

function money(amount: number | string | null | undefined) {
  const n = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0)
  return `KES ${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function methodLabel(method: string) {
  const m = String(method || "cash").toLowerCase()
  if (m === "mpesa") return "M-Pesa"
  if (m === "card") return "Card"
  if (m === "insurance") return "Insurance"
  if (m === "bank") return "Bank transfer"
  if (m === "cash") return "Cash"
  return method || "Other"
}

function nairobiToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function isLabPayment(row: any) {
  if (row?.isLabInvoice === 1 || row?.isLabInvoice === true) return true
  const notes = String(row?.notes || "")
  if (/lab payment/i.test(notes) || /lab test/i.test(notes) || /laboratory/i.test(notes)) {
    return true
  }
  const items = row?.items
  if (Array.isArray(items) && items.some((it: { description?: string }) => /lab test:/i.test(String(it.description || "")))) {
    return true
  }
  return false
}

export function LabCollectionsReport() {
  const [date, setDate] = useState(() => nairobiToday())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof billingApi.getCashierDailySummary>> | null>(
    null
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await billingApi.getCashierDailySummary(date)
      setSummary(data)
    } catch (err: any) {
      setError(err?.message || "Failed to load lab collections")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => onLabBillingUpdated(() => void load()), [load])

  const labPayments = useMemo(
    () => (summary?.payments || []).filter(isLabPayment),
    [summary]
  )

  const byMethod = useMemo(() => {
    const map = new Map<string, { paymentMethod: string; count: number; total: number }>()
    for (const row of labPayments) {
      const method = String(row.paymentMethod || "cash").toLowerCase() || "cash"
      const amount = parseFloat(row.paidAmount || 0) || 0
      const existing = map.get(method) || { paymentMethod: method, count: 0, total: 0 }
      existing.count += 1
      existing.total += amount
      map.set(method, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [labPayments])

  const collectedTotal = labPayments.reduce((sum, p) => sum + (parseFloat(p.paidAmount || 0) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="lab-collections-date">Report date</Label>
          <Input
            id="lab-collections-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {loading && !summary ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading lab collections…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Lab collections</CardDescription>
                <CardTitle className="text-2xl">{money(collectedTotal)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {labPayments.length} lab payment{labPayments.length === 1 ? "" : "s"} on {date}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Payment modes</CardDescription>
                <CardTitle className="text-2xl">{byMethod.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Distinct modes used for lab invoices today
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="h-5 w-5" />
                By payment mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byMethod.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lab payments for this date.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byMethod.map((row) => (
                      <TableRow key={row.paymentMethod}>
                        <TableCell className="font-medium">{methodLabel(row.paymentMethod)}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{money(row.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lab payment detail</CardTitle>
            </CardHeader>
            <CardContent>
              {labPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lab invoice payments for this date.</p>
              ) : (
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labPayments.map((p) => (
                        <TableRow key={p.invoiceId}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {p.paidAt ? format(new Date(p.paidAt), "HH:mm") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {p.patientFirstName} {p.patientLastName}
                            </div>
                            <div className="text-xs text-muted-foreground">{p.patientNumber}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{methodLabel(p.paymentMethod)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{money(p.paidAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
