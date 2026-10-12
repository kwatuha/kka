"use client"

import { useId } from "react"
import { branding } from "@/lib/branding"
import { cn } from "@/lib/utils"

export type AzCarePlusLogoVariant = "default" | "sidebar" | "compact" | "icon"

type Props = {
  variant?: AzCarePlusLogoVariant
  className?: string
  /** Light text for dark panels (login hero, navy sidebar) */
  onDark?: boolean
}

function LogoIcon({ gradId, className }: { gradId: string; className?: string }) {
  const shineId = `${gradId}-shine`
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="8%" y1="0%" x2="92%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="42%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0f4c75" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="64" height="64" rx="20" fill={`url(#${gradId})`} />
      <rect x="4" y="4" width="64" height="34" rx="20" fill={`url(#${shineId})`} />
      <rect
        x="4"
        y="4"
        width="64"
        height="64"
        rx="20"
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.5"
      />
      <path d="M36 23v26M23 36h26" stroke="#fff" strokeWidth="4.75" strokeLinecap="round" />
      <circle cx="36" cy="36" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  )
}

function Wordmark({
  dark,
  compact,
  className,
}: {
  dark: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn("min-w-0 text-left", className)}>
      <p
        className={cn(
          "font-bold leading-[1.15] tracking-tight",
          compact ? "text-base" : "text-[1.15rem] sm:text-xl",
          dark ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" : "text-[#0f4c75]",
        )}
      >
        <span>AZ </span>
        <span className={dark ? "text-white" : "text-[#2596be]"}>Care</span>
        <span className={cn("font-extrabold", dark ? "text-white" : "text-[#0f4c75]")}>Plus</span>
      </p>
      <div
        className={cn(
          "mt-1.5 flex items-center gap-2",
          compact ? "mt-1" : "",
        )}
      >
        <span
          className={cn("h-px flex-1 max-w-[1.25rem]", dark ? "bg-sky-300/50" : "bg-[#2596be]/40")}
          aria-hidden
        />
        <p
          className={cn(
            "font-semibold uppercase tracking-[0.18em]",
            compact ? "text-[8px]" : "text-[9px] sm:text-[10px]",
            dark ? "text-cyan-200/90" : "text-slate-500",
          )}
        >
          MIS
        </p>
        <span
          className={cn("h-px flex-1 max-w-[1.25rem]", dark ? "bg-sky-300/30" : "bg-[#2596be]/25")}
          aria-hidden
        />
      </div>
    </div>
  )
}

/** Vector AZ CarePlus mark — used in sidebar, login, and as image fallback. */
export function AzCarePlusLogo({ variant = "default", className, onDark }: Props) {
  const gradId = useId().replace(/:/g, "")
  const product = branding.productName || "AZ CarePlus"
  const label = `${product} Hospital MIS`

  if (variant === "icon") {
    return (
      <div className={cn("shrink-0", className)} role="img" aria-label={label}>
        <LogoIcon gradId={gradId} className="h-full w-full drop-shadow-lg" />
      </div>
    )
  }

  const dark = onDark || variant === "sidebar"
  const iconSize =
    variant === "compact" ? "h-11 w-11" : variant === "sidebar" ? "h-[3.25rem] w-[3.25rem]" : "h-14 w-14 sm:h-16 sm:w-16"

  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.04] px-3 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-[2px]",
          className,
        )}
        role="img"
        aria-label={label}
      >
        <div className="flex items-center gap-3">
          <LogoIcon gradId={gradId} className={cn("shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]", iconSize)} />
          <Wordmark dark compact={false} className="flex-1" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("flex items-center gap-3", variant === "compact" ? "gap-2.5" : "gap-3.5", className)}
      role="img"
      aria-label={label}
    >
      <LogoIcon gradId={gradId} className={cn("shrink-0 drop-shadow-md", iconSize)} />
      <Wordmark dark={dark} compact={variant === "compact"} />
    </div>
  )
}
