"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}

export function SmtpTestBlock() {
  const [smtpTestTo, setSmtpTestTo] = useState("")
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [integrationAlertTesting, setIntegrationAlertTesting] = useState(false)

  const runSmtpTest = async () => {
    const to = smtpTestTo.trim()
    if (!to.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" })
      return
    }
    try {
      setSmtpTesting(true)
      const res = await fetch("/api/security/smtp-test", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || "SMTP test failed")
      toast({ title: "Test email sent", description: `Message ID: ${data.messageId || "ok"}` })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "SMTP test failed"
      toast({ title: "SMTP test failed", description: message, variant: "destructive" })
    } finally {
      setSmtpTesting(false)
    }
  }

  const runIntegrationAlertTest = async () => {
    try {
      setIntegrationAlertTesting(true)
      const res = await fetch("/api/security/integration-alert-test", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Integration alert test failed")
      toast({
        title: "Integration alert test sent",
        description: `SMS: ${data.result?.smsSent ?? 0}, email: ${data.result?.emailSent ?? 0}`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Integration alert test failed"
      toast({ title: "Alert test failed", description: message, variant: "destructive" })
    } finally {
      setIntegrationAlertTesting(false)
    }
  }

  return (
    <div className="space-y-4">
    <div className="space-y-2 rounded-md border p-3">
      <Label htmlFor="security-smtp-test-to" className="text-sm">
        Test facility email (SMTP)
      </Label>
      <p className="text-xs text-muted-foreground">
        Sends a test message using server SMTP settings (e.g. IDSR alert email path).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          id="security-smtp-test-to"
          type="email"
          className="max-w-sm"
          placeholder="duty@facility.co.ke"
          value={smtpTestTo}
          onChange={(e) => setSmtpTestTo(e.target.value)}
        />
        <Button size="sm" variant="outline" disabled={smtpTesting} onClick={() => void runSmtpTest()}>
          {smtpTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send test
        </Button>
      </div>
    </div>
    <div className="space-y-2 rounded-md border p-3">
      <Label className="text-sm">Test integration failure alert (SMS / email)</Label>
      <p className="text-xs text-muted-foreground">
        Uses duty mobiles (<code>INTEGRATION_ALERT_SMS</code> or <code>IDSR_ALERT_SMS</code>) and optional alert
        email. Real failures on outbox or live FHIR also notify the same recipients.
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={integrationAlertTesting}
        onClick={() => void runIntegrationAlertTest()}
      >
        {integrationAlertTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send integration alert test
      </Button>
    </div>
    </div>
  )
}
