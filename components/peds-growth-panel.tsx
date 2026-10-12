"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Baby } from "lucide-react"
import { assessPediatricGrowth, type GrowthCategory } from "@/lib/whoGrowthScreening"

function badgeVariant(category: GrowthCategory): "default" | "secondary" | "destructive" | "outline" {
  if (category === "severe_acute_malnutrition" || category === "moderate_acute_malnutrition") return "destructive"
  if (category === "overweight") return "secondary"
  if (category === "normal") return "default"
  return "outline"
}

function categoryShort(category: GrowthCategory): string {
  switch (category) {
    case "severe_acute_malnutrition":
      return "SAM (screen)"
    case "moderate_acute_malnutrition":
      return "MAM (screen)"
    case "overweight":
      return "Overweight (screen)"
    case "normal":
      return "Normal (screen)"
    default:
      return "Needs vitals"
  }
}

export type PedsGrowthPanelProps = {
  dateOfBirth?: string | null
  /** Latest weight (kg) and height (cm) from vitals */
  weightKg?: number | null
  heightCm?: number | null
}

export function PedsGrowthPanel({ dateOfBirth, weightKg, heightCm }: PedsGrowthPanelProps) {
  const assessment = assessPediatricGrowth({ dateOfBirth, weightKg, heightCm })
  if (!assessment) return null

  const needsVitals = !assessment.weightKg || !assessment.heightCm

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Baby className="h-4 w-4" />
          Pediatric growth screening (WHO-inspired)
        </CardTitle>
        <CardDescription>
          Age {assessment.ageLabel}
          {assessment.method !== "none" ? ` · ${assessment.method === "weight-for-length" ? "Weight-for-length" : "BMI-for-age"}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {needsVitals ? (
          <Alert>
            <AlertTitle>Record weight &amp; height</AlertTitle>
            <AlertDescription>Add vitals with weight (kg) and height (cm) to run MCH growth screening.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                {assessment.weightKg} kg · {assessment.heightCm} cm
                {assessment.bmi != null ? ` · BMI ${assessment.bmi}` : ""}
              </span>
              <Badge variant={badgeVariant(assessment.category)}>{categoryShort(assessment.category)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{assessment.summary}</p>
            <p className="text-xs text-muted-foreground">
              Screening aid only — confirm with WHO growth charts / MUAC and national MCH protocols.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
