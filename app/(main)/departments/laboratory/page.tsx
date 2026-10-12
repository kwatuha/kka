import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { LaboratoryStats } from "@/components/laboratory-stats"
import { PendingTestRequests } from "@/components/pending-test-requests"
import { RecentTestResults } from "@/components/recent-test-results"
import { LaboratoryQuickActions } from "@/components/laboratory-quick-actions"
import { LaboratoryInventory } from "@/components/laboratory-inventory"

export const metadata: Metadata = {
  title: "Laboratory Department | Kiplombe Medical Centre",
  description: "Laboratory Department dashboard for managing test requests and results",
}

export default function LaboratoryDepartmentPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced
        segments={[
          { title: "Departments", href: "/departments" },
          { title: "Laboratory", href: "/departments/laboratory" },
        ]}
        className="mb-4"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Laboratory Department</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tests">Test Management</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <LaboratoryStats />
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <PendingTestRequests />
            <div className="space-y-4">
              <LaboratoryQuickActions />
              <LaboratoryInventory />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <PendingTestRequests />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <RecentTestResults />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <LaboratoryInventory />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="rounded-lg border p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Laboratory Analytics</h2>
            <p className="text-muted-foreground">
              Analytics dashboard is under development. Check back soon for detailed laboratory performance metrics.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
