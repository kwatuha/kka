import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { NursingStats } from "@/components/nursing-stats"
import { NursingQuickActions } from "@/components/nursing-quick-actions"
import { PatientCareTasks } from "@/components/patient-care-tasks"
import { WardOccupancy } from "@/components/ward-occupancy"
import { ShiftSchedule } from "@/components/shift-schedule"
import { NurseWardAssignments } from "@/components/nurse-ward-assignments"
import { NursePickupRequests } from "@/components/nurse-pickup-requests"

export const metadata: Metadata = {
  title: "Nursing Department | Kiplombe Medical Centre",
  description: "Nursing Department Dashboard for Kiplombe Medical Centre",
}

export default function NursingDepartmentPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced
        segments={[
          { title: "Departments", href: "/departments" },
          { title: "Nursing", href: "/departments/nursing" },
        ]}
        className="mb-4"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nursing Department</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tasks">Patient Care</TabsTrigger>
          <TabsTrigger value="medications">Drug Pickup Requests</TabsTrigger>
          <TabsTrigger value="wards">Ward Management</TabsTrigger>
          <TabsTrigger value="staff">Staff Schedule</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <NursingStats />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <NursingQuickActions />
            </div>
            <div className="col-span-3">
              <WardOccupancy />
            </div>
          </div>
          <PatientCareTasks />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <PatientCareTasks />
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <NursePickupRequests />
        </TabsContent>

        <TabsContent value="wards" className="space-y-4">
          <Tabs defaultValue="occupancy" className="space-y-4">
            <TabsList>
              <TabsTrigger value="occupancy">Ward Occupancy</TabsTrigger>
              <TabsTrigger value="assignments">Nurse Assignments</TabsTrigger>
            </TabsList>
            <TabsContent value="occupancy">
              <WardOccupancy />
            </TabsContent>
            <TabsContent value="assignments">
              <NurseWardAssignments />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <ShiftSchedule />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed">
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-medium">Nursing Reports</h3>
              <p className="mt-2 text-sm text-muted-foreground">Reports dashboard coming soon</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
