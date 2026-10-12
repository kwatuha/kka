"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { FacilityLogoMark } from "@/components/facility-logo-mark"
import { getAppHomeHref } from "@/lib/utils/url"
import { getBrandingSignInSubtitle } from "@/lib/branding"

const inputClassName =
  "h-12 border-slate-200 bg-white text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#0f4c75] focus:ring-[#2596be]/35"

export default function LoginPage() {
  const { login, verifyLoginOtp, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [requiresTotp, setRequiresTotp] = useState(false)
  const [loginOtpCode, setLoginOtpCode] = useState("")
  const [requiresLoginOtp, setRequiresLoginOtp] = useState(false)
  const [loginOtpChallengeId, setLoginOtpChallengeId] = useState("")
  const [loginOtpHint, setLoginOtpHint] = useState("")
  const [error, setError] = useState("")
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === "/login") {
      setIsRedirecting(true)
      router.replace("/")
    }
  }, [isAuthenticated, isLoading, router, pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      if (requiresLoginOtp && loginOtpChallengeId) {
        const otpResult = await verifyLoginOtp(loginOtpChallengeId, loginOtpCode)
        if (otpResult.success) {
          setIsRedirecting(true)
          window.location.href = getAppHomeHref()
          return
        }
        if (otpResult.challengeId) setLoginOtpChallengeId(otpResult.challengeId)
        setError(otpResult.error || "Invalid verification code")
        return
      }

      const result = await login(username, password, requiresTotp ? totpCode : undefined)
      if (result.success) {
        setIsRedirecting(true)
        window.location.href = getAppHomeHref()
      } else if (result.requiresTotp) {
        setRequiresTotp(true)
        setError(result.error || "Enter your authenticator code")
      } else if (result.requiresLoginOtp && result.challengeId) {
        setRequiresLoginOtp(true)
        setLoginOtpChallengeId(result.challengeId)
        const parts = [result.maskedPhone, result.maskedEmail].filter(Boolean)
        setLoginOtpHint(parts.length ? `Code sent to ${parts.join(" and ")}` : "Enter the code we sent you")
        setError("")
      } else {
        setError(result.error || "Invalid username or password")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    }
  }

  if (isLoading || (isAuthenticated && pathname === "/login") || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0f4c75]" />
          <p className="text-sm font-medium text-slate-600">Securely logging you in…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Brand panel — desktop */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[42%] xl:w-[44%]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f4c75] via-[#155e8a] to-[#0c2d45]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-white">
          <FacilityLogoMark onDark />
          <div className="space-y-4">
            <p className="max-w-sm text-base leading-relaxed text-white/85">
              Secure access to patient records, queues, billing, pharmacy, and hospital operations.
            </p>
            <div className="flex items-center gap-2 text-sm text-blue-100/90">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Authorized staff only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex justify-center lg:hidden">
            <FacilityLogoMark />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
            <div className="mb-8 space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Staff sign in</h2>
              <p className="text-sm text-slate-500">
                {getBrandingSignInSubtitle()}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || requiresTotp || requiresLoginOtp}
                  className={inputClassName}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || requiresTotp || requiresLoginOtp}
                    className={`${inputClassName} pr-11`}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading || requiresTotp || requiresLoginOtp}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {requiresTotp ? (
                <div className="space-y-2">
                  <Label htmlFor="totp" className="text-sm font-medium text-slate-700">
                    Authenticator code
                  </Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={isLoading}
                    className={inputClassName}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="text-xs font-medium text-[#006B3F] underline-offset-2 hover:underline"
                    onClick={() => {
                      setRequiresTotp(false)
                      setTotpCode("")
                      setError("")
                    }}
                  >
                    Use a different account
                  </button>
                </div>
              ) : null}

              {requiresLoginOtp ? (
                <div className="space-y-2">
                  <Label htmlFor="login-otp" className="text-sm font-medium text-slate-700">
                    SMS &amp; email verification code
                  </Label>
                  {loginOtpHint ? (
                    <p className="text-xs text-slate-500">{loginOtpHint}</p>
                  ) : null}
                  <Input
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={loginOtpCode}
                    onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={isLoading}
                    className={inputClassName}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="text-xs font-medium text-[#006B3F] underline-offset-2 hover:underline"
                    onClick={() => {
                      setRequiresLoginOtp(false)
                      setLoginOtpCode("")
                      setLoginOtpChallengeId("")
                      setLoginOtpHint("")
                      setError("")
                    }}
                  >
                    Use a different account
                  </button>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full bg-gradient-to-r from-[#006B3F] to-[#004D2E] text-base font-semibold text-white shadow-md hover:from-[#007a48] hover:to-[#005734]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in…
                  </>
                ) : requiresLoginOtp ? (
                  "Verify and sign in"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Patient?{" "}
              <Link href="/book" className="font-semibold text-[#006B3F] underline-offset-2 hover:underline">
                Book an appointment
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
