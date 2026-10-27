"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Shield, Key, Settings, Share2 } from "lucide-react"
import { UsersManagement } from "@/components/administration/users-management"
import { RolesManagement } from "@/components/administration/roles-management"
import { PrivilegesManagement } from "@/components/administration/privileges-management"
import { SystemConfiguration } from "@/components/administration/system-configuration"
import { MpesaSettingsPanel } from "@/components/administration/mpesa-settings-panel"
import { IntegrationOutboxPanel } from "@/components/administration/integration-outbox-panel"
import { AuditLogPanel } from "@/components/administration/audit-log-panel"
import { BreakGlassReportPanel } from "@/components/administration/break-glass-report-panel"
import { IntegrationRunbookPanel } from "@/components/administration/integration-runbook-panel"
import { IntegrationProcessBanner } from "@/components/administration/integration-process-banner"
import { AfyaConnectCoveragePanel } from "@/components/administration/afyaconnect-coverage-panel"
import { HieSmokeRecorderPanel } from "@/components/administration/hie-smoke-recorder-panel"
import { NationalIntegrationsPanel } from "@/components/administration/national-integrations-panel"
import { FhirExchangePanel } from "@/components/administration/fhir-exchange-panel"
import { ReportingClaimsPanel } from "@/components/administration/reporting-claims-panel"
import { EvidencePackPanel } from "@/components/administration/evidence-pack-panel"
import { AttestationProductGapPanel } from "@/components/administration/attestation-product-gap-panel"
import { DhaDemoWizardPanel } from "@/components/administration/dha-demo-wizard-panel"
import { DataExchangeHub } from "@/components/administration/data-exchange-hub"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { showComplianceAdminTooling } from "@/lib/show-compliance-admin-ui"

export default function AdministrationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const [tab, setTab] = useState(
    tabParam === "data-exchange" || tabParam === "system" || tabParam === "roles" || tabParam === "privileges"
      ? tabParam
      : "users"
  )

  useEffect(() => {
    if (tabParam && ["users", "roles", "privileges", "system", "data-exchange"].includes(tabParam)) {
      setTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    // Deep-link hash scroll for adapter panels (e.g. /administration?tab=system#fhir-exchange)
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : ""
    if (!hash) return
    if (!["users", "roles", "privileges", "data-exchange"].includes(hash)) {
      setTab("system")
    }
    const tryScroll = (attempt = 0) => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      if (attempt < 8) window.setTimeout(() => tryScroll(attempt + 1), 120)
    }
    const t = window.setTimeout(() => tryScroll(), 200)
    return () => window.clearTimeout(t)
  }, [tab, tabParam])

  const onTabChange = (value: string) => {
    setTab(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === "users") params.delete("tab")
    else params.set("tab", value)
    const qs = params.toString()
    router.replace(qs ? `/administration?${qs}` : "/administration")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">
            Manage users, roles, privileges, system configuration, and data exchange
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/data-exchange">
            <Share2 className="mr-2 h-4 w-4" />
            Open Data Exchange
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="privileges" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Privileges
          </TabsTrigger>
          <TabsTrigger value="data-exchange" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Data Exchange
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <RolesManagement />
        </TabsContent>

        <TabsContent value="privileges" className="space-y-4 mt-4">
          <PrivilegesManagement />
        </TabsContent>

        <TabsContent value="data-exchange" className="space-y-4 mt-4">
          <DataExchangeHub />
        </TabsContent>

        <TabsContent value="system" className="space-y-4 mt-4">
          <IntegrationProcessBanner />
          <AfyaConnectCoveragePanel />
          <NationalIntegrationsPanel />
          <HieSmokeRecorderPanel />
          <AttestationProductGapPanel />
          <SystemConfiguration />
          <MpesaSettingsPanel />
          <FhirExchangePanel />
          <ReportingClaimsPanel />
          {showComplianceAdminTooling() ? (
            <>
              <DhaDemoWizardPanel />
              <EvidencePackPanel />
            </>
          ) : null}
          <AuditLogPanel />
          <BreakGlassReportPanel />
          <IntegrationRunbookPanel />
          <IntegrationOutboxPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
