"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ArrowRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ServicePointSelector } from "@/components/service-point-selector"
import { FacilityUnitSelector } from "@/components/facility-unit-selector"
import { PharmacyStoreStatusPanel } from "@/components/pharmacy/store-status-panel"
import { useAuth } from "@/lib/auth/auth-context"

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
  /** Full pharmacy workbench (prescriptions, inventory, …) */
  workbench?: React.ReactNode
}

export function PharmacyDesk({ workbench }: Props) {
  const { user, currentBranch } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const staffName = user?.name || "Pharmacist"
  const tabParam = searchParams.get("tab")
  const activeDeskTab = !tabParam || tabParam === "queue" ? "queue" : "workbench"

  const setDeskTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "queue") {
      params.delete("tab")
    } else if (!params.get("tab") || params.get("tab") === "queue") {
      params.set("tab", "prescriptions")
    }
    const qs = params.toString()
    router.replace(qs ? `/pharmacy?${qs}` : "/pharmacy")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pharmacy desk</h1>
          <p className="text-muted-foreground">
            Call patients, dispense from the pharmacy queue
            {currentBranch?.branchName ? ` · ${currentBranch.branchName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FacilityUnitSelector mode="pharmacy" />
          <ServicePointSelector pointType="pharmacy" />
        </div>
      </div>

      <Tabs value={activeDeskTab} onValueChange={setDeskTab} className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="queue">Pharmacy queue</TabsTrigger>
          {workbench ? <TabsTrigger value="workbench">Dispense & inventory</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="queue" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/pharmacy?tab=prescriptions">
                Pending prescriptions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/pharmacy?tab=patients-by-drug">Patients by drug</Link>
            </Button>
          </div>

          <PharmacyStoreStatusPanel />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <CallPatientPanel servicePoint="pharmacy" staffName={staffName} counterNumber={1} />
            </div>
            <div className="lg:col-span-2">
              <QueueDisplay initialServicePoint="pharmacy" restrictToSingleServicePoint />
            </div>
          </div>
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
