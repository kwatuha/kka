"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarCheck, Check, Clock, Copy, Loader2, Shield, Stethoscope } from "lucide-react"
import { branding } from "@/lib/branding"
import { HospitalLogoImage } from "@/components/hospital-logo-image"
import { publicBookingsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  mapApiBooking,
  PUBLIC_BOOKING_SECTIONS,
  PUBLIC_INSURERS,
  type PublicBooking,
} from "@/lib/public-bookings"

const BOOKING_STATUS_LEGEND = [
  { key: "pending", label: "Pending staff review", detail: "Your request is in the hospital inbox." },
  { key: "accepted", label: "Confirmed", detail: "Staff accepted the slot — bring your code to registration." },
  { key: "declined", label: "Not confirmed", detail: "Call the hospital to reschedule or choose another date." },
] as const

async function copyText(label: string, text: string, onDone: () => void, onFail: (msg: string) => void) {
  try {
    await navigator.clipboard.writeText(text)
    onDone()
  } catch {
    onFail(`Could not copy ${label}. Select and copy manually: ${text}`)
  }
}

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  nationalId: "",
  dateOfBirth: "",
  gender: "",
  shaMemberNumber: "",
  clinic: "General OPD",
  preferredDate: "",
  preferredTime: "09:30",
  reason: "",
  insurance: "AAR",
  website: "",
}

