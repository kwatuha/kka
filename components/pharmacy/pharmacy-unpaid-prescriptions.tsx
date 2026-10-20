"use client"

import { useCallback, useEffect, useState } from "react"
import { pharmacyApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Smartphone } from "lucide-react"
import { MpesaInvoicePayDialog } from "@/components/mpesa-invoice-pay-dialog"
import { format } from "date-fns"

function formatKes(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n)
}

export function PharmacyUnpaidPrescriptions() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payRow, setPayRow] = useState<any | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await pharmacyApi.getPrescriptionsAwaitingPayment(1, 100)
      setRows(data || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load unpaid prescriptions")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Ordered — awaiting payment</CardTitle>
            <CardDescription>
              Prescriptions billed but not yet paid. Collect at cashier or send an M-Pesa STK prompt — the pharmacy
              queue opens automatically when the invoice is paid.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
          {loading && !rows.length ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading unpaid prescriptions…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No unpaid prescriptions awaiting payment.
            </p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prescription</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const balance =
                      Number(row.invoiceBalance) > 0
                        ? Number(row.invoiceBalance)
                        : Math.max(
                            0,
                            Number(row.totalAmount || 0) - Number(row.paidAmount || 0)
                          )
                    return (
                      <TableRow key={row.prescriptionId}>
                        <TableCell>
                          <div className="font-mono text-xs">{row.prescriptionNumber}</div>
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            awaiting payment
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {row.firstName} {row.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{row.patientNumber}</div>
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-sm">
                          {row.medicationSummary || "—"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatKes(balance)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {row.prescriptionDate
                            ? format(new Date(row.prescriptionDate), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => setPayRow(row)}
                            title="M-Pesa STK"
                          >
                            <Smartphone className="h-4 w-4 mr-1" />
                            M-Pesa
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MpesaInvoicePayDialog
        open={!!payRow}
        onOpenChange={(open) => !open && setPayRow(null)}
        serviceOrder={
          payRow
            ? {
                kind: "pharmacy",
                orderNumber: payRow.prescriptionNumber,
                patientId: payRow.patientId,
                patientPhone: payRow.patientPhone,
                patientName: `${payRow.firstName || ""} ${payRow.lastName || ""}`.trim(),
              }
            : null
        }
        onPaid={() => void load()}
      />
    </div>
  )
}
