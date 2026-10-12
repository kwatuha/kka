"use client"

import { useThemeStore } from "@/lib/stores/theme-store"
import { useEffect } from "react"

export function AccentColorProvider() {
  const { accentColor } = useThemeStore()

  useEffect(() => {
    // Apply the accent color to the document
    document.documentElement.style.setProperty("--accent", accentColor.value)
    document.documentElement.style.setProperty("--accent-hover", accentColor.hoverValue)
    document.documentElement.style.setProperty("--accent-foreground", accentColor.textValue)
  }, [accentColor])

  return null
}
