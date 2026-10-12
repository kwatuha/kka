"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { APP_THEME_IDS, DEFAULT_APP_THEME } from "@/lib/app-themes"

type Props = Omit<ThemeProviderProps, "themes" | "defaultTheme"> & {
  defaultTheme?: ThemeProviderProps["defaultTheme"]
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_APP_THEME,
  storageKey = "transelgon-app-theme",
  ...props
}: Props) {
  React.useEffect(() => {
    try {
      const storage = storageKey
      if (!localStorage.getItem(storage)) {
        const legacy = localStorage.getItem("theme")
        if (legacy === "dark" || legacy === "light") {
          localStorage.setItem(storage, legacy === "dark" ? "dark" : DEFAULT_APP_THEME)
        }
      }
      localStorage.removeItem("theme")
    } catch {
      // ignore storage errors
    }
  }, [storageKey])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      themes={[...APP_THEME_IDS]}
      enableSystem={false}
      storageKey={storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
