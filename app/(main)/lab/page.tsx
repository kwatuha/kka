"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LabDesk } from "@/components/laboratory/lab-desk"
import { ArrowRight, FlaskConical } from "lucide-react"

export default function LabPage() {
  return (
    <LabDesk
      defaultTab="results"
      workbench={
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Full laboratory workbench
            </CardTitle>
            <CardDescription>
              Open the full laboratory page for test requests, catalog, external referrals, printing, and status
              workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/laboratory?tab=tests">
                Open laboratory workbench
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      }
    />
  )
}
