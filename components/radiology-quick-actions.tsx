"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileImage, Calendar, Upload, Clock, CheckCircle2, Settings, Users, BarChart } from "lucide-react"

export function RadiologyQuickActions() {
  const actions = [
    {
      title: "Record Results",
      description: "Enter imaging findings",
      icon: CheckCircle2,
      color: "text-green-500",
      onClick: () => console.log("Record Results clicked"),
    },
    {
      title: "Schedule Procedure",
      description: "Book imaging appointment",
      icon: Calendar,
      color: "text-blue-500",
      onClick: () => console.log("Schedule Procedure clicked"),
    },
    {
      title: "Upload Images",
      description: "Import external images",
      icon: Upload,
      color: "text-purple-500",
      onClick: () => console.log("Upload Images clicked"),
    },
    {
      title: "View Schedule",
      description: "Today's appointments",
      icon: Clock,
      color: "text-amber-500",
      onClick: () => console.log("View Schedule clicked"),
    },
    {
      title: "Equipment Status",
      description: "Check availability",
      icon: Settings,
      color: "text-slate-500",
      onClick: () => console.log("Equipment Status clicked"),
    },
    {
      title: "Staff Assignments",
      description: "View technician schedule",
      icon: Users,
      color: "text-indigo-500",
      onClick: () => console.log("Staff Assignments clicked"),
    },
    {
      title: "Department Analytics",
      description: "View performance metrics",
      icon: BarChart,
      color: "text-cyan-500",
      onClick: () => console.log("Department Analytics clicked"),
    },
    {
      title: "New Imaging Request",
      description: "Create manual request",
      icon: FileImage,
      color: "text-red-500",
      onClick: () => console.log("New Imaging Request clicked"),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common radiology tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="flex h-24 flex-col items-center justify-center gap-1 p-2"
              onClick={action.onClick}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-sm font-medium">{action.title}</span>
              <span className="text-xs text-muted-foreground">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
