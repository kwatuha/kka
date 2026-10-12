"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, RefreshCw, Smartphone } from "lucide-react"
import { billingApi, type MpesaRegisterResponse } from "@/lib/api"
import { format } from "date-fns"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import { toast } from "@/components/ui/use-toast"

type RegisterItem = MpesaRegisterResponse["items"][number]

const STATUS_OPTIONS = ["", "pending", "success", "applied", "failed"] as const

function statusVariant(status: string) {
  switch (status) {
    case "applied":
    case "success":
      return "default" as const
    case "pending":
      return "secondary" as const
    case "failed":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

function formatKes(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n)
}

export default function FinanceMpesaRegisterPage() {
  const [items, setItems] = useState<RegisterItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const limit = 50

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await billingApi.getMpesaRegister({
        page,
        limit,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (err: any) {
      toast({
        title: "Could not load M-Pesa register",
        description: err.message || "Request failed",
        variant: "destructive",
      })
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, status, from, to])

  useEffect(() => {
    void load()
  }, [load])

  const exportPayload = useMemo(
    () => () => ({
      headers: [
        "Date",
        "Status",
        "Amount (KES)",
        "Phone",
        "Paybill",
        "Account",
        "M-Pesa receipt",
        "Patient",
        "Checkout ID",
        "Applied",
      ],
      rows: items.map((r) => [
        r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm") : "",
        r.status,
        r.amount,
        r.phone,
        r.paybillNumber || "",
        r.accountReference || "",
        r.mpesaReceiptNumber || "",
        [r.patientFirstName, r.patientLastName].filter(Boolean).join(" ") ||
          r.patientNumber ||
          (r.patientId != null ? String(r.patientId) : ""),
        r.checkoutRequestId,
        r.appliedAt ? format(new Date(r.appliedAt), "yyyy-MM-dd HH:mm") : "",
      ]),
      numberColumns: [2],
      pdfTitle: "M-Pesa STK Register",
      pdfSubtitle: `Total sessions: ${total}${status ? ` · Status: ${status}` : ""}`,
      filenamePrefix: "mpesa-stk-register",
      pdfLandscape: true,
    }),
    [items, total, status]
  )

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
            <Link href="/finance">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Finance
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            M-Pesa register
          </h1>
          <p className="text-muted-foreground">
            STK push sessions reconciled to invoices. Configure Paybill under Administration → System Config.
          </p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu disabled={!items.length} getPayload={exportPayload} />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>{total} session(s) matching criteria</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={status || "all"} onValueChange={(v) => { setPage(1); setStatus(v === "all" ? "" : v) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUS_OPTIONS.filter(Boolean).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">From</span>
            <Input type="date" className="w-40" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">To</span>
            <Input type="date" className="w-40" value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading && !items.length ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No M-Pesa STK sessions in this period.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Paybill / Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.stkPaymentId}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatKes(r.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {[r.patientFirstName, r.patientLastName].filter(Boolean).join(" ") || "—"}
                        {r.patientNumber ? (
                          <div className="text-xs text-muted-foreground">{r.patientNumber}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.mpesaReceiptNumber || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.paybillNumber || "—"}
                        {r.accountReference ? ` / ${r.accountReference}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
