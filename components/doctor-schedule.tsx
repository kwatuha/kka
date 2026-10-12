"use client"

import { useState } from "react"
import { Calendar, Clock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function DoctorSchedule({ doctorId }: { doctorId: string }) {
  const [selectedDay, setSelectedDay] = useState("monday")

  // Mock data - in a real app, this would come from an API
  const scheduleData = {
    weeklySchedule: {
      monday: [
        { time: "08:00 - 09:00", type: "Rounds", location: "Ward 3", patients: 5 },
        { time: "09:00 - 12:00", type: "Clinic", location: "Outpatient Clinic", patients: 8 },
        { time: "12:00 - 13:00", type: "Lunch", location: "", patients: 0 },
        { time: "13:00 - 15:00", type: "Procedures", location: "Cath Lab", patients: 2 },
        { time: "15:00 - 16:00", type: "Admin", location: "Office", patients: 0 },
        { time: "16:00 - 17:00", type: "Team Meeting", location: "Conference Room", patients: 0 },
      ],
      tuesday: [
        { time: "08:00 - 09:00", type: "Rounds", location: "Ward 3", patients: 5 },
        { time: "09:00 - 12:00", type: "Clinic", location: "Outpatient Clinic", patients: 7 },
        { time: "12:00 - 13:00", type: "Lunch", location: "", patients: 0 },
        { time: "13:00 - 15:00", type: "Research", location: "Lab", patients: 0 },
        { time: "15:00 - 17:00", type: "Clinic", location: "Outpatient Clinic", patients: 5 },
      ],
      wednesday: [
        { time: "08:00 - 09:00", type: "Rounds", location: "Ward 3", patients: 5 },
        { time: "09:00 - 11:00", type: "Surgery", location: "OR 2", patients: 1 },
        { time: "11:00 - 12:00", type: "Admin", location: "Office", patients: 0 },
        { time: "12:00 - 13:00", type: "Lunch", location: "", patients: 0 },
        { time: "13:00 - 16:00", type: "Clinic", location: "Outpatient Clinic", patients: 8 },
        { time: "16:00 - 17:00", type: "Teaching", location: "Lecture Hall", patients: 0 },
      ],
      thursday: [
        { time: "08:00 - 09:00", type: "Rounds", location: "Ward 3", patients: 5 },
        { time: "09:00 - 12:00", type: "Clinic", location: "Outpatient Clinic", patients: 8 },
        { time: "12:00 - 13:00", type: "Lunch", location: "", patients: 0 },
        { time: "13:00 - 15:00", type: "Procedures", location: "Cath Lab", patients: 3 },
        { time: "15:00 - 17:00", type: "Research", location: "Lab", patients: 0 },
      ],
      friday: [
        { time: "08:00 - 09:00", type: "Rounds", location: "Ward 3", patients: 5 },
        { time: "09:00 - 12:00", type: "Clinic", location: "Outpatient Clinic", patients: 6 },
        { time: "12:00 - 13:00", type: "Department Meeting", location: "Conference Room", patients: 0 },
        { time: "13:00 - 14:00", type: "Lunch", location: "", patients: 0 },
        { time: "14:00 - 16:00", type: "Admin", location: "Office", patients: 0 },
        { time: "16:00 - 17:00", type: "Case Review", location: "Conference Room", patients: 0 },
      ],
      saturday: [],
      sunday: [],
    },
    upcomingAppointments: [
      {
        id: 1,
        patientName: "John Smith",
        patientId: "P-1234",
        time: "09:15 AM",
        date: "2023-04-24",
        type: "Follow-up",
        status: "Confirmed",
      },
      {
        id: 2,
        patientName: "Maria Garcia",
        patientId: "P-2345",
        time: "10:00 AM",
        date: "2023-04-24",
        type: "New Patient",
        status: "Confirmed",
      },
      {
        id: 3,
        patientName: "Robert Johnson",
        patientId: "P-3456",
        time: "11:30 AM",
        date: "2023-04-24",
        type: "Follow-up",
        status: "Confirmed",
      },
      {
        id: 4,
        patientName: "Emily Chen",
        patientId: "P-4567",
        time: "09:30 AM",
        date: "2023-04-25",
        type: "Procedure",
        status: "Pending",
      },
      {
        id: 5,
        patientName: "David Wilson",
        patientId: "P-5678",
        time: "14:15 PM",
        date: "2023-04-25",
        type: "Follow-up",
        status: "Confirmed",
      },
    ],
    availability: {
      nextAvailable: "2023-04-28",
      openSlots: [
        { date: "2023-04-28", time: "09:30 AM" },
        { date: "2023-04-28", time: "11:00 AM" },
        { date: "2023-05-01", time: "10:15 AM" },
        { date: "2023-05-01", time: "14:30 PM" },
        { date: "2023-05-02", time: "09:00 AM" },
      ],
    },
  }

  // Helper function to get the schedule for the selected day
  const getDaySchedule = () => {
    return scheduleData.weeklySchedule[selectedDay as keyof typeof scheduleData.weeklySchedule] || []
  }

  // Helper function to get badge variant based on appointment type
  const getAppointmentBadgeVariant = (type: string) => {
    switch (type) {
      case "New Patient":
        return "default"
      case "Follow-up":
        return "secondary"
      case "Procedure":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Helper function to get badge variant based on schedule type
  const getScheduleBadgeVariant = (type: string) => {
    switch (type) {
      case "Clinic":
        return "default"
      case "Procedures":
      case "Surgery":
        return "destructive"
      case "Rounds":
        return "secondary"
      case "Admin":
      case "Research":
      case "Teaching":
      case "Team Meeting":
      case "Department Meeting":
      case "Case Review":
        return "outline"
      case "Lunch":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule & Availability</CardTitle>
          <CardDescription>Weekly schedule and upcoming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="monday" onValueChange={setSelectedDay}>
                    <TabsList className="grid grid-cols-7 w-full">
                      <TabsTrigger value="monday">Mon</TabsTrigger>
                      <TabsTrigger value="tuesday">Tue</TabsTrigger>
                      <TabsTrigger value="wednesday">Wed</TabsTrigger>
                      <TabsTrigger value="thursday">Thu</TabsTrigger>
                      <TabsTrigger value="friday">Fri</TabsTrigger>
                      <TabsTrigger value="saturday">Sat</TabsTrigger>
                      <TabsTrigger value="sunday">Sun</TabsTrigger>
                    </TabsList>

                    {Object.keys(scheduleData.weeklySchedule).map((day) => (
                      <TabsContent key={day} value={day} className="mt-4">
                        <div className="space-y-4">
                          {getDaySchedule().length > 0 ? (
                            getDaySchedule().map((slot, index) => (
                              <div key={index} className="flex items-start gap-4 border-b pb-3 last:border-0 last:pb-0">
                                <div className="flex-shrink-0 w-24 text-sm font-medium">{slot.time}</div>
                                <div className="flex-grow">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getScheduleBadgeVariant(slot.type)}>{slot.type}</Badge>
                                    {slot.patients > 0 && (
                                      <div className="text-sm text-muted-foreground">
                                        {slot.patients} patient{slot.patients > 1 ? "s" : ""}
                                      </div>
                                    )}
                                  </div>
                                  {slot.location && (
                                    <div className="text-sm text-muted-foreground mt-1">Location: {slot.location}</div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">No scheduled activities</div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <span className="font-medium">Next Available:</span> {scheduleData.availability.nextAvailable}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Open Slots:</div>
                      {scheduleData.availability.openSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{slot.date}</span>
                          <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                          <span>{slot.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduleData.upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {appointment.patientName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{appointment.patientName}</div>
                          <div className="text-sm text-muted-foreground">ID: {appointment.patientId}</div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{appointment.date}</span>
                            <Clock className="h-3 w-3 text-muted-foreground ml-1" />
                            <span>{appointment.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge variant={getAppointmentBadgeVariant(appointment.type)}>{appointment.type}</Badge>
                        <Badge variant={appointment.status === "Confirmed" ? "outline" : "secondary"} className="mt-1">
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
