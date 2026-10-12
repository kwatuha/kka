"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function RegistrationStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Today's Registrations</CardTitle>
          <CardDescription>New patients registered today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">18</div>
          <p className="text-xs text-muted-foreground">+3 from yesterday</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Patients in Queue</CardTitle>
          <CardDescription>Waiting for services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">7 for registration, 5 for triage</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Average Wait Time</CardTitle>
          <CardDescription>For registration process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8 min</div>
          <p className="text-xs text-muted-foreground">-2 min from yesterday</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
          <CardDescription>Scheduled for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24</div>
          <p className="text-xs text-muted-foreground">5 pending check-in</p>
        </CardContent>
      </Card>
    </div>
  )
}
