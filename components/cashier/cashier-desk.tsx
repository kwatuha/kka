"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServicePointSelector } from "@/components/service-point-selector"
import { useAuth } from "@/lib/auth/auth-context"
import { CashierDailyReport } from "@/components/cashier/cashier-daily-report"

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

export function CashierDesk() {
  const { user } = useAuth()
  const staffName = user?.name || "Cashier"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cashier desk</h1>
          <p className="text-muted-foreground">
            Process the cashier queue and review today’s collections by payment mode, including waivers.
          </p>
        </div>
        <ServicePointSelector pointType="cashier" />
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue">Cashier queue</TabsTrigger>
          <TabsTrigger value="report">Today’s collections</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <CallPatientPanel servicePoint="cashier" staffName={staffName} counterNumber={1} />
            </div>
            <div className="lg:col-span-2">
              <QueueDisplay initialServicePoint="cashier" restrictToSingleServicePoint />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <CashierDailyReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
