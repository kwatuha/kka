"use client"

import Link from "next/link"
import { ClipboardCheck, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DemoStep = {
  order: number
  title: string
  evidence: string
  href: string
  hint: string
}

const DEMO_STEPS: DemoStep[] = [
  {
    order: 1,
    title: "Registration + consent",
    evidence: "REG-DESK-FULL · INT-CONSENT-CHART",
    href: "/registration",
    hint: "Register patient with consents; note KENHDD toast.",
  },
  {
    order: 2,
    title: "Patient chart — validate KENHDD",
    evidence: "INT-KENHDD-VAL",
    href: "/patients",
    hint: "Open any patient → Validate KENHDD on profile header.",
  },
  {
    order: 3,
    title: "Triage / encounter CDS",
    evidence: "CLN-CDS-TRIAGE · CLN-CDS-CHART",
    href: "/triage-desk",
    hint: "Chief complaint with notifiable keyword → CDS banner.",
  },
  {
    order: 4,
    title: "IDSR alerts desk",
    evidence: "REP-IDSR-DESK · REP-IHR-AUTO",
    href: "/idsr-alerts",
    hint: "Acknowledge alert; confirm IHR column when auto-linked.",
  },
  {
    order: 5,
    title: "Lab finalize → HL7 + FHIR outbox",
    evidence: "INT-HL7-OUTBOX · INT-COMPOSITION",
    href: "/data-exchange",
    hint: "Finalize lab; check HL7 ORU and Composition events.",
  },
  {
    order: 6,
    title: "FHIR sandbox exchange",
    evidence: "INT-LIVE-READY · OPS-SBX-AUTO",
    href: "/administration?tab=system#fhir-exchange",
    hint: "Preview/publish Composition; post sample inbound bundle.",
  },
  {
    order: 6.5,
    title: "Live HIE smoke recorder (when credentials land)",
    evidence: "INT-HIE-SMOKE-LOG",
    href: "/administration?tab=system#hie-smoke-recorder",
    hint: "Record PASS/FAIL with readiness snapshot after AfyaConnect live flip.",
  },
  {
    order: 7,
    title: "Consent FHIR from chart",
    evidence: "INT-CONSENT-PUB",
    href: "/patients",
    hint: "Patient → Consent & privacy → Preview / Publish.",
  },
  {
    order: 8,
    title: "CQM + MOH exports",
    evidence: "RPT-CQM-PNC · REP-MOH-EXPORT",
    href: "/administration?tab=system",
    hint: "Reporting panel → Download CQM JSON/PDF; runbook shows MOH checksums.",
  },
  {
    order: 9,
    title: "Governance & audit",
    evidence: "SEC-AUDIT-CSV · SEC-EMACCESS",
    href: "/administration?tab=system#audit-log-browser",
    hint: "Audit browser, break-glass report, evidence pack export JSON.",
  },
  {
    order: 10,
    title: "Compliance exports",
    evidence: "",
    href: "/administration?tab=system#dha-evidence-pack",
    hint: "Run sandbox smoke; review checklist; export JSON if needed.",
  },
]

export function DhaDemoWizardPanel() {
  return (
    <Card id="dha-demo-wizard">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Integration walkthrough
        </CardTitle>
        <CardDescription>
          Ordered UAT path (~45–60 min) covering registration, clinical, reporting, and data exchange without live
          AfyaConnect credentials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {DEMO_STEPS.map((step) => (
            <li
              key={step.order}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{step.order}</Badge>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={step.href}>
                  Open
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
