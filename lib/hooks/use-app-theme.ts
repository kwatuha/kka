"use client"

import { useTheme } from "next-themes"
import { DEFAULT_APP_THEME, type AppThemeId, isAppThemeId } from "@/lib/app-themes"

/** Resolved app theme id (never `system`). */
export function useAppThemeId(): AppThemeId {
  const { theme, resolvedTheme } = useTheme()
  const raw = (theme === "system" ? resolvedTheme : theme) ?? DEFAULT_APP_THEME
  return isAppThemeId(raw) ? raw : DEFAULT_APP_THEME
}

export function useIsDarkAppTheme(): boolean {
  return useAppThemeId() === "dark"
}

/** Light workspace themes (charts, maps, PDF previews). */
export function useIsLightWorkspaceTheme(): boolean {
  const id = useAppThemeId()
  return id === "professional-blue" || id === "light"
}
