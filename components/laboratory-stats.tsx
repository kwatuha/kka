"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Clock, FileCheck, ListChecks, VolumeIcon as Vial } from "lucide-react"

export function LaboratoryStats() {
  // In a real application, this data would come from an API
  const stats = [
    {
      title: "Pending Tests",
      value: "24",
      icon: ListChecks,
      description: "8 urgent",
      change: "+2 from yesterday",
      changeType: "increase" as const,
    },
    {
      title: "Completed Today",
      value: "47",
      icon: FileCheck,
      description: "12 abnormal results",
      change: "+5 from yesterday",
      changeType: "increase" as const,
    },
    {
      title: "Average TAT",
      value: "2.4h",
      icon: Clock,
      description: "Turnaround time",
      change: "-0.3h from yesterday",
      changeType: "decrease" as const,
    },
    {
      title: "Samples Collected",
      value: "32",
      icon: Vial,
      description: "5 awaiting collection",
      change: "Same as yesterday",
      changeType: "neutral" as const,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              <div
                className={`mt-2 flex items-center text-xs ${
                  stat.changeType === "increase"
                    ? "text-green-500"
                    : stat.changeType === "decrease"
                      ? "text-red-500"
                      : "text-gray-500"
                }`}
              >
                {stat.changeType === "increase" && <Activity className="mr-1 h-3 w-3" />}
                {stat.changeType === "decrease" && <Activity className="mr-1 h-3 w-3" />}
                {stat.change}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
