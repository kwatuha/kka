"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true, dialog cannot be dismissed until 2FA is enabled */
  required?: boolean
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("jwt_token") || ""
      : ""
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function TwoFactorSetupModal({ open, onOpenChange, required = false }: Props) {
  const { user } = useAuth()
  const [secret, setSecret] = useState("")
  const [otpauth, setOtpauth] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState("")
  const alreadyEnabled = Boolean(user?.totpEnabled)

  const reset = () => {
    setSecret("")
    setOtpauth("")
    setCode("")
    setError("")
    setLoading(false)
    setEnabling(false)
  }

  const handleClose = (next: boolean) => {
    if (required && !alreadyEnabled && !next) return
    if (!next) reset()
    onOpenChange(next)
  }

  useEffect(() => {
    if (!open || alreadyEnabled) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/auth/2fa/setup", {
          method: "POST",
          headers: authHeaders(),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to start 2FA setup")
        if (!cancelled) {
          setSecret(data.secret || "")
          setOtpauth(data.otpauthUrl || "")
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to start 2FA setup")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, alreadyEnabled])

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app")
      return
    }
    try {
      setEnabling(true)
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ totpCode: code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to enable 2FA")
      toast({
        title: "Two-factor authentication enabled",
        description: "You will be asked for a code on the next sign-in.",
      })
      handleClose(false)
      // Refresh session claims without full logout
      window.location.reload()
    } catch (err: any) {
      setError(err.message || "Failed to enable 2FA")
    } finally {
      setEnabling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => required && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#006B3F]" />
            Two-factor authentication
          </DialogTitle>
          <DialogDescription>
            {required
              ? "Admin accounts must enroll an authenticator app before continuing."
              : "Protect your account with a time-based one-time password (TOTP)."}
          </DialogDescription>
        </DialogHeader>

        {alreadyEnabled ? (
          <p className="text-sm text-muted-foreground">
            Two-factor authentication is already enabled on this account.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating secret…
          </div>
        ) : (
          <form onSubmit={handleEnable} className="space-y-4">
            {otpauth ? (
              <div className="flex justify-center rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Scan this QR code with your authenticator app"
                  width={180}
                  height={180}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauth)}`}
                />
              </div>
            ) : null}
            {secret ? (
              <div className="space-y-1.5">
                <Label>Manual entry key</Label>
                <code className="block break-all rounded-md border bg-muted/40 px-3 py-2 text-xs tracking-wider">
                  {secret}
                </code>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="totp-enable-code">Authenticator code</Label>
              <Input
                id="totp-enable-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                disabled={enabling}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              {!required ? (
                <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={enabling}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={enabling || !secret}>
                {enabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enabling…
                  </>
                ) : (
                  "Enable 2FA"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
