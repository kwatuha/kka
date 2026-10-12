import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { MedicalRecordsStats } from "@/components/medical-records-stats"
import { MedicalRecordsQuickActions } from "@/components/medical-records-quick-actions"
import { PendingRecordCompletion } from "@/components/pending-record-completion"
import { RecentRecordActivities } from "@/components/recent-record-activities"

export const metadata: Metadata = {
  title: "Medical Records Department | Kiplombe Medical Centre",
  description: "Medical Records Department dashboard for Kiplombe Medical Centre",
}

export default function MedicalRecordsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced
        segments={[
          { title: "Departments", href: "/departments" },
          { title: "Medical Records", href: "/departments/medical-records" },
        ]}
        className="mb-4"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Medical Records Department</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="release">Release of Information</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
          <TabsTrigger value="audit">Audit & Compliance</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <MedicalRecordsStats />
          <MedicalRecordsQuickActions />
          <div className="grid gap-4 md:grid-cols-2">
            <PendingRecordCompletion />
            <RecentRecordActivities />
          </div>
        </TabsContent>
        <TabsContent value="records" className="space-y-4">
          <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Records Management</h2>
            <p className="text-muted-foreground">
              This section will contain tools for managing patient records, including search, creation, editing, and
              viewing of complete medical records.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="documents" className="space-y-4">
          <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Document Management</h2>
            <p className="text-muted-foreground">
              This section will contain tools for managing documents within patient records, including uploading,
              categorizing, and organizing medical documentation.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="release" className="space-y-4">
          <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Release of Information</h2>
            <p className="text-muted-foreground">
              This section will contain tools for managing requests for patient information, tracking releases, and
              ensuring proper authorization and documentation.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="archive" className="space-y-4">
          <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Records Archive</h2>
            <p className="text-muted-foreground">
              This section will contain tools for managing archived records, including retention policies, retrieval
              processes, and destruction protocols.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Audit & Compliance</h2>
            <p className="text-muted-foreground">
              This section will contain tools for auditing record access, ensuring compliance with regulations, and
              generating compliance reports.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
