"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { generateMOH708PDF } from "@/lib/moh-reports-pdf"
import { mohReportsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function MOH708Report() {
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
      const mchData = await mohReportsApi.get708(periodStart, periodEnd)

      const reportData = {
        facilityName: "Kiplombe Medical Centre",
        facilityCode: "00001",
        period: {
          start: periodStart,
          end: periodEnd,
        },
        mch: {
          antenatalVisits: mchData.antenatalVisits || 0,
          deliveries: mchData.deliveries || 0,
          postnatalVisits: mchData.postnatalVisits || 0,
          familyPlanning: mchData.familyPlanning || 0,
          childClinic: mchData.childClinic || 0,
          growthMonitoring: mchData.growthMonitoring || 0,
        },
      }

      await generateMOH708PDF(reportData)
    } catch (error: any) {
      console.error("Error generating MOH 708 report:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate MOH 708 report",
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
          MOH 708 - Maternal & Child Health Report
        </CardTitle>
        <CardDescription>
          Generate maternal and child health services report as required by Kenya Ministry of Health.
          This report tracks antenatal, delivery, postnatal, and child health services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date-708">Start Date</Label>
            <Input
              id="start-date-708"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              defaultValue={getDefaultDates().start}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date-708">End Date</Label>
            <Input
              id="end-date-708"
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
            <li>Antenatal care visits</li>
            <li>Deliveries (normal and cesarean)</li>
            <li>Postnatal care visits</li>
            <li>Family planning services</li>
            <li>Child health clinic visits</li>
            <li>Growth monitoring and nutrition</li>
            <li>Maternal and neonatal complications</li>
            <li>Immunization coverage for children</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}




