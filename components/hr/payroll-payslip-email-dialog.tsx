"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { payrollApi } from "@/lib/api"
import { payslipPdfToBase64 } from "@/lib/payslip-pdf"

export type PayslipEmailRow = {
  payrollId: number
  employeeName: string
  payrollNumber: string
  email: string
  sendEmail: boolean
}

interface PayrollPayslipEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodLabel: string
  transactions: any[]
}

const TEST_EMAIL_STORAGE_KEY = "hmis-payroll-test-email"

export function PayrollPayslipEmailDialog({
  open,
  onOpenChange,
  periodLabel,
  transactions,
}: PayrollPayslipEmailDialogProps) {
  const [rows, setRows] = useState<PayslipEmailRow[]>([])
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubject(`Payslip — ${periodLabel}`)
    setMessage(`Please find your payslip for ${periodLabel} attached.`)
    if (typeof window !== "undefined") {
      setTestEmail(localStorage.getItem(TEST_EMAIL_STORAGE_KEY) || "")
    }
    setRows(
      transactions.map((t) => ({
        payrollId: t.payrollId,
        employeeName: t.employeeName || "Employee",
        payrollNumber: t.payrollNumber || "",
        email: String(t.email || "").trim(),
        sendEmail: Boolean(String(t.email || "").trim()),
      }))
    )
  }, [open, periodLabel, transactions])

  const selectedCount = useMemo(() => rows.filter((r) => r.sendEmail && r.email.trim()).length, [rows])

  const updateRow = (payrollId: number, patch: Partial<PayslipEmailRow>) => {
    setRows((prev) => prev.map((r) => (r.payrollId === payrollId ? { ...r, ...patch } : r)))
  }

  const applyTestEmailToSelected = () => {
    const e = testEmail.trim()
    if (!e) {
      toast({ title: "Enter a test email", variant: "destructive" })
      return
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(TEST_EMAIL_STORAGE_KEY, e)
    }
    setRows((prev) =>
      prev.map((r) => (r.sendEmail ? { ...r, email: e } : r))
    )
    toast({ title: "Test email applied", description: `Updated ${selectedCount} selected row(s).` })
  }

  const selectAll = (on: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, sendEmail: on })))
  }

  const handleSend = async () => {
    const toSend = rows.filter((r) => r.sendEmail)
    if (toSend.length === 0) {
      toast({ title: "No recipients", description: "Turn on “Email” for at least one employee.", variant: "destructive" })
      return
    }
    const missing = toSend.filter((r) => !r.email.trim())
    if (missing.length) {
      toast({
        title: "Missing email",
        description: `${missing.length} selected employee(s) have no email address.`,
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const items: { payrollId: number; email: string; send: boolean; pdfBase64: string }[] = []
      for (const row of toSend) {
        const full = await payrollApi.getTransaction(String(row.payrollId))
        const pdfBase64 = await payslipPdfToBase64(full)
        items.push({
          payrollId: row.payrollId,
          email: row.email.trim(),
          send: true,
          pdfBase64,
        })
      }

      const result = await payrollApi.emailPayslipsBulk({
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
        items,
      })

      if (result.failed > 0 && result.sent === 0) {
        toast({
          title: "Email failed",
          description: result.results?.[0]?.error || "Check SMTP settings on the server.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Payslips emailed",
        description: `${result.sent} sent${result.failed ? `, ${result.failed} failed` : ""}.`,
      })
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: "Could not send payslips", description: e.message, variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email payslips
          </DialogTitle>
          <DialogDescription>
            PDF payslips are generated and sent via facility SMTP. Edit addresses for test staff; use the switch to
            include or skip each person.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 shrink-0">
          <div className="space-y-2">
            <Label htmlFor="payslip-subject">Subject</Label>
            <Input id="payslip-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payslip-test-email">Test email (apply to selected)</Label>
            <div className="flex gap-2">
              <Input
                id="payslip-test-email"
                type="email"
                placeholder="you@company.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={applyTestEmailToSelected}>
                Apply
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2 shrink-0">
          <Label htmlFor="payslip-message">Message</Label>
          <Textarea id="payslip-message" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2 shrink-0 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={() => selectAll(true)}>
            Select all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => selectAll(false)}>
            Clear all
          </Button>
          <span className="text-muted-foreground self-center ml-auto">
            {selectedCount} of {rows.length} to email
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No payroll transactions for this period. Change the month/year above or post a month-end batch, then try
              again.
            </p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">Email</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Payroll #</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.payrollId}>
                  <TableCell>
                    <Switch
                      checked={row.sendEmail}
                      onCheckedChange={(c) => updateRow(row.payrollId, { sendEmail: c === true })}
                      aria-label={`Email payslip to ${row.employeeName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.payrollNumber}</TableCell>
                  <TableCell>
                    <Input
                      type="email"
                      className="h-8"
                      placeholder="employee@email.com"
                      value={row.email}
                      onChange={(e) => updateRow(row.payrollId, { email: e.target.value })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || selectedCount === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Send {selectedCount} payslip{selectedCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
