"use client"

import { useCallback, useEffect, useState } from "react"
import { billingApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, Banknote, FileMinus2 } from "lucide-react"
import { format } from "date-fns"

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

export function CashierDailyReport() {
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
      console.error(err)
      setError(err?.message || "Failed to load daily collections")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="cashier-report-date">Report date</Label>
          <Input
            id="cashier-report-date"
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
          Loading collections…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Collected</CardDescription>
                <CardTitle className="text-2xl">{money(summary.collectedTotal)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {summary.paymentCount} payment{summary.paymentCount === 1 ? "" : "s"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Waived</CardDescription>
                <CardTitle className="text-2xl">{money(summary.waivedTotal)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {summary.waiverCount} approved waiver{summary.waiverCount === 1 ? "" : "s"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Handled total</CardDescription>
                <CardTitle className="text-2xl">
                  {money(summary.collectedTotal + summary.waivedTotal)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Collections + waivers for {summary.date}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5" />
                By payment mode
              </CardTitle>
              <CardDescription>Cash, M-Pesa, card, insurance, and bank receipts for the day</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.byPaymentMethod.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded for this date.</p>
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
                    {summary.byPaymentMethod.map((row) => (
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
              <CardTitle className="text-lg">Payments detail</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment lines for this date.</p>
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
                      {summary.payments.map((p) => (
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileMinus2 className="h-5 w-5" />
                Approved waivers
              </CardTitle>
              <CardDescription>Charges covered by waiver (not collected as cash)</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.waivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved waivers for this date.</p>
              ) : (
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Waived</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.waivers.map((w) => (
                        <TableRow key={w.waiverId}>
                          <TableCell>
                            <div className="font-medium">
                              {w.patientFirstName} {w.patientLastName}
                            </div>
                            <div className="text-xs text-muted-foreground">{w.patientNumber}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{w.invoiceNumber || w.waiverNumber}</TableCell>
                          <TableCell>
                            <div>{w.waiverTypeName}</div>
                            <div className="text-xs capitalize text-muted-foreground">{w.responsibility}</div>
                          </TableCell>
                          <TableCell className="text-right">{money(w.waivedAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
