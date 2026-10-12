"use client"

import { useThemeStore, predefinedColors, type AccentColor } from "@/lib/stores/theme-store"
import { Check, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { CustomColorCreator } from "./custom-color-creator"
import { PaletteSuggestionButton } from "./palette-suggestion-button"
import { AccessibilityCheckerDialog } from "./accessibility-checker-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AccentColorPicker() {
  const { accentColor, customColors, setAccentColor, removeCustomColor } = useThemeStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: accentColor.value }} />
          <span className="sr-only">Toggle accent color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 p-1">
          {predefinedColors.map((color) => (
            <ColorItem
              key={color.id}
              color={color}
              isSelected={color.id === accentColor.id}
              onClick={() => setAccentColor(color)}
            />
          ))}
        </div>

        {customColors.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Custom Colors</span>
              <CustomColorCreator />
            </DropdownMenuLabel>
            <div className="grid grid-cols-3 gap-1 p-1">
              {customColors.map((color) => (
                <div key={color.id} className="relative group">
                  <ColorItem
                    color={color}
                    isSelected={color.id === accentColor.id}
                    onClick={() => setAccentColor(color)}
                  />
                  <button
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCustomColor(color.id)
                    }}
                    title={`Delete ${color.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {customColors.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Add Custom Color</span>
              <CustomColorCreator />
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 flex justify-between">
          <PaletteSuggestionButton baseColor={accentColor.value} />
          <AccessibilityCheckerDialog color={accentColor.value} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ColorItemProps {
  color: AccentColor
  isSelected: boolean
  onClick: () => void
}

function ColorItem({ color, isSelected, onClick }: ColorItemProps) {
  const accessibilityInfo = color.accessibilityInfo || {
    lightContrast: 0,
    darkContrast: 0,
    meetsLightAA: false,
    meetsDarkAA: false,
  }

  const { meetsLightAA, meetsDarkAA } = accessibilityInfo
  const meetsAccessibility = meetsLightAA || meetsDarkAA

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full relative",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            )}
            style={{ backgroundColor: color.value }}
            onClick={onClick}
          >
            {isSelected && <Check className="h-4 w-4 text-white" />}

            {/* Accessibility indicator */}
            {!meetsAccessibility && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border border-background">
                <AlertCircle className="h-3 w-3 text-white" />
              </div>
            )}

            <span className="sr-only">{color.name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{color.name}</p>
          <div className="flex gap-2 mt-1 text-xs">
            <span className={meetsLightAA ? "text-green-500" : "text-red-500"}>{meetsLightAA ? "✓" : "✗"} Light</span>
            <span className={meetsDarkAA ? "text-green-500" : "text-red-500"}>{meetsDarkAA ? "✓" : "✗"} Dark</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
