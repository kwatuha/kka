"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, ListChecks, Microscope, PlusCircle, Printer, VolumeIcon as Vial } from "lucide-react"

export function LaboratoryQuickActions() {
  const actions = [
    {
      title: "Record Test Results",
      icon: FileText,
      description: "Enter results for completed tests",
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Collect Samples",
      icon: Vial,
      description: "Manage sample collection",
      color: "bg-green-100 text-green-700",
    },
    {
      title: "View Test Queue",
      icon: ListChecks,
      description: "See all pending tests",
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "Print Labels",
      icon: Printer,
      description: "Print sample labels",
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "Equipment Status",
      icon: Microscope,
      description: "Check equipment status",
      color: "bg-red-100 text-red-700",
    },
    {
      title: "Add New Test",
      icon: PlusCircle,
      description: "Create a new test request",
      color: "bg-teal-100 text-teal-700",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common laboratory tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-accent"
            >
              <div className={`p-2 rounded-full ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium">{action.title}</div>
              <div className="text-xs text-muted-foreground text-center">{action.description}</div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
