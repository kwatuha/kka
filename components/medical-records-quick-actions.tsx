"use client"

import { PlusCircle, Search, FileUp, FileDown, FileCog, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MedicalRecordsQuickActions() {
  const actions = [
    {
      title: "Search Records",
      description: "Find patient records",
      icon: Search,
      action: () => console.log("Search records"),
    },
    {
      title: "New Record",
      description: "Create a new record",
      icon: PlusCircle,
      action: () => console.log("New record"),
    },
    {
      title: "Upload Documents",
      description: "Add documents to records",
      icon: FileUp,
      action: () => console.log("Upload documents"),
    },
    {
      title: "Release Information",
      description: "Process information requests",
      icon: FileDown,
      action: () => console.log("Release information"),
    },
    {
      title: "Audit Records",
      description: "Review for compliance",
      icon: FileCog,
      action: () => console.log("Audit records"),
    },
    {
      title: "Complete Records",
      description: "Finalize pending records",
      icon: FileCheck,
      action: () => console.log("Complete records"),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common medical records tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant="outline"
                className="flex h-24 flex-col items-center justify-center gap-1 p-2"
                onClick={action.action}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.title}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
