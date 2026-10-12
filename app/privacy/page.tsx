"use client"

import Link from "next/link"
import { branding } from "@/lib/branding"
import { HospitalLogoImage } from "@/components/hospital-logo-image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PublicPrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <HospitalLogoImage className="h-9 w-auto" />
            <div>
              <p className="text-sm font-semibold">{branding.appBrand}</p>
              <p className="text-xs text-muted-foreground">Privacy notice</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/book">Book a visit</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>How we use your information</CardTitle>
            <CardDescription>
              Summary for patients using online booking and facility services. For more detail, ask at the
              registration desk or contact the facility data protection officer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              {branding.appBrand} processes personal and health data to provide hospital care, appointments,
              billing, and public-health reporting required by law. Data are stored in secured systems operated
              for the facility; access is limited to authorised staff with role-based permissions and audit
              logging.
            </p>
            <p>
              When you submit an online booking request, we collect contact details and visit preferences to
              confirm your appointment. We do not ask for full clinical history on the public form — clinical
              notes are recorded inside the hospital system after you arrive.
            </p>
            <p>
              You may request information about how your data are handled through the facility registration
              desk. Staff can export a structured summary of your chart for portability requests where
              permitted by policy.
            </p>
            <p>
              SMS messages about booking codes are sent only when SMS is enabled and you provide a valid
              mobile number. Message content includes your booking reference and visit details, not detailed
              diagnosis.
            </p>
          </CardContent>
        </Card>
        <p className="text-xs text-center text-muted-foreground">
          <Link href="/login" className="underline underline-offset-2">
            Staff sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
