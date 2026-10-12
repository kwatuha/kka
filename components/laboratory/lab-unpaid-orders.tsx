"use client"

import { useCallback, useEffect, useState } from "react"
import { laboratoryApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { useFacilityUnits } from "@/lib/hooks/use-facility-units"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Eye, CalendarClock, ArrowRightLeft, Smartphone } from "lucide-react"
import { MpesaInvoicePayDialog } from "@/components/mpesa-invoice-pay-dialog"
import { format } from "date-fns"
import { LabPatientClinicalContext } from "@/components/laboratory/lab-patient-clinical-context"
import { LabOrderActionDialog } from "@/components/laboratory/lab-order-action-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function LabUnpaidOrders() {
  const { currentBranch } = useAuth()
  const { currentLabId } = useFacilityUnits()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<any | null>(null)
  const [actionMode, setActionMode] = useState<"reschedule" | "refer" | null>(null)
  const [actionOrder, setActionOrder] = useState<any | null>(null)
  const [payOrder, setPayOrder] = useState<any | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await laboratoryApi.getOrders(
        undefined,
        "awaiting_payment",
        1,
        100,
        currentBranch?.branchId ? String(currentBranch.branchId) : undefined,
        currentLabId ? String(currentLabId) : undefined,
      )
      setOrders(data || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load unpaid lab orders")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [currentBranch?.branchId, currentLabId])

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
              Tests ordered but not yet paid. Collect at cashier or send an M-Pesa STK prompt — the lab queue opens
              automatically when the invoice is paid.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
          {loading && !orders.length ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading unpaid orders…
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No unpaid lab orders for this facility/lab.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell>
                        <div className="font-mono text-xs">{order.orderNumber}</div>
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          awaiting payment
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {order.firstName} {order.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{order.patientNumber}</div>
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate text-sm">
                        {order.testNames || "—"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {order.orderDate ? format(new Date(order.orderDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => setPayOrder(order)}
                            title="M-Pesa STK"
                          >
                            <Smartphone className="h-4 w-4 mr-1" />
                            M-Pesa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailOrder(order)}
                            title="Clinical context"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActionOrder(order)
                              setActionMode("reschedule")
                            }}
                            title="Reschedule"
                          >
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActionOrder(order)
                              setActionMode("refer")
                            }}
                            title="Refer to another lab"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailOrder?.firstName} {detailOrder?.lastName} — clinical context
            </DialogTitle>
            <DialogDescription>
              Order {detailOrder?.orderNumber}. Use allergies and recent meds before sampling or special procedures.
            </DialogDescription>
          </DialogHeader>
          {detailOrder ? <LabPatientClinicalContext orderId={detailOrder.orderId} /> : null}
        </DialogContent>
      </Dialog>

      <MpesaInvoicePayDialog
        open={!!payOrder}
        onOpenChange={(open) => !open && setPayOrder(null)}
        serviceOrder={
          payOrder
            ? {
                kind: "lab",
                orderNumber: payOrder.orderNumber,
                patientId: payOrder.patientId,
                patientName: `${payOrder.firstName || ""} ${payOrder.lastName || ""}`.trim(),
              }
            : null
        }
        onPaid={() => void load()}
      />

      <LabOrderActionDialog
        open={!!actionMode && !!actionOrder}
        onOpenChange={(open) => {
          if (!open) {
            setActionMode(null)
            setActionOrder(null)
          }
        }}
        mode={actionMode || "reschedule"}
        order={actionOrder}
        onDone={() => void load()}
      />
    </div>
  )
}
