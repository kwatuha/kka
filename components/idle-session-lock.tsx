"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"
import { FacilityLogoMark } from "@/components/facility-logo-mark"
import { getBrandingMisTitle } from "@/lib/branding"

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

/**
 * Lock screen after facility-configured idle period.
 * Unlock requires confirming password via /api/auth/login with current username.
 */
export function IdleSessionLock() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_TIMEOUT_MS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("jwt_token") ||
          localStorage.getItem("auth_token")
        if (!token) return
        const res = await fetch("/api/security/settings", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const minutes = Number(data.sessionTimeoutMinutes) || 30
        setTimeoutMs(Math.min(480, Math.max(5, minutes)) * 60 * 1000)
      } catch {
        /* keep default */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const bump = useCallback(() => {
    if (locked) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLocked(true), timeoutMs)
  }, [locked, timeoutMs])

  useEffect(() => {
    if (!user) return
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    bump()
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, bump])

  const unlock = async () => {
    if (!user?.username && !(user as any)?.name) {
      logout()
      return
    }
    setUnlocking(true)
    setError(null)
    try {
      const username = (user as any).username || user?.email || ""
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || data.msg || "Incorrect password")
        return
      }
      if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("jwt_token", data.token)
      }
      setPassword("")
      setLocked(false)
      bump()
    } catch (err: any) {
      setError(err?.message || "Unlock failed")
    } finally {
      setUnlocking(false)
    }
  }

  if (!user || !locked) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-50 via-background to-slate-100/90 px-4 backdrop-blur-sm dark:from-slate-950 dark:via-background dark:to-slate-900">
      <div className="flex flex-col items-center gap-2 text-center">
        <FacilityLogoMark className="max-h-14 w-auto max-w-[min(100%,16rem)]" />
        <p className="text-xs font-medium text-muted-foreground">{getBrandingMisTitle()}</p>
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Session locked</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Idle timeout reached. Re-enter your password to continue working as{" "}
          <strong>{(user as any).username || user.name}</strong>.
        </p>
        <div className="space-y-2">
          <Label htmlFor="unlock-password">Password</Label>
          <Input
            id="unlock-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void unlock()
            }}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => void unlock()} disabled={unlocking || !password}>
            {unlocking ? "Unlocking…" : "Unlock"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              logout()
              router.push("/logout")
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