export default function PublicBookingPage() {
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState<PublicBooking | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [embed, setEmbed] = useState(false)
  const [lookupCode, setLookupCode] = useState("")
  const [lookupResult, setLookupResult] = useState<{
    code: string
    clinic: string
    preferredDate: string
    preferredTime: string
    status: string
  } | null>(null)
  const [lookupError, setLookupError] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const renderLookupCard = (className?: string) => (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Check booking status</CardTitle>
        <CardDescription>
          Enter the code from your SMS (TH-XXXX) to see if staff have confirmed your request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onLookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="lookupCode">Booking code</Label>
            <Input
              id="lookupCode"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="TH-1234"
              autoComplete="off"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={lookupLoading}>
            {lookupLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "Check status"
            )}
          </Button>
        </form>
        <div className="mt-4 space-y-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Status meanings</p>
          <ul className="space-y-1.5">
            {BOOKING_STATUS_LEGEND.map((s) => (
              <li key={s.key}>
                <span className="font-medium text-foreground">{s.label}</span> — {s.detail}
              </li>
            ))}
          </ul>
        </div>
        {lookupError ? <p className="mt-2 text-sm text-destructive">{lookupError}</p> : null}
        {lookupResult ? (
          <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium">{lookupResult.code}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void copyText(
                    "code",
                    lookupResult.code,
                    () => {
                      setCopiedCode(lookupResult.code)
                      setTimeout(() => setCopiedCode(null), 2000)
                    },
                    (msg) => setLookupError(msg)
                  )
                }}
              >
                {copiedCode === lookupResult.code ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy code
                  </>
                )}
              </Button>
            </div>
            <p className="text-muted-foreground">
              {lookupResult.clinic} · {lookupResult.preferredDate} {lookupResult.preferredTime}
            </p>
            <p className="mt-1 capitalize">
              Status:{" "}
              <span className="font-medium">
                {lookupResult.status === "accepted"
                  ? "Confirmed"
                  : lookupResult.status === "declined"
                    ? "Not confirmed — call the hospital"
                    : "Pending staff review"}
              </span>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setEmbed(q.get("embed") === "1")
  }, [])

  const onLookup = async (e: FormEvent) => {
    e.preventDefault()
    setLookupError("")
    setLookupResult(null)
    const code = lookupCode.trim().toUpperCase()
    if (!code) {
      setLookupError("Enter your booking code (e.g. TH-1234).")
      return
    }
    setLookupLoading(true)
    try {
      const row = await publicBookingsApi.lookup(code)
      setLookupResult(row)
    } catch (err: any) {
      setLookupError(err?.message || "Booking code not found.")
    } finally {
      setLookupLoading(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      setError("Please enter your name and phone number.")
      return
    }
    if (!form.preferredDate) {
      setError("Please choose a preferred date.")
      return
    }
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      nationalId: form.nationalId.trim(),
      dateOfBirth: form.dateOfBirth.trim() || undefined,
      gender: form.gender.trim() || undefined,
      shaMemberNumber: form.shaMemberNumber.trim(),
      clinic: form.clinic,
      preferredDate: form.preferredDate,
      preferredTime: form.preferredTime,
      reason: form.reason.trim(),
      insurance: form.insurance,
      website: form.website,
      source: embed ? "iframe" : "web",
    }
    setSaving(true)
    try {
      const created = await publicBookingsApi.create(payload)
      setSubmitted(mapApiBooking(created))
    } catch (err: any) {
      setError(err?.message || "Could not submit the booking. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {embed ? null : (
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <HospitalLogoImage adaptToTheme variant="default" className="h-10 w-auto max-w-[160px]" />
            <div>
              <p className="text-sm font-semibold">{branding.appBrand}</p>
              <p className="text-xs text-muted-foreground">Patient appointment request</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/privacy">Privacy</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Staff sign in</Link>
            </Button>
          </div>
        </div>
      </header>
      )}

      <main
        className={
          embed
            ? "mx-auto max-w-3xl space-y-4 px-3 py-4"
            : "mx-auto max-w-5xl space-y-6 px-4 py-8"
        }
      >
        {!embed ? renderLookupCard() : null}
        <div className={embed ? "space-y-4" : "grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"}>
        <Card>
          <CardHeader>
            <CardTitle>Book a visit</CardTitle>
            <CardDescription>
              Request an OPD or specialist appointment. We send an SMS with your booking code
              and visit details. Registration confirms the slot. No account is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Your request code</p>
                      <p className="text-3xl font-semibold tracking-wide">{submitted.code}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void copyText(
                          "code",
                          submitted.code,
                          () => {
                            setCopiedCode(submitted.code)
                            setTimeout(() => setCopiedCode(null), 2000)
                          },
                          (msg) => setError(msg)
                        )
                      }}
                    >
                      {copiedCode === submitted.code ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm">
                  {submitted.firstName} {submitted.lastName} — {submitted.clinic} on{" "}
                  {submitted.preferredDate} at {submitted.preferredTime}.
                </p>
                <p className="text-sm text-muted-foreground">
                  {submitted.smsSent
                    ? `A confirmation SMS was sent to ${submitted.smsTo || "your phone"} with code ${submitted.code}${
                        submitted.smsSender ? ` (sender ${submitted.smsSender})` : ""
                      }. Check that inbox if it does not appear within a few minutes.`
                    : submitted.smsReason === "sms_not_configured"
                      ? "SMS is not configured on the server. Please save this code and show it at registration."
                      : `We could not send SMS${submitted.smsReason ? ` (${submitted.smsReason})` : ""}. Please save this code and quote it at registration.`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Staff confirm the slot under Appointments → Online bookings. This remains a
                  request until they accept it.
                </p>
                {submitted.whatsappUrl ? (
                  <Button variant="outline" asChild>
                    <a href={submitted.whatsappUrl} target="_blank" rel="noreferrer">
                      Message us on WhatsApp
                    </a>
                  </Button>
                ) : null}
                <Button onClick={() => setSubmitted(null)}>Request another visit</Button>
              </div>
            ) : (
              <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Daniel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Kiptoo"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="07xx xxx xxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationalId">National ID (optional)</Label>
                    <Input
                      id="nationalId"
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of birth (optional)</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      max={minDate}
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sex (optional)</Label>
                    <Select
                      value={form.gender || "unset"}
                      onValueChange={(gender) =>
                        setForm({ ...form, gender: gender === "unset" ? "" : gender })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select if known" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Prefer not to say</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shaMemberNumber">SHA / NHIF member number (optional)</Label>
                  <Input
                    id="shaMemberNumber"
                    value={form.shaMemberNumber}
                    onChange={(e) => setForm({ ...form, shaMemberNumber: e.target.value })}
                  />
                </div>
                <div className="hidden" aria-hidden="true">
                  <Label htmlFor="website">Company</Label>
                  <Input
                    id="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clinic / department</Label>
                  <Select value={form.clinic} onValueChange={(clinic) => setForm({ ...form, clinic })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_BOOKING_SECTIONS.map((section) => (
                        <SelectGroup key={section.title}>
                          <SelectLabel>{section.title}</SelectLabel>
                          {section.clinics.map((clinic) => (
                            <SelectItem key={clinic} value={clinic}>
                              {clinic === "Dressing" ? "Dressing (wound care)" : clinic}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use <span className="font-medium">Dressing</span> for wound dressing visits. Choose{" "}
                    <span className="font-medium">Spine Clinic</span> for spine-specific specialist care.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="preferredDate">Preferred date</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      min={minDate}
                      value={form.preferredDate}
                      onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredTime">Preferred time</Label>
                    <Input
                      id="preferredTime"
                      type="time"
                      value={form.preferredTime}
                      onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Insurance</Label>
                  <Select
                    value={form.insurance}
                    onValueChange={(insurance) => setForm({ ...form, insurance })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_INSURERS.map((insurer) => (
                        <SelectItem key={insurer} value={insurer}>
                          {insurer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for visit</Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Symptoms, referral, or follow-up"
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit request"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className={embed ? "space-y-4" : "space-y-4"}>
          {embed ? renderLookupCard() : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How this works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-2">
                <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" />
                Choose the clinic or service that matches your visit — general OPD, dressing,
                spine clinic, dialysis, and other specialists are listed by section.
              </p>
              <p className="flex gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Registration confirms the slot against the doctor diary. This is a request, not a
                guaranteed time until staff accept it.
              </p>
              <p className="flex gap-2">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Keep your request code. It is used at the desk and appears in the staff Appointments
                inbox. We send an SMS with the same code and visit details.
              </p>
              <p className="flex gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                Do not enter full medical history here. Clinical notes stay inside the hospital
                system after you arrive.
              </p>
            </CardContent>
          </Card>
          {branding.hospitalLocation || branding.hospitalPhone || branding.hospitalHours ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{branding.appBrand}</CardTitle>
              <CardDescription>
                {[branding.hospitalLocation, branding.hospitalPhone, branding.hospitalHours]
                  .filter(Boolean)
                  .join(" · ")}
              </CardDescription>
            </CardHeader>
          </Card>
          ) : null}
        </div>
        </div>
      </main>
    </div>
  )
}
