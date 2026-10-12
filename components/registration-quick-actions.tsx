"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Users, ListPlus, Clock } from "lucide-react"
import { AddPatientForm } from "@/components/add-patient-form"
import { AddToQueueForm } from "@/components/add-to-queue-form"
import { AddAppointmentForm } from "@/components/add-appointment-form"

interface RegistrationQuickActionsProps {
  onTabChange?: (tab: string) => void
}

export function RegistrationQuickActions({ onTabChange }: RegistrationQuickActionsProps) {
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [isAddToQueueOpen, setIsAddToQueueOpen] = useState(false)
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common registration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2"
              onClick={() => setIsAddPatientOpen(true)}
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-xs text-center">New Patient</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2"
              onClick={() => setIsAddToQueueOpen(true)}
            >
              <ListPlus className="h-5 w-5" />
              <span className="text-xs text-center">Add to Queue</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2"
              onClick={() => {
                if (onTabChange) {
                  onTabChange("appointments")
                } else {
                  setIsAddAppointmentOpen(true)
                }
              }}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs text-center">Appointments</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2"
              onClick={() => onTabChange && onTabChange("patients")}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs text-center">All Patients</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddPatientForm open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen} />
      <AddToQueueForm open={isAddToQueueOpen} onOpenChange={setIsAddToQueueOpen} />
      <AddAppointmentForm open={isAddAppointmentOpen} onOpenChange={setIsAddAppointmentOpen} />
    </>
  )
}
