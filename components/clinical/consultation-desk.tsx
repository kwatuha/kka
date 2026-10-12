"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Loader2, Stethoscope, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ServicePointSelector } from "@/components/service-point-selector"
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

export function ConsultationDesk() {
  const { user, currentBranch } = useAuth()
  const staffName = user?.name || "Clinician"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-emerald-800" />
            Consultation desk
          </h1>
          <p className="text-muted-foreground">
            Call the next patient and document the encounter
            {currentBranch?.branchName ? ` · ${currentBranch.branchName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/patients">
              <Users className="mr-2 h-4 w-4" />
              Find patient
            </Link>
          </Button>
          <ServicePointSelector pointType="consultation" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CallPatientPanel servicePoint="consultation" staffName={staffName} counterNumber={1} />
        </div>
        <div className="lg:col-span-2">
          <QueueDisplay initialServicePoint="consultation" restrictToSingleServicePoint />
        </div>
      </div>
    </div>
  )
}
