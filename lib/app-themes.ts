/** App-wide color themes (next-themes `class` on `<html>`). */
export const APP_THEME_IDS = ["professional-blue", "dark", "light"] as const

export type AppThemeId = (typeof APP_THEME_IDS)[number]

export type AppThemeDefinition = {
  id: AppThemeId
  name: string
  description: string
}

export const APP_THEMES: AppThemeDefinition[] = [
  {
    id: "professional-blue",
    name: "Professional Blue",
    description: "Light workspace with navy accents and cool blue surfaces",
  },
  {
    id: "dark",
    name: "Dark",
    description: "Deep blue-gray background for low-light environments",
  },
  {
    id: "light",
    name: "Light",
    description: "Neutral light mode with minimal color tint",
  },
]

export const DEFAULT_APP_THEME: AppThemeId = "professional-blue"

export function isAppThemeId(value: string): value is AppThemeId {
  return (APP_THEME_IDS as readonly string[]).includes(value)
}
