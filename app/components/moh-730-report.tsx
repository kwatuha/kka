"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { generateMOH730PDF } from "@/lib/moh-reports-pdf"
import { mohReportsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function MOH730Report() {
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [generating, setGenerating] = useState(false)

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
    try {
      setGenerating(true)
      const periodStart = startDate || getDefaultDates().start
      const periodEnd = endDate || getDefaultDates().end

      // Fetch data from API (730 doesn't need date range, but we keep it for consistency)
      const facilityData = await mohReportsApi.get730()

      const reportData = {
        facilityName: "Kiplombe Medical Centre",
        facilityCode: "00001",
        period: {
          start: periodStart,
          end: periodEnd,
        },
        facility: {
          beds: facilityData.beds || 0,
          staff: facilityData.staff || 0,
          equipment: facilityData.equipment || 0,
          infrastructure: facilityData.infrastructure || "Modern healthcare facility with multiple departments",
          services: facilityData.services || [],
        },
      }

      await generateMOH730PDF(reportData)
    } catch (error: any) {
      console.error("Error generating MOH 730 report:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate MOH 730 report",
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
          MOH 730 - Facility Information Report
        </CardTitle>
        <CardDescription>
          Generate facility information and infrastructure report as required by Kenya Ministry of Health.
          This report tracks facility capacity, staff, equipment, and services offered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date-730">Start Date</Label>
            <Input
              id="start-date-730"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              defaultValue={getDefaultDates().start}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date-730">End Date</Label>
            <Input
              id="end-date-730"
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
            <li>Facility capacity (beds, rooms, departments)</li>
            <li>Staffing levels by category</li>
            <li>Medical equipment inventory</li>
            <li>Infrastructure and facilities</li>
            <li>Services offered</li>
            <li>Operating hours and accessibility</li>
            <li>Emergency services availability</li>
            <li>Specialized services and programs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}




