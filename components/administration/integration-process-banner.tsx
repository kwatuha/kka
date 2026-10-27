"use client"

import Link from "next/link"
import { ArrowRight, ClipboardList } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const STEPS = [
  {
    label: "1. Run preflight",
    href: "/administration?tab=system#afyaconnect-coverage",
    detail: "OAuth, CR, FR, SHR, FHIR, eligibility",
  },
  {
    label: "2. National smokes",
    href: "/administration?tab=system#national-integrations",
    detail: "Individual tests + UAT ID docs",
  },
  {
    label: "3. Witness SHIF OP (now)",
    href: "/patients",
    detail:
      "12345678 / CR672… — Outpatient visit fund → OTP → submit; chart shows UAT witness tracks",
  },
  {
    label: "3b. Witness SHIF IP (pending)",
    href: "/administration?tab=system#afyaconnect-coverage",
    detail:
      "Email afyaconnect.dha@gmail.com for IP test CR; preflight + ip-readiness script exit 2 until then",
  },
  {
    label: "4. Clinical strip",
    href: "/registration",
    detail: "CR → SHR consent → encounter/lab publish (TaifaCare journey)",
  },
  {
    label: "5. Record evidence",
    href: "/administration?tab=system#hie-smoke-recorder",
    detail: "Preflight PASS + national claim ref in chart history",
  },
  {
    label: "6. SHA sandbox (local)",
    href: "/administration?tab=system#sha-sandbox-claims",
    detail: "Optional: Billing insurance claim → sandbox adapter (not national visit)",
  },
  {
    label: "7. KRA eTIMS",
    href: "/administration?tab=system#etims-settings",
    detail: "Opens the form directly below this banner — PIN, branch, device, comm key",
  },
] as const

export function IntegrationProcessBanner() {
  return (
    <Alert className="border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/30">
      <ClipboardList className="h-4 w-4 text-sky-800" />
      <AlertTitle className="text-sm">AfyaConnect integration process</AlertTitle>
      <AlertDescription className="mt-2 space-y-3 text-xs">
        <p>
          Follow this order after any credential or <code className="text-[10px]">ELIGIBILITY_MODE</code> change.
          Matrix:{" "}
          <span className="font-mono text-muted-foreground">docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md</span>
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.label} className="rounded-md border bg-background/70 px-3 py-2">
              <Link href={s.href} className="font-medium text-sky-900 hover:underline dark:text-sky-200">
                {s.label}
              </Link>
              <p className="text-muted-foreground">{s.detail}</p>
            </li>
          ))}
        </ul>
        <Button asChild size="sm" variant="default" className="h-8">
          <Link href="/administration?tab=system#afyaconnect-coverage">
            Run preflight now
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
