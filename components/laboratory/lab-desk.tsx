"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServicePointSelector } from "@/components/service-point-selector"
import { FacilityUnitSelector } from "@/components/facility-unit-selector"
import { useAuth } from "@/lib/auth/auth-context"
import { LabUnpaidOrders } from "@/components/laboratory/lab-unpaid-orders"
import { LabCollectionsReport } from "@/components/laboratory/lab-collections-report"
import { LabResultsWorkbench } from "@/components/laboratory/lab-results-workbench"

const CallPatientPanel = dynamic(
  () => import("@/components/call-patient-panel").then((m) => m.CallPatientPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

const QueueDisplay = dynamic(
  () => import("@/components/queue-display").then((m) => m.QueueDisplay),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

type Props = {
  /** Optional extra workbench content (e.g. link to full laboratory page) */
  workbench?: ReactNode
  defaultTab?: string
}

export function LabDesk({ workbench, defaultTab = "results" }: Props) {
  const { user } = useAuth()
  const staffName = user?.name || "Lab technician"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laboratory desk</h1>
          <p className="text-muted-foreground">
            Enter results, manage the lab queue, unpaid orders, and collections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FacilityUnitSelector mode="laboratory" />
          <ServicePointSelector pointType="laboratory" />
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="results">Enter results</TabsTrigger>
          <TabsTrigger value="queue">Lab queue</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid orders</TabsTrigger>
          <TabsTrigger value="collections">Lab collections</TabsTrigger>
          {workbench ? <TabsTrigger value="workbench">More tools</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="results" className="mt-6">
          <LabResultsWorkbench />
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <CallPatientPanel servicePoint="laboratory" staffName={staffName} counterNumber={1} />
            </div>
            <div className="lg:col-span-2">
              <QueueDisplay initialServicePoint="laboratory" restrictToSingleServicePoint />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="unpaid" className="mt-6">
          <LabUnpaidOrders />
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          <LabCollectionsReport />
        </TabsContent>

        {workbench ? (
          <TabsContent value="workbench" className="mt-6">
            {workbench}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
