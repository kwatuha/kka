"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileCheck, FileText, FileClock, FileWarning } from "lucide-react"

export function MedicalRecordsStats() {
  // In a real application, this data would come from an API or database
  const stats = [
    {
      title: "Total Records",
      value: "12,847",
      description: "Active patient records",
      icon: FileText,
      change: "+124 this month",
      changeType: "increase",
    },
    {
      title: "Pending Completion",
      value: "43",
      description: "Records awaiting completion",
      icon: FileClock,
      change: "-12 since yesterday",
      changeType: "decrease",
    },
    {
      title: "Completed Today",
      value: "28",
      description: "Records completed today",
      icon: FileCheck,
      change: "+8 from yesterday",
      changeType: "increase",
    },
    {
      title: "Compliance Issues",
      value: "7",
      description: "Records with compliance flags",
      icon: FileWarning,
      change: "-3 this week",
      changeType: "decrease",
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
              <div className={`mt-2 text-xs ${stat.changeType === "increase" ? "text-green-600" : "text-red-600"}`}>
                {stat.change}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
