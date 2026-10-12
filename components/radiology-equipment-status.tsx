"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Clock, Settings, AlertTriangle } from "lucide-react"

export function RadiologyEquipmentStatus() {
  // In a real application, this data would come from an API
  const equipment = [
    {
      id: "eq-001",
      name: "CT Scanner",
      model: "Siemens SOMATOM Force",
      location: "Room 101",
      status: "operational",
      maintenanceDate: "2023-12-15",
      utilizationToday: 68,
      nextScheduled: "Today, 2:30 PM",
    },
    {
      id: "eq-002",
      name: "MRI Machine",
      model: "GE Healthcare SIGNA Pioneer",
      location: "Room 102",
      status: "maintenance",
      maintenanceDate: "2023-10-05",
      utilizationToday: 0,
      nextScheduled: "Unavailable",
    },
    {
      id: "eq-003",
      name: "X-Ray Machine",
      model: "Philips DigitalDiagnost C90",
      location: "Room 103",
      status: "operational",
      maintenanceDate: "2024-01-10",
      utilizationToday: 42,
      nextScheduled: "Today, 11:45 AM",
    },
    {
      id: "eq-004",
      name: "Ultrasound",
      model: "Samsung RS85 Prestige",
      location: "Room 104",
      status: "operational",
      maintenanceDate: "2023-11-20",
      utilizationToday: 75,
      nextScheduled: "Today, 12:15 PM",
    },
    {
      id: "eq-005",
      name: "Mammography",
      model: "Hologic 3Dimensions",
      location: "Room 105",
      status: "attention",
      maintenanceDate: "2023-10-30",
      utilizationToday: 35,
      nextScheduled: "Today, 3:00 PM",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Operational
          </Badge>
        )
      case "maintenance":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
            <Settings className="mr-1 h-3 w-3" />
            Maintenance
          </Badge>
        )
      case "attention":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Needs Attention
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 80) return "bg-red-500"
    if (percentage >= 60) return "bg-amber-500"
    return "bg-green-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Status</CardTitle>
        <CardDescription>Monitor radiology equipment availability and maintenance</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>
          <TabsContent value="status">
            <div className="space-y-4">
              {equipment.map((item) => (
                <div key={item.id} className="flex flex-col space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{item.name}</div>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.model}</div>
                  <div className="text-xs text-muted-foreground">Location: {item.location}</div>
                  {item.status === "operational" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Today's Utilization</span>
                        <span>{item.utilizationToday}%</span>
                      </div>
                      <Progress value={item.utilizationToday} className={getUtilizationColor(item.utilizationToday)} />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      Next: {item.nextScheduled}
                    </div>
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="schedule">
            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
              <div className="flex flex-col items-center justify-center text-center">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Equipment Schedule</h3>
                <p className="mt-2 text-sm text-muted-foreground">View and manage equipment scheduling</p>
                <Button className="mt-4">View Schedule</Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="maintenance">
            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
              <div className="flex flex-col items-center justify-center text-center">
                <Settings className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Maintenance Records</h3>
                <p className="mt-2 text-sm text-muted-foreground">View and schedule equipment maintenance</p>
                <Button className="mt-4">View Maintenance</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
