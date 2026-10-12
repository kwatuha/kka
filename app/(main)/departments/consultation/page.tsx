"use client"

import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CalendarDays, ClipboardList, Clock, Stethoscope, UserPlus } from "lucide-react"

export default function ConsultationDepartmentPage() {
  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbsEnhanced
        breadcrumbs={[
          { title: "Home", href: "/" },
          { title: "Departments", href: "/departments" },
          { title: "Consultation", href: "/departments/consultation", current: true },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consultation Department</h1>
        <p className="text-muted-foreground">Manage patient consultations and medical examinations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Consultations</CardTitle>
            <CardDescription>Total scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+2.5% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waiting Patients</CardTitle>
            <CardDescription>In consultation queue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Average wait: 15 min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
            <CardDescription>Currently on duty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">2 specialists available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Consultation Time</CardTitle>
            <CardDescription>Today's average</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 min</div>
            <p className="text-xs text-muted-foreground">-2 min from yesterday</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common consultation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <span className="text-xs text-center">Start Consultation</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs text-center">Schedule Appointment</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-xs text-center">View Queue</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs text-center">Medical Records</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <span className="text-xs text-center">Refer Patient</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consultation Management</CardTitle>
          <CardDescription>Manage patient consultations and appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="waiting" className="space-y-4">
            <TabsList>
              <TabsTrigger value="waiting">Waiting Patients</TabsTrigger>
              <TabsTrigger value="today">Today's Schedule</TabsTrigger>
              <TabsTrigger value="recent">Recent Consultations</TabsTrigger>
            </TabsList>
            <TabsContent value="waiting" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                This feature is coming soon. Check back later!
              </div>
            </TabsContent>
            <TabsContent value="today" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                This feature is coming soon. Check back later!
              </div>
            </TabsContent>
            <TabsContent value="recent" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                This feature is coming soon. Check back later!
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
