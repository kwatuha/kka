"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { AzCarePlusLogo } from "@/components/az-careplus-logo"
import { branding } from "@/lib/branding"
import { publicAssetUrl } from "@/lib/utils/url"
import { cn } from "@/lib/utils"

interface HospitalLogoImageProps {
  className?: string
  width?: number
  height?: number
  variant?: "default" | "print" | "compact" | "sidebar"
  /** When true, uses sidebar (dark-background) logo in dark mode and default in light mode. */
  adaptToTheme?: boolean
}

const FALLBACK_LOGO_FILES = [
  "/az-careplus-logo-print.png",
  "/az-careplus-logo-sidebar.png",
  "/az-careplus-logo.png",
  "/az-careplus-logo.svg",
  "/az-careplus-logo-sidebar.svg",
  "/logo.png",
  "/logo.svg",
  "/logo_intelli.png",
] as const

function logoSrcChainForVariant(variant: HospitalLogoImageProps["variant"]): string[] {
  const primary = branding.logoPath?.trim() || "/az-careplus-logo.png"
  const print = branding.logoPrintPath?.trim() || "/az-careplus-logo-print.png"
  const sidebarRaster = branding.logoSidebarPath?.trim() || "/az-careplus-logo-sidebar.png"
  if (variant === "print") {
    return [...new Set([print, primary, ...FALLBACK_LOGO_FILES].filter(Boolean))]
  }
  if (variant === "sidebar") {
    return [...new Set([sidebarRaster, ...FALLBACK_LOGO_FILES].filter(Boolean))]
  }
  return [...new Set([primary, print, ...FALLBACK_LOGO_FILES].filter(Boolean))]
}

export function HospitalLogoImage({
  className = "",
  width,
  height,
  variant = "default",
  adaptToTheme = false,
}: HospitalLogoImageProps) {
  const [srcIndex, setSrcIndex] = useState(0)
  const { resolvedTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    setThemeReady(true)
  }, [])

  const effectiveVariant =
    adaptToTheme && themeReady && resolvedTheme === "dark" ? "sidebar" : variant

  const logoSrcChain = useMemo(() => logoSrcChainForVariant(effectiveVariant), [effectiveVariant])

  useEffect(() => {
    setSrcIndex(0)
  }, [effectiveVariant])

  const defaultWidth =
    width ||
    (variant === "compact" ? 120 : variant === "sidebar" ? 240 : variant === "print" ? 150 : 320)
  const defaultHeight =
    height ||
    (variant === "compact" ? 48 : variant === "sidebar" ? 96 : variant === "print" ? 50 : 120)

  const exhausted = srcIndex >= logoSrcChain.length

  if (exhausted) {
    return (
      <AzCarePlusLogo
        className={className}
        variant={
          effectiveVariant === "sidebar"
            ? "sidebar"
            : effectiveVariant === "compact"
              ? "compact"
              : "default"
        }
        onDark={effectiveVariant === "sidebar"}
      />
    )
  }

  const src = logoSrcChain[srcIndex]
  const imageClassName = cn(
    "object-contain w-full",
    effectiveVariant === "sidebar" &&
      "max-h-[88px] min-h-[52px] rounded-xl drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]",
    effectiveVariant === "default" && "max-h-[132px] sm:max-h-[140px] rounded-lg",
    effectiveVariant === "compact" && "max-h-12 w-auto",
    effectiveVariant === "print" && "max-h-[52px] w-auto",
  )

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src={publicAssetUrl(src)}
        alt={branding.appBrand}
        width={defaultWidth}
        height={defaultHeight}
        className={imageClassName}
        onError={() => setSrcIndex((i) => i + 1)}
      />
    </div>
  )
}

export function HospitalLogoPrint() {
  const printChain = logoSrcChainForVariant("print")
  const [printIndex, setPrintIndex] = useState(0)
  const printSrc = printChain[printIndex] ?? branding.logoPrintPath

  if (printIndex >= printChain.length) {
    return (
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <AzCarePlusLogo variant="default" />
      </div>
    )
  }

  return (
    <div style={{ textAlign: "center", marginBottom: "20px" }}>
      <img
        key={printSrc}
        src={publicAssetUrl(printSrc)}
        alt={branding.appBrand}
        style={{ maxWidth: "220px", height: "auto", marginBottom: "10px" }}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          if (printIndex + 1 < printChain.length) {
            setPrintIndex((i) => i + 1)
            return
          }
          target.style.display = "none"
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #0f4c75; letter-spacing: 1px;">AZ CarePlus</h1>
                  <h2 style="margin: 5px 0; font-size: 14px; color: #475569; letter-spacing: 0.12em;">HOSPITAL MIS</h2>
                </div>
              `
          }
        }}
      />
      <div style={{ marginTop: "10px" }}>
        <h2 style={{ margin: "5px 0", fontSize: "18px", color: "#333" }}>{branding.appBrand}</h2>
      </div>
    </div>
  )
}
