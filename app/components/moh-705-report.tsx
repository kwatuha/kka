"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { generateMOH705PDF } from "@/lib/moh-reports-pdf"
import { mohReportsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function MOH705Report() {
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

      // Fetch data from API
      const morbidityData = await mohReportsApi.get705(periodStart, periodEnd)

      const reportData = {
        facilityName: "Kiplombe Medical Centre",
        facilityCode: "00001",
        period: {
          start: periodStart,
          end: periodEnd,
        },
        morbidity: {
          malaria: morbidityData.malaria || 0,
          respiratoryInfections: morbidityData.respiratoryInfections || 0,
          diarrhealDiseases: morbidityData.diarrhealDiseases || 0,
          skinDiseases: morbidityData.skinDiseases || 0,
          eyeDiseases: morbidityData.eyeDiseases || 0,
          injuries: morbidityData.injuries || 0,
          otherConditions: morbidityData.otherConditions || 0,
        },
      }

      await generateMOH705PDF(reportData)
    } catch (error: any) {
      console.error("Error generating MOH 705 report:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate MOH 705 report",
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
          MOH 705 - Morbidity Report
        </CardTitle>
        <CardDescription>
          Generate morbidity (disease) statistics report as required by Kenya Ministry of Health.
          This report tracks common diseases and conditions treated at the facility.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date-705">Start Date</Label>
            <Input
              id="start-date-705"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              defaultValue={getDefaultDates().start}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date-705">End Date</Label>
            <Input
              id="end-date-705"
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
            <li>Malaria cases</li>
            <li>Respiratory tract infections</li>
            <li>Diarrheal diseases</li>
            <li>Skin diseases</li>
            <li>Eye diseases</li>
            <li>Injuries and trauma</li>
            <li>Other communicable and non-communicable diseases</li>
            <li>Age and gender distribution of cases</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}




