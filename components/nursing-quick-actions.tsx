"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bed, Clipboard, FileText, Pill, Stethoscope, UserPlus } from "lucide-react"

const quickActionClass = "h-24 flex flex-col gap-2 items-center justify-center"

export function NursingQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common nursing tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Button variant="outline" className={quickActionClass} asChild>
            <Link href="/inpatient">
              <Stethoscope className="h-5 w-5" />
              <span>Record Vitals</span>
            </Link>
          </Button>
          <Button variant="outline" className={quickActionClass} asChild>
            <Link href="/inpatient">
              <Pill className="h-5 w-5" />
              <span>Administer Medication</span>
            </Link>
          </Button>
          <Button variant="outline" className={quickActionClass} asChild>
            <Link href="/inpatient">
              <Clipboard className="h-5 w-5" />
              <span>Care Plan</span>
            </Link>
          </Button>
          <Button variant="outline" className={quickActionClass} asChild>
            <Link href="/inpatient">
              <Bed className="h-5 w-5" />
              <span>Bed Assignment</span>
            </Link>
          </Button>
          <Button variant="outline" className={quickActionClass} asChild>
            <Link href="/inpatient">
              <FileText className="h-5 w-5" />
              <span>Document Care</span>
            </Link>
          </Button>
          <Button variant="outline" className={quickActionClass} asChild>
            <Link href="/inpatient">
              <UserPlus className="h-5 w-5" />
              <span>Patient Transfer</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
