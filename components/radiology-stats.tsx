"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileImage, Users, Activity } from "lucide-react"

export function RadiologyStats() {
  // In a real application, this data would come from an API
  const stats = [
    {
      title: "Pending Imaging",
      value: "24",
      description: "Awaiting completion",
      icon: FileImage,
      trend: "+5% from yesterday",
      trendUp: true,
    },
    {
      title: "Completed Today",
      value: "18",
      description: "Imaging procedures",
      icon: Activity,
      trend: "+12% from yesterday",
      trendUp: true,
    },
    {
      title: "Average Wait Time",
      value: "42m",
      description: "For non-urgent imaging",
      icon: Clock,
      trend: "-8% from last week",
      trendUp: false,
    },
    {
      title: "Scheduled Today",
      value: "15",
      description: "Upcoming procedures",
      icon: Users,
      trend: "Same as yesterday",
      trendUp: null,
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
              {stat.trend && (
                <div
                  className={`mt-2 text-xs ${stat.trendUp ? "text-green-600" : stat.trendUp === false ? "text-red-600" : "text-gray-500"}`}
                >
                  {stat.trend}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
