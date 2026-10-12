"use client"

import { useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { securityApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  patientName?: string
  onSuccess?: (result: { logId: number; validUntil: string }) => void
}

export function BreakGlassAccessDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("")
  const [authorizerNote, setAuthorizerNote] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setReason("")
    setAuthorizerNote("")
    setPassword("")
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError("Clinical justification is required.")
      return
    }
    if (!password) {
      setError("Enter your password to confirm break-glass access.")
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const result = await securityApi.breakGlass({
        patientId: Number(patientId),
        reason: reason.trim(),
        password,
        authorizerNote: authorizerNote.trim() || undefined,
      })
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `break_glass_${patientId}`,
          JSON.stringify({ validUntil: result.validUntil, logId: result.logId })
        )
      }
      toast({
        title: "Emergency access logged",
        description: "This access is recorded for privacy review (15 minutes).",
      })
      onSuccess?.(result)
      onOpenChange(false)
      reset()
    } catch (err: any) {
      setError(err.message || "Failed to record break-glass access")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Emergency (break-glass) access
          </DialogTitle>
          <DialogDescription>
            Use when urgent care requires access outside normal scope. Event is logged in the audit trail
            {patientName ? ` for ${patientName}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="bg-reason">Clinical justification *</Label>
            <Textarea
              id="bg-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Unconscious patient in ED; covering officer authorized access"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bg-authorizer">Authorizing officer (optional)</Label>
            <Input
              id="bg-authorizer"
              value={authorizerNote}
              onChange={(e) => setAuthorizerNote(e.target.value)}
              placeholder="Name / role of MS or senior clinician"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bg-password">Your password *</Label>
            <Input
              id="bg-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & log access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
