"use client"

import { useState, useEffect } from "react"
import { useThemeStore } from "@/lib/stores/theme-store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllPalettes, type ColorPalette } from "@/lib/utils/color-theory"
import { hexToHsl } from "@/lib/utils/color-conversions"
import { getContrastRatio } from "@/lib/utils/accessibility"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface ColorPaletteSuggestionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseColor: string
}

export function ColorPaletteSuggestions({ open, onOpenChange, baseColor }: ColorPaletteSuggestionsProps) {
  const [palettes, setPalettes] = useState<ColorPalette[]>([])
  const { addCustomColor } = useThemeStore()

  useEffect(() => {
    if (open && baseColor) {
      setPalettes(getAllPalettes(baseColor))
    }
  }, [open, baseColor])

  const handleSelectColor = (color: string) => {
    const [h, s, l] = hexToHsl(color)
    const colorName = `${palettes.find((p) => p.colors.includes(color))?.name || "Custom"} ${Math.round(h)}°`
    addCustomColor(colorName, color)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Color Palette Suggestions</DialogTitle>
          <DialogDescription>Choose from harmonious color palettes based on color theory.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="complementary">Complementary</TabsTrigger>
            <TabsTrigger value="analogous">Analogous</TabsTrigger>
            <TabsTrigger value="triadic">Triadic</TabsTrigger>
            <TabsTrigger value="monochromatic">Monochromatic</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {palettes.map((palette) => (
              <PaletteDisplay key={palette.name} palette={palette} onSelectColor={handleSelectColor} />
            ))}
          </TabsContent>

          {["complementary", "analogous", "triadic", "split-complementary", "monochromatic"].map((harmony) => (
            <TabsContent key={harmony} value={harmony} className="space-y-6">
              {palettes
                .filter((p) => p.harmony === harmony)
                .map((palette) => (
                  <PaletteDisplay key={palette.name} palette={palette} onSelectColor={handleSelectColor} />
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface PaletteDisplayProps {
  palette: ColorPalette
  onSelectColor: (color: string) => void
}

function PaletteDisplay({ palette, onSelectColor }: PaletteDisplayProps) {
  // Background colors for accessibility checking
  const lightBackground = "#ffffff"
  const darkBackground = "#121212"

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{palette.name}</h3>
      <div className="flex gap-2">
        {palette.colors.map((color, index) => {
          // Calculate contrast ratios
          const lightContrast = getContrastRatio(color, lightBackground)
          const darkContrast = getContrastRatio(color, darkBackground)

          // Check if meets AA standard (4.5:1)
          const meetsLightAA = lightContrast >= 4.5
          const meetsDarkAA = darkContrast >= 4.5

          return (
            <button
              key={index}
              className="h-16 rounded-md flex-1 relative group hover:ring-2 hover:ring-ring hover:ring-offset-2 transition-all"
              style={{ backgroundColor: color }}
              onClick={() => onSelectColor(color)}
              title={`Use this ${palette.name} color`}
            >
              <div className="absolute bottom-1 left-1 right-1 text-xs bg-background/80 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {color.toUpperCase()}
              </div>

              {/* Accessibility indicators */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  title={`Contrast on light: ${lightContrast.toFixed(1)}:1`}
                  className="flex items-center justify-center h-4 w-4 rounded-full bg-white"
                >
                  {meetsLightAA ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  )}
                </span>
                <span
                  title={`Contrast on dark: ${darkContrast.toFixed(1)}:1`}
                  className="flex items-center justify-center h-4 w-4 rounded-full bg-gray-900"
                >
                  {meetsDarkAA ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  )}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
