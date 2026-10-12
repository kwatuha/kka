"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, FileCheck, FilePlus, FileSearch, FileUp } from "lucide-react"

export function RecentRecordActivities() {
  // In a real application, this data would come from an API or database
  const activities = [
    {
      id: 1,
      user: {
        name: "Grace Njeri",
        avatar: "/colorful-abstract-shapes.png",
        initials: "GN",
      },
      action: "completed",
      recordId: "REC-2023-1225",
      patientName: "Samuel Maina",
      timestamp: "10 minutes ago",
      icon: FileCheck,
    },
    {
      id: 2,
      user: {
        name: "David Kimani",
        avatar: "/colorful-abstract-shapes.png",
        initials: "DK",
      },
      action: "created",
      recordId: "REC-2023-1254",
      patientName: "James Mwangi",
      timestamp: "25 minutes ago",
      icon: FilePlus,
    },
    {
      id: 3,
      user: {
        name: "Faith Wambui",
        avatar: "/abstract-geometric-shapes.png",
        initials: "FW",
      },
      action: "accessed",
      recordId: "REC-2023-1242",
      patientName: "Aisha Kamau",
      timestamp: "1 hour ago",
      icon: FileSearch,
    },
    {
      id: 4,
      user: {
        name: "Peter Omondi",
        avatar: "/abstract-geometric-shapes.png",
        initials: "PO",
      },
      action: "uploaded",
      recordId: "REC-2023-1238",
      patientName: "Daniel Ochieng",
      timestamp: "2 hours ago",
      icon: FileUp,
    },
    {
      id: 5,
      user: {
        name: "Mary Njoroge",
        avatar: "/abstract-geometric-shapes.png",
        initials: "MN",
      },
      action: "completed",
      recordId: "REC-2023-1230",
      patientName: "John Kariuki",
      timestamp: "3 hours ago",
      icon: FileCheck,
    },
  ]

  const getActionText = (action, recordId, patientName) => {
    switch (action) {
      case "completed":
        return (
          <>
            completed record <span className="font-medium">{recordId}</span> for{" "}
            <span className="font-medium">{patientName}</span>
          </>
        )
      case "created":
        return (
          <>
            created new record <span className="font-medium">{recordId}</span> for{" "}
            <span className="font-medium">{patientName}</span>
          </>
        )
      case "accessed":
        return (
          <>
            accessed record <span className="font-medium">{recordId}</span> for{" "}
            <span className="font-medium">{patientName}</span>
          </>
        )
      case "uploaded":
        return (
          <>
            uploaded documents to <span className="font-medium">{recordId}</span> for{" "}
            <span className="font-medium">{patientName}</span>
          </>
        )
      default:
        return (
          <>
            interacted with record <span className="font-medium">{recordId}</span>
          </>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span>Recent Record Activities</span>
        </CardTitle>
        <CardDescription>Latest actions on medical records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
                  <AvatarFallback>{activity.user.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>{" "}
                    {getActionText(activity.action, activity.recordId, activity.patientName)}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
