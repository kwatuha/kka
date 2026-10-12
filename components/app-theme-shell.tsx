"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AccentColorProvider } from "@/components/accent-color-provider"

/** Global theme + accent (all routes including /book, /login, /privacy). */
export function AppThemeShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider disableTransitionOnChange>
      <AccentColorProvider />
      {children}
    </ThemeProvider>
  )
}
