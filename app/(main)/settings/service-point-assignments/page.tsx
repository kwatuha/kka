"use client"

import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { ServicePointAssignments } from "@/components/service-point-assignments"

export default function ServicePointAssignmentsSettingsPage() {
  return (
    <div className="space-y-6">
      <BreadcrumbsEnhanced />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff desk assignments</h1>
        <p className="text-muted-foreground">
          Control which queue stations each staff member can work from.
        </p>
      </div>
      <ServicePointAssignments />
    </div>
  )
}
