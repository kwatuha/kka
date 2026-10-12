"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { generateMOH717PDF } from "@/lib/moh-reports-pdf"
import { mohReportsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function MOH717Report() {
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  // Set default to current month
  const getDefaultDates = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: format(firstDay, "yyyy-MM-dd"),
      end: format(lastDay, "yyyy-MM-dd"),
    }
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      // Set default dates if not provided
      const defaults = getDefaultDates()
      setStartDate(defaults.start)
      setEndDate(defaults.end)
    }

    try {
      setGenerating(true)
      const periodStart = startDate || getDefaultDates().start
      const periodEnd = endDate || getDefaultDates().end

      // Fetch data from API
      const workloadData = await mohReportsApi.get717(periodStart, periodEnd)

      const reportData = {
        facilityName: "Kiplombe Medical Centre",
        facilityCode: "00001", // This should come from facility settings
        period: {
          start: periodStart,
          end: periodEnd,
        },
        workload: {
          outpatients: workloadData.outpatients || 0,
          inpatients: workloadData.inpatients || 0,
          deliveries: workloadData.deliveries || 0,
          surgeries: workloadData.surgeries || 0,
          laboratoryTests: workloadData.laboratoryTests || 0,
          radiologyExams: workloadData.radiologyExams || 0,
          pharmacyPrescriptions: workloadData.pharmacyPrescriptions || 0,
        },
      }

      await generateMOH717PDF(reportData)
    } catch (error: any) {
      console.error("Error generating MOH 717 report:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate MOH 717 report",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          MOH 717 - Monthly Workload Report
        </CardTitle>
        <CardDescription>
          Generate monthly workload statistics report as required by Kenya Ministry of Health.
          This report includes outpatient visits, inpatient admissions, deliveries, surgeries, and other service utilization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              defaultValue={getDefaultDates().start}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              defaultValue={getDefaultDates().end}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download PDF
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Report Includes:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Outpatient department visits</li>
            <li>Inpatient admissions and discharges</li>
            <li>Maternity services (deliveries, antenatal, postnatal)</li>
            <li>Surgical procedures performed</li>
            <li>Laboratory tests conducted</li>
            <li>Radiology examinations</li>
            <li>Pharmacy prescriptions dispensed</li>
            <li>Emergency department visits</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}




