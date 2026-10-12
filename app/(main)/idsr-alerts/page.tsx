"use client"

import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { IdsrAlertsDesk } from "@/components/clinical/idsr-alerts-desk"
import { IhrCompliancePanel } from "@/components/clinical/ihr-compliance-panel"

export default function IdsrAlertsPage() {
  return (
    <div className="flex flex-col gap-4">
      <BreadcrumbsEnhanced
        items={[
          { label: "Home", href: "/" },
          { label: "IDSR alerts", href: "/idsr-alerts" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IDSR &amp; public health alerts</h1>
        <p className="text-muted-foreground">
          Review notifiable disease detections, acknowledge for audit, and prepare weekly export evidence.
        </p>
      </div>
      <IdsrAlertsDesk />
      <IhrCompliancePanel />
    </div>
  )
}
