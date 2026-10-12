"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, Printer } from "lucide-react"
import { downloadPayslipPdf } from "@/lib/payslip-pdf"
import { useState } from "react"

function kes(n: number | string | undefined) {
  return `KES ${parseFloat(String(n || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | undefined) {
  if (!d) return "—"
  return d.split("T")[0]
}

interface PayrollPayslipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payroll: any | null
}

export function PayrollPayslipDialog({ open, onOpenChange, payroll }: PayrollPayslipDialogProps) {
  const [pdfLoading, setPdfLoading] = useState(false)
  if (!payroll) return null

  const totalStatutory =
    parseFloat(payroll.tax || 0) +
    parseFloat(payroll.nssf || 0) +
    parseFloat(payroll.nhif || 0) +
    parseFloat(payroll.otherDeductions || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg print:max-w-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Payslip — {payroll.payrollNumber}</DialogTitle>
        </DialogHeader>
        <div id="payslip-print" className="space-y-4 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-base">{payroll.employeeName}</p>
              <p className="text-muted-foreground">{payroll.employeeNumber}</p>
              {payroll.departmentName && <p className="text-muted-foreground">{payroll.departmentName}</p>}
            </div>
            <div className="text-right text-muted-foreground">
              <p>Period: {fmtDate(payroll.payPeriodStart)} – {fmtDate(payroll.payPeriodEnd)}</p>
              <p>Pay date: {fmtDate(payroll.paymentDate)}</p>
              <p className="capitalize">Status: {payroll.paymentStatus}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <span>Base salary</span>
            <span className="text-right">{kes(payroll.baseSalary)}</span>
            <span>Allowances</span>
            <span className="text-right">{kes(payroll.allowances)}</span>
            <span>Overtime</span>
            <span className="text-right">{kes(payroll.overtime)}</span>
            <span>Bonuses</span>
            <span className="text-right">{kes(payroll.bonuses)}</span>
            <span className="font-medium">Gross pay</span>
            <span className="text-right font-medium">{kes(payroll.grossSalary)}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>PAYE</span>
            <span className="text-right">{kes(payroll.tax)}</span>
            <span>NSSF</span>
            <span className="text-right">{kes(payroll.nssf)}</span>
            <span>SHA (SHIF)</span>
            <span className="text-right">{kes(payroll.nhif)}</span>
            <span>Housing levy & other</span>
            <span className="text-right">{kes(payroll.otherDeductions)}</span>
            <span>Other deductions</span>
            <span className="text-right">{kes(payroll.deductions)}</span>
            <span>Total deductions</span>
            <span className="text-right">{kes(totalStatutory + parseFloat(payroll.deductions || 0))}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Net pay</span>
            <span>{kes(payroll.netSalary)}</span>
          </div>
          {(payroll.bankName || payroll.bankAccount) && (
            <>
              <Separator />
              <p className="text-muted-foreground">
                Bank: {payroll.bankName || "—"} · {payroll.bankAccount || "—"}
                {payroll.bankBranch ? ` (${payroll.bankBranch})` : ""}
              </p>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            disabled={pdfLoading}
            onClick={async () => {
              try {
                setPdfLoading(true)
                await downloadPayslipPdf(payroll)
              } finally {
                setPdfLoading(false)
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={() => {
              window.print()
            }}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
