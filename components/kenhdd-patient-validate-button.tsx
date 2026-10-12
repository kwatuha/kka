"use client"

import { useState } from "react"
import { ClipboardCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { standardsApi } from "@/lib/api"

type KenhddReport = {
  framework?: string
  overallScore?: number
  attestationHint?: string
  demographics?: { score?: number; gaps?: { label: string; severity: string }[]; met?: string[] }
  activeProblems?: number
  problemList?: { gaps?: { label: string; severity: string }[] }
}

type Props = {
  patientId: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function KenhddPatientValidateButton({
  patientId,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<KenhddReport | null>(null)

  const runValidate = async () => {
    if (!patientId) return
    try {
      setLoading(true)
      const data = await standardsApi.validateKenhddPatient(patientId)
      setReport(data as KenhddReport)
      setOpen(true)
      toast({
        title: "KENHDD validation complete",
        description: `Readiness score: ${data.overallScore ?? "—"}%`,
      })
    } catch (err: any) {
      toast({
        title: "KENHDD validation failed",
        description: err.message || "Could not validate patient",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={loading}
        onClick={() => void runValidate()}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ClipboardCheck className="mr-2 h-4 w-4" />
        )}
        KENHDD validate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KENHDD readiness report</DialogTitle>
            <DialogDescription>
              Checks demographics and active problem list against the national data dictionary mapping.
            </DialogDescription>
          </DialogHeader>
          {report ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={(report.overallScore ?? 0) >= 85 ? "default" : "secondary"}>
                  Overall {report.overallScore ?? "—"}%
                </Badge>
                {report.demographics?.score != null ? (
                  <Badge variant="outline">Demographics {report.demographics.score}%</Badge>
                ) : null}
                {report.activeProblems != null ? (
                  <Badge variant="outline">{report.activeProblems} active problem(s)</Badge>
                ) : null}
              </div>
              {report.demographics?.gaps?.length ? (
                <div>
                  <p className="mb-1 font-medium text-amber-900 dark:text-amber-200">Demographics gaps</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {report.demographics.gaps.map((g) => (
                      <li key={g.label}>
                        {g.label} ({g.severity})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {report.problemList?.gaps?.length ? (
                <div>
                  <p className="mb-1 font-medium text-amber-900 dark:text-amber-200">Problem list gaps</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {report.problemList.gaps.map((g, i) => (
                      <li key={`${g.label}-${i}`}>
                        {g.label} ({g.severity})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!report.demographics?.gaps?.length && !report.problemList?.gaps?.length ? (
                <p className="text-xs text-muted-foreground">No required gaps flagged for this patient.</p>
              ) : null}
              <p className="text-[10px] text-muted-foreground">
                FHIR summary publish includes structured problems when present.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
