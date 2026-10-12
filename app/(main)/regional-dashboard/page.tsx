import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RegionalMap } from "@/components/regional-map"
import { RegionalPerformance } from "@/components/regional-performance"
import { RegionalActivity } from "@/components/regional-activity"
import { RegionalStats } from "@/components/regional-stats"

export default function RegionalDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regional Dashboard</h1>
        <p className="text-muted-foreground">Performance metrics across hospital locations in Kenya</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Hospital Locations</CardTitle>
            <CardDescription>Interactive map of Kiplombe Medical Centre branches</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Suspense fallback={<div className="h-[500px] flex items-center justify-center">Loading map...</div>}>
              <RegionalMap />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Statistics</CardTitle>
            <CardDescription>Key metrics by location</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded-md" />}>
              <RegionalStats />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
            <CardDescription>Revenue and patient metrics by location</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
              </TabsList>
              <TabsContent value="revenue" className="space-y-4 mt-4">
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded-md" />}>
                  <RegionalPerformance metric="revenue" />
                </Suspense>
              </TabsContent>
              <TabsContent value="patients" className="space-y-4 mt-4">
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded-md" />}>
                  <RegionalPerformance metric="patients" />
                </Suspense>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live payment and admission events</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded-md" />}>
              <RegionalActivity />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
