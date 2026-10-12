"use client"

import { BillWaiverManagement } from "@/components/administration/bill-waiver-management"

export default function BillWaiversPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bill Waivers</h1>
        <p className="text-muted-foreground">
          Manage patient bill waivers, approvals, and waiver types
        </p>
      </div>
      <BillWaiverManagement />
    </div>
  )
}



