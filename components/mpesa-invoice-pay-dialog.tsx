"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Smartphone } from "lucide-react"
import { billingApi, patientApi, type MpesaPublicConfig } from "@/lib/api"
import { MpesaPaybillHint } from "@/components/mpesa-paybill-hint"
import { pollMpesaStkStatus, startMpesaStkPayment } from "@/lib/mpesa-stk"
import { toast } from "@/components/ui/use-toast"

export type ServiceOrderPayTarget = {
  kind: "lab" | "radiology" | "pharmacy"
  orderNumber: string
  patientId: number
  patientPhone?: string | null
  patientName?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Resolve invoice from lab/radiology order number */
  serviceOrder?: ServiceOrderPayTarget | null
  /** Or pay a known invoice directly */
  invoice?: {
    invoiceId: number
    invoiceNumber: string
    balance: number
    patientId: number
    patientPhone?: string | null
  } | null
  onPaid?: () => void
}

function formatKes(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n)
}

export function MpesaInvoicePayDialog({
  open,
  onOpenChange,
  serviceOrder,
  invoice: invoiceProp,
  onPaid,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState<any | null>(null)
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [mpesaConfig, setMpesaConfig] = useState<MpesaPublicConfig | null>(null)
  const [stkMessage, setStkMessage] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const balance = useMemo(() => {
    if (!invoice) return 0
    const b = Number(invoice.balance)
    if (Number.isFinite(b) && b > 0) return b
    const total = Number(invoice.totalAmount || 0)
    const paid = Number(invoice.paidAmount || 0)
    return Math.max(0, total - paid)
  }, [invoice])

  useEffect(() => {
    if (!open) {
      setInvoice(null)
      setStkMessage(null)
      setMpesaConfig(null)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        let inv = invoiceProp
        if (!inv && serviceOrder) {
          const row = await billingApi.getInvoiceForServiceOrder(
            serviceOrder.kind,
            serviceOrder.orderNumber
          )
          inv = {
            invoiceId: row.invoiceId,
            invoiceNumber: row.invoiceNumber,
            balance: row.balance,
            patientId: row.patientId,
            patientPhone: row.patientPhone,
          }
          setInvoice(row)
        } else if (inv) {
          setInvoice(inv)
        } else {
          setInvoice(null)
        }

        const phone =
          serviceOrder?.patientPhone ||
          invoiceProp?.patientPhone ||
          (inv as any)?.patientPhone ||
          null
        if (phone) setMpesaPhone(String(phone))
        else if (inv?.patientId) {
          try {
            const p = await patientApi.getById(String(inv.patientId))
            if (p?.phone) setMpesaPhone(String(p.phone))
          } catch {
            /* ignore */
          }
        }

        const cfgPatientId = inv?.patientId ?? serviceOrder?.patientId
        const cfgInvoiceNumber = inv?.invoiceNumber
        const cfg = await billingApi.getMpesaConfig({
          patientId: cfgPatientId,
          invoiceNumber: cfgInvoiceNumber,
        })
        setMpesaConfig(cfg)
      } catch (err: any) {
        toast({
          title: "Could not load invoice",
          description: err.message || "No bill found for this order",
          variant: "destructive",
        })
        onOpenChange(false)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open, serviceOrder, invoiceProp, onOpenChange])

  const title =
    serviceOrder?.patientName ||
    (invoice?.patientFirstName
      ? `${invoice.patientFirstName} ${invoice.patientLastName || ""}`.trim()
      : "M-Pesa payment")

  const handlePay = async () => {
    if (!invoice || balance <= 0) return
    if (!mpesaPhone.trim()) {
      toast({ title: "Phone required", description: "Enter Safaricom number for STK", variant: "destructive" })
      return
    }
    try {
      setPaying(true)
      setStkMessage("Sending M-Pesa prompt…")
      const { checkoutRequestId, message } = await startMpesaStkPayment({
        amount: balance,
        phone: mpesaPhone.trim(),
        patientId: invoice.patientId,
        allocations: [
          {
            invoiceId: invoice.invoiceId,
            amount: balance,
            invoiceNumber: invoice.invoiceNumber,
          },
        ],
      })
      setStkMessage(message || "Waiting for PIN on phone…")
      const result = await pollMpesaStkStatus(checkoutRequestId, {
        onTick: (s) => {
          if (s.status === "pending") setStkMessage("Waiting for M-Pesa confirmation…")
        },
      })
      if (result.status === "failed") {
        toast({
          title: "Payment not completed",
          description: result.resultDesc || "Cancelled or failed",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Payment received",
        description: result.mpesaReceiptNumber
          ? `Receipt ${result.mpesaReceiptNumber}. Patient can proceed to service.`
          : "Invoice paid. Patient can proceed to service.",
      })
      onPaid?.()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "M-Pesa failed",
        description: err.message || "STK could not be completed",
        variant: "destructive",
      })
    } finally {
      setPaying(false)
      setStkMessage(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay with M-Pesa</DialogTitle>
          <DialogDescription>
            {serviceOrder
              ? `${
                  serviceOrder.kind === "lab"
                    ? "Laboratory"
                    : serviceOrder.kind === "pharmacy"
                      ? "Pharmacy"
                      : "Radiology"
                } ${serviceOrder.kind === "pharmacy" ? "prescription" : "order"} ${serviceOrder.orderNumber}`
              : invoice
                ? `Invoice ${invoice.invoiceNumber}`
                : "Collect payment before service"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading bill…
          </div>
        ) : invoice ? (
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{title}</div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Amount due</span>
                <span className="font-semibold">{formatKes(balance)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Invoice {invoice.invoiceNumber}</div>
            </div>

            <MpesaPaybillHint config={mpesaConfig} accountReference={mpesaConfig?.accountReferenceExample} />

            <div className="space-y-2">
              <Label htmlFor="mpesaPayPhone">Patient phone (STK)</Label>
              <Input
                id="mpesaPayPhone"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                disabled={paying}
              />
              {stkMessage ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  {stkMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={paying}>
            Cancel
          </Button>
          <Button onClick={() => void handlePay()} disabled={paying || loading || !invoice || balance <= 0}>
            {paying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting…
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Send prompt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
