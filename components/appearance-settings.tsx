"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { AccentColorPicker } from "@/components/accent-color-picker"
import { Card, CardContent } from "@/components/ui/card"
import { CustomColorCreator } from "@/components/custom-color-creator"
import { Button } from "@/components/ui/button"
import { PaletteSuggestionButton } from "@/components/palette-suggestion-button"
import { useThemeStore } from "@/lib/stores/theme-store"
import { AccessibilityCheckerDialog } from "@/components/accessibility-checker-dialog"
import { APP_THEMES } from "@/lib/app-themes"
import { useAppThemeId } from "@/lib/hooks/use-app-theme"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const THEME_SWATCH: Record<string, string> = {
  "professional-blue": "linear-gradient(135deg, hsl(214 38% 96%) 40%, hsl(201 77% 26%) 100%)",
  dark: "linear-gradient(135deg, hsl(215 35% 18%) 40%, hsl(215 35% 8%) 100%)",
  light: "linear-gradient(135deg, hsl(0 0% 100%) 40%, hsl(210 20% 93%) 100%)",
}

export function AppearanceSettings() {
  const { accentColor } = useThemeStore()
  const { setTheme } = useTheme()
  const currentThemeId = useAppThemeId()

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-medium">Color theme</h3>
            <p className="text-sm text-muted-foreground text-center">
              Professional Blue, Dark, or neutral Light — saved on this device
            </p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
              {APP_THEMES.map((theme) => {
                const selected = currentThemeId === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-lg border-2 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected ? "border-primary shadow-md" : "border-border",
                    )}
                  >
                    <div className="h-14 w-full" style={{ background: THEME_SWATCH[theme.id] }} />
                    <div className="space-y-0.5 bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{theme.name}</span>
                        {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <ModeToggle variant="outline" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-medium">Accent Color</h3>
            <p className="text-sm text-muted-foreground text-center">
              Choose an accent color for buttons, links, and interactive elements
            </p>
            <div className="flex items-center gap-2">
              <AccentColorPicker />
              <CustomColorCreator />
              <PaletteSuggestionButton baseColor={accentColor.value} />
              <AccessibilityCheckerDialog color={accentColor.value} />
            </div>
            <div className="grid grid-cols-1 gap-4 w-full max-w-md mt-4">
              <div className="flex items-center justify-between">
                <span>Current Color:</span>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: accentColor.value }} />
                  <span>{accentColor.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="p-4 border rounded-md">
                  <div className="space-y-4">
                    <Button>Primary Button</Button>
                    <div>
                      <p>
                        Text with{" "}
                        <a href="#" className="text-primary hover:underline">
                          accent links
                        </a>{" "}
                        for preview
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
