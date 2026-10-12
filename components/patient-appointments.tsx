"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin } from "lucide-react"
import { appointmentsApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type Appointment = {
  id: string
  date: string
  time: string
  doctor: string
  department: string
  reason: string
  status: string
  location: string
  notes: string
}

export function PatientAppointments({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    loadAppointments()
  }, [patientId])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      setError(null)

      const apptsData = await appointmentsApi.getAll(undefined, undefined, undefined, patientId)

      const appts: Appointment[] = apptsData.map((apt: any) => {
        const appointmentDate = new Date(apt.appointmentDate || apt.date || new Date())
        const doctorName = apt.doctorName || `${apt.doctorFirstName || ''} ${apt.doctorLastName || ''}`.trim() || 'Unknown Doctor'
        
        return {
          id: `apt-${apt.appointmentId}`,
          date: appointmentDate.toISOString().split('T')[0],
          time: apt.appointmentTime || appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          doctor: doctorName,
          department: apt.department || 'General',
          reason: apt.reason || apt.appointmentReason || 'Not specified',
          status: apt.status === 'scheduled' ? 'Scheduled' : apt.status === 'completed' ? 'Completed' : apt.status || 'Scheduled',
          location: apt.location || 'Main Hospital',
          notes: apt.notes || ''
        }
      })

      // Sort by date descending
      appts.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime())

      setAppointments(appts)
    } catch (err: any) {
      console.error("Error loading appointments:", err)
      setError(err.message || "Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }

  const upcomingAppts = appointments.filter((apt) => {
    const aptDate = new Date(apt.date + ' ' + apt.time)
    const today = new Date()
    return apt.status === "Scheduled" && aptDate >= today
  })
  const pastAppts = appointments.filter((apt) => apt.status === "Completed" || new Date(apt.date + ' ' + apt.time) < new Date())

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>Upcoming and past appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>Upcoming and past appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <CardDescription>Upcoming and past appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upcoming" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <Button size="sm">Schedule New Appointment</Button>
          </div>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingAppts.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppts.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge>{apt.department}</Badge>
                            <Badge variant="outline">{apt.status}</Badge>
                          </div>
                          <h4 className="text-lg font-semibold">{apt.reason}</h4>
                          <p className="text-sm text-muted-foreground">with {apt.doctor}</p>

                          <div className="flex flex-col sm:flex-row gap-4 text-sm mt-2">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{apt.date}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{apt.time}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{apt.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Reschedule
                          </Button>
                          <Button variant="outline" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No upcoming appointments found</div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastAppts.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAppts.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{apt.date}</TableCell>
                        <TableCell>{apt.time}</TableCell>
                        <TableCell>{apt.doctor}</TableCell>
                        <TableCell>{apt.department}</TableCell>
                        <TableCell>{apt.reason}</TableCell>
                        <TableCell>{apt.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No past appointments found</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
