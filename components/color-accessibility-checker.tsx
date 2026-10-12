"use client"

import { useState } from "react"
import { getContrastRatio, getAccessibilityLevel, getSuggestedAccessibleColor } from "@/lib/utils/accessibility"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import { useThemeStore } from "@/lib/stores/theme-store"

interface ColorAccessibilityCheckerProps {
  color: string
}

export function ColorAccessibilityChecker({ color }: ColorAccessibilityCheckerProps) {
  const [backgroundColors, setBackgroundColors] = useState({
    light: "#ffffff",
    dark: "#121212",
  })
  const [activeTab, setActiveTab] = useState<"light" | "dark">("dark")
  const { addCustomColor } = useThemeStore()

  // Calculate contrast ratios
  const lightContrast = getContrastRatio(color, backgroundColors.light)
  const darkContrast = getContrastRatio(color, backgroundColors.dark)

  // Get accessibility levels
  const lightAccessibility = getAccessibilityLevel(lightContrast)
  const darkAccessibility = getAccessibilityLevel(darkContrast)

  // Get suggested accessible colors
  const suggestedLightColor = getSuggestedAccessibleColor(color, backgroundColors.light)
  const suggestedDarkColor = getSuggestedAccessibleColor(color, backgroundColors.dark)

  // Check if we need to show suggestions
  const needsLightSuggestion = lightContrast < 4.5 && color !== suggestedLightColor
  const needsDarkSuggestion = darkContrast < 4.5 && color !== suggestedDarkColor

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Accessibility Check</h3>

      <Tabs defaultValue="dark" onValueChange={(value) => setActiveTab(value as "light" | "dark")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="light">Light Background</TabsTrigger>
          <TabsTrigger value="dark">Dark Background</TabsTrigger>
        </TabsList>

        <TabsContent value="light" className="space-y-4">
          <div className="flex flex-col gap-2 mt-2">
            <div
              className="p-4 rounded-md flex items-center justify-center"
              style={{ backgroundColor: backgroundColors.light }}
            >
              <span style={{ color }} className="text-lg font-medium">
                Sample Text
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <ContrastIndicator level={lightAccessibility.level} ratio={lightContrast} />
            </div>

            {needsLightSuggestion && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Low contrast on light background</p>
                    <p className="text-sm text-muted-foreground">
                      This color may be difficult to read on light backgrounds.
                    </p>

                    <div className="mt-2">
                      <div
                        className="p-3 rounded-md flex items-center justify-center mb-2"
                        style={{ backgroundColor: backgroundColors.light }}
                      >
                        <span style={{ color: suggestedLightColor }} className="text-lg font-medium">
                          Suggested Text
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md" style={{ backgroundColor: suggestedLightColor }} />
                        <span className="text-sm font-mono">{suggestedLightColor}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                          onClick={() => addCustomColor("Accessible Light", suggestedLightColor)}
                        >
                          Use This Color
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dark" className="space-y-4">
          <div className="flex flex-col gap-2 mt-2">
            <div
              className="p-4 rounded-md flex items-center justify-center"
              style={{ backgroundColor: backgroundColors.dark }}
            >
              <span style={{ color }} className="text-lg font-medium">
                Sample Text
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <ContrastIndicator level={darkAccessibility.level} ratio={darkContrast} />
            </div>

            {needsDarkSuggestion && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Low contrast on dark background</p>
                    <p className="text-sm text-muted-foreground">
                      This color may be difficult to read on dark backgrounds.
                    </p>

                    <div className="mt-2">
                      <div
                        className="p-3 rounded-md flex items-center justify-center mb-2"
                        style={{ backgroundColor: backgroundColors.dark }}
                      >
                        <span style={{ color: suggestedDarkColor }} className="text-lg font-medium">
                          Suggested Text
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md" style={{ backgroundColor: suggestedDarkColor }} />
                        <span className="text-sm font-mono">{suggestedDarkColor}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                          onClick={() => addCustomColor("Accessible Dark", suggestedDarkColor)}
                        >
                          Use This Color
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground mt-2">
        <p>WCAG Guidelines:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>AA requires a contrast ratio of at least 4.5:1 for normal text</li>
          <li>AA requires a contrast ratio of at least 3:1 for large text</li>
          <li>AAA requires a contrast ratio of at least 7:1 for normal text</li>
          <li>AAA requires a contrast ratio of at least 4.5:1 for large text</li>
        </ul>
      </div>
    </div>
  )
}

interface ContrastIndicatorProps {
  level: "Fail" | "AA Large" | "AA" | "AAA Large" | "AAA"
  ratio: number
}

function ContrastIndicator({ level, ratio }: ContrastIndicatorProps) {
  let icon
  let color
  let bgColor

  switch (level) {
    case "Fail":
      icon = <AlertCircle className="h-4 w-4" />
      color = "text-red-500"
      bgColor = "bg-red-100 dark:bg-red-900/20"
      break
    case "AA Large":
      icon = <AlertTriangle className="h-4 w-4" />
      color = "text-yellow-500"
      bgColor = "bg-yellow-100 dark:bg-yellow-900/20"
      break
    case "AA":
    case "AAA Large":
      icon = <CheckCircle2 className="h-4 w-4" />
      color = "text-green-500"
      bgColor = "bg-green-100 dark:bg-green-900/20"
      break
    case "AAA":
      icon = <CheckCircle2 className="h-4 w-4" />
      color = "text-green-600"
      bgColor = "bg-green-100 dark:bg-green-900/20"
      break
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${bgColor}`}>
      <span className={color}>{icon}</span>
      <span className="text-sm font-medium">
        {level} ({ratio.toFixed(2)}:1)
      </span>
    </div>
  )
}
