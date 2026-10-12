"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, FlaskConical } from "lucide-react"
import { CriticalVitalsConfiguration } from "@/components/administration/critical-vitals-configuration"
import { CriticalLabRangesConfiguration } from "@/components/configuration/critical-lab-ranges-configuration"

export default function ConfigurationPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinical Configuration</h1>
        <p className="text-muted-foreground">
          Manage clinical configurations including critical value ranges, auto-completes, and system settings
        </p>
      </div>

      <Tabs defaultValue="critical-vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="critical-vitals" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Critical Vitals
          </TabsTrigger>
          <TabsTrigger value="critical-lab-ranges" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Critical Lab Ranges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical-vitals" className="space-y-4 mt-4">
          <CriticalVitalsConfiguration />
        </TabsContent>

        <TabsContent value="critical-lab-ranges" className="space-y-4 mt-4">
          <CriticalLabRangesConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  )
}

