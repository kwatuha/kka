"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { generateMOH711PDF } from "@/lib/moh-reports-pdf"
import { mohReportsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function MOH711Report() {
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
      const immunizationData = await mohReportsApi.get711(periodStart, periodEnd)

      const reportData = {
        facilityName: "Kiplombe Medical Centre",
        facilityCode: "00001",
        period: {
          start: periodStart,
          end: periodEnd,
        },
        immunization: {
          bcg: immunizationData.bcg || 0,
          opv: immunizationData.opv || 0,
          dpt: immunizationData.dpt || 0,
          measles: immunizationData.measles || 0,
          tetanus: immunizationData.tetanus || 0,
          hepatitisB: immunizationData.hepatitisB || 0,
          pentavalent: immunizationData.pentavalent || 0,
        },
      }

      await generateMOH711PDF(reportData)
    } catch (error: any) {
      console.error("Error generating MOH 711 report:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate MOH 711 report",
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
          MOH 710 - Immunization Report
        </CardTitle>
        <CardDescription>
          Generate immunization services report (official MOH 710; previously mislabeled as 711).
          This report tracks vaccinations administered to children and adults.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date-711">Start Date</Label>
            <Input
              id="start-date-711"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              defaultValue={getDefaultDates().start}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date-711">End Date</Label>
            <Input
              id="end-date-711"
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
            <li>BCG (Tuberculosis) vaccinations</li>
            <li>OPV (Oral Polio Vaccine)</li>
            <li>DPT (Diphtheria, Pertussis, Tetanus)</li>
            <li>Measles vaccinations</li>
            <li>Tetanus toxoid</li>
            <li>Hepatitis B vaccinations</li>
            <li>Pentavalent vaccine</li>
            <li>Age-specific immunization coverage</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}




