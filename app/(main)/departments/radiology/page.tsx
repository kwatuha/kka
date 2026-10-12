import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { RadiologyStats } from "@/components/radiology-stats"
import { RadiologyQuickActions } from "@/components/radiology-quick-actions"
import { PendingImagingRequests } from "@/components/pending-imaging-requests"
import { RecentImagingResults } from "@/components/recent-imaging-results"
import { RadiologyEquipmentStatus } from "@/components/radiology-equipment-status"

export const metadata: Metadata = {
  title: "Radiology Department | Kiplombe Medical Centre",
  description: "Radiology Department Dashboard for Kiplombe Medical Centre",
}

export default function RadiologyDepartmentPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced
        segments={[
          { title: "Departments", href: "/departments" },
          { title: "Radiology", href: "/departments/radiology" },
        ]}
        className="mb-4"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Radiology Department</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="imaging">Imaging Requests</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <RadiologyStats />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <RadiologyQuickActions />
            </div>
            <div className="col-span-3">
              <RecentImagingResults />
            </div>
          </div>
          <PendingImagingRequests />
        </TabsContent>

        <TabsContent value="imaging" className="space-y-4">
          <PendingImagingRequests />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <RecentImagingResults />
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <RadiologyEquipmentStatus />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed">
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-medium">Radiology Analytics</h3>
              <p className="mt-2 text-sm text-muted-foreground">Analytics dashboard coming soon</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
