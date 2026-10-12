"use client"

import React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { MohReportsPanel } from "@/app/components/moh-reports-panel"
import {
  MOH_REGISTER_REPORTS,
  MOH_SUMMARY_REPORTS,
} from "@/lib/moh-reports-catalog"

export default function ReportsPage() {
  const formatKES = (value: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value)

  const overviewStats = [
    { title: "OPD visits (month)", value: "—", description: "Connect live HMIS counts" },
    { title: "Admissions", value: "—", description: "Inpatient" },
    { title: "Bed occupancy", value: "—", description: "Current average" },
  ]

  const monthlyVisits = [
    { month: "Apr", visits: 6200 },
    { month: "May", visits: 7100 },
    { month: "Jun", visits: 6800 },
    { month: "Jul", visits: 7400 },
    { month: "Aug", visits: 7900 },
    { month: "Sep", visits: 7200 },
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced segments={[{ title: "Reports", href: "/reports" }]} className="mb-2" />

      <div className="relative overflow-hidden rounded-xl border bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_45%,#f0fdf4_100%)] px-5 py-6 md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-[0.07] pointer-events-none hidden md:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,#065f46 0,#065f46 1px,transparent 1px,transparent 18px)",
          }}
        />
        <div className="relative max-w-2xl space-y-2">
          <Badge className="bg-emerald-800 hover:bg-emerald-800">Facility reporting</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Reports</h1>
          <p className="text-emerald-950/70 text-sm md:text-base">
            Generate Ministry of Health forms for KHIS and review facility activity. Start with the common
            MOH summaries required for facility reporting.
          </p>
        </div>
      </div>

      <Tabs defaultValue="moh" className="space-y-4">
        <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/60 p-1">
          <TabsTrigger
            value="moh"
            className="data-[state=active]:bg-emerald-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            MOH reports
          </TabsTrigger>
          <TabsTrigger
            value="registers"
            className="data-[state=active]:bg-emerald-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Registers
          </TabsTrigger>
          <TabsTrigger
            value="snapshot"
            className="data-[state=active]:bg-emerald-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Facility snapshot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moh" className="space-y-4">
          <MohReportsPanel
            reports={MOH_SUMMARY_REPORTS.filter((r) => !r.legacy)}
            initialCode="731"
            embedded
          />
        </TabsContent>

        <TabsContent value="registers" className="space-y-4">
          <MohReportsPanel reports={MOH_REGISTER_REPORTS} initialCode="204A" embedded />
        </TabsContent>

        <TabsContent value="snapshot" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            High-level facility view. Prefer live MOH forms above for official reporting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overviewStats.map((s) => (
              <Card key={s.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                  <CardDescription className="text-xs">{s.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visit trend (illustrative)</CardTitle>
              <CardDescription>Replace with live aggregates when wired</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyVisits}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => [v, "Visits"]} />
                  <Bar dataKey="visits" fill="#047857" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Demo revenue figure reference only: {formatKES(0)} live — use Finance reports for cash.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
