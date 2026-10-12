"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, RefreshCw } from "lucide-react"

// Sample queue data
const registrationQueue = [
  {
    id: "Q-1001",
    patientId: "P-1011",
    patientName: "James Mwangi",
    queueNumber: "R001",
    waitTime: "5 min",
    status: "Waiting",
    avatar: "/thoughtful-portrait.png",
    initials: "JM",
  },
  {
    id: "Q-1002",
    patientId: "P-1012",
    patientName: "Lucy Wambui",
    queueNumber: "R002",
    waitTime: "2 min",
    status: "Waiting",
    avatar: "/diverse-group-chatting.png",
    initials: "LW",
  },
  {
    id: "Q-1003",
    patientId: "P-1013",
    patientName: "Daniel Kipchoge",
    queueNumber: "R003",
    waitTime: "Just now",
    status: "Waiting",
    avatar: "/thoughtful-portrait.png",
    initials: "DK",
  },
]

const triageQueue = [
  {
    id: "Q-2001",
    patientId: "P-1014",
    patientName: "Sarah Njoroge",
    queueNumber: "T001",
    waitTime: "12 min",
    status: "Waiting",
    avatar: "/diverse-group-chatting.png",
    initials: "SN",
  },
  {
    id: "Q-2002",
    patientId: "P-1015",
    patientName: "Michael Otieno",
    queueNumber: "T002",
    waitTime: "8 min",
    status: "Waiting",
    avatar: "/thoughtful-portrait.png",
    initials: "MO",
  },
  {
    id: "Q-2003",
    patientId: "P-1016",
    patientName: "Jane Wangari",
    queueNumber: "T003",
    waitTime: "3 min",
    status: "Waiting",
    avatar: "/diverse-group-chatting.png",
    initials: "JW",
  },
  {
    id: "Q-2004",
    patientId: "P-1017",
    patientName: "Peter Kimani",
    queueNumber: "T004",
    waitTime: "Just now",
    status: "Waiting",
    avatar: "/thoughtful-portrait.png",
    initials: "PK",
  },
]

export function RegistrationQueueStatus() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Queue Status</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <CardDescription>Current registration and triage queues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Registration Queue</h3>
            <div className="space-y-2">
              {registrationQueue.length > 0 ? (
                registrationQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={item.avatar || "/placeholder.svg"} alt={item.patientName} />
                        <AvatarFallback>{item.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{item.patientName}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs h-5">
                            {item.queueNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.waitTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        item.status === "Waiting" ? "default" : item.status === "Processing" ? "secondary" : "outline"
                      }
                      className="capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No patients in queue</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Triage Queue</h3>
            <div className="space-y-2">
              {triageQueue.length > 0 ? (
                triageQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={item.avatar || "/placeholder.svg"} alt={item.patientName} />
                        <AvatarFallback>{item.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{item.patientName}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs h-5">
                            {item.queueNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.waitTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        item.status === "Waiting" ? "default" : item.status === "Processing" ? "secondary" : "outline"
                      }
                      className="capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No patients in queue</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="w-full" asChild>
              <a href="/queue">View All Queues</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
