import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getContrastRatio } from "@/lib/utils/accessibility"

export type AccentColor = {
  id: string
  name: string
  value: string
  hoverValue: string
  textValue: string
  isCustom?: boolean
  accessibilityInfo?: {
    lightContrast: number
    darkContrast: number
    meetsLightAA: boolean
    meetsDarkAA: boolean
  }
}

// Helper function to calculate accessibility info
function calculateAccessibilityInfo(color: string) {
  const lightBackground = "#ffffff"
  const darkBackground = "#121212"

  const lightContrast = getContrastRatio(color, lightBackground)
  const darkContrast = getContrastRatio(color, darkBackground)

  return {
    lightContrast,
    darkContrast,
    meetsLightAA: lightContrast >= 4.5,
    meetsDarkAA: darkContrast >= 4.5,
  }
}

export const predefinedColors: AccentColor[] = [
  {
    id: "blue",
    name: "Blue",
    value: "hsl(215 60% 45%)",
    hoverValue: "hsl(215 60% 40%)",
    textValue: "hsl(210 40% 98%)",
  },
  {
    id: "teal",
    name: "Teal",
    value: "hsl(180 70% 35%)",
    hoverValue: "hsl(180 70% 30%)",
    textValue: "hsl(210 40% 98%)",
  },
  {
    id: "green",
    name: "Green",
    value: "hsl(142 72% 29%)",
    hoverValue: "hsl(142 72% 24%)",
    textValue: "hsl(210 40% 98%)",
  },
  {
    id: "purple",
    name: "Purple",
    value: "hsl(262 83% 58%)",
    hoverValue: "hsl(262 83% 53%)",
    textValue: "hsl(210 40% 98%)",
  },
  {
    id: "rose",
    name: "Rose",
    value: "hsl(346 77% 49%)",
    hoverValue: "hsl(346 77% 44%)",
    textValue: "hsl(210 40% 98%)",
  },
  {
    id: "orange",
    name: "Orange",
    value: "hsl(24 94% 50%)",
    hoverValue: "hsl(24 94% 45%)",
    textValue: "hsl(210 40% 98%)",
  },
].map((color) => ({
  ...color,
  accessibilityInfo: calculateAccessibilityInfo(color.value),
}))

// Helper function to generate hover and text values from a base color
export function generateColorVariants(baseColor: string): { hover: string; text: string } {
  // For simplicity, we'll darken the base color for hover and use white text
  // In a production app, you might want more sophisticated color calculations
  return {
    hover: baseColor,
    text: "hsl(210 40% 98%)",
  }
}

type ThemeState = {
  accentColor: AccentColor
  customColors: AccentColor[]
  setAccentColor: (color: AccentColor) => void
  addCustomColor: (name: string, value: string) => void
  removeCustomColor: (id: string) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: predefinedColors[0], // Default to blue
      customColors: [],
      setAccentColor: (color) => set({ accentColor: color }),
      addCustomColor: (name, value) => {
        const id = `custom-${Date.now()}`
        const { hover, text } = generateColorVariants(value)
        const accessibilityInfo = calculateAccessibilityInfo(value)

        const newColor: AccentColor = {
          id,
          name,
          value,
          hoverValue: hover,
          textValue: text,
          isCustom: true,
          accessibilityInfo,
        }

        set((state) => ({
          customColors: [...state.customColors, newColor],
          accentColor: newColor, // Automatically select the new color
        }))
      },
      removeCustomColor: (id) => {
        const { accentColor, customColors } = get()
        const updatedColors = customColors.filter((color) => color.id !== id)

        // If the current accent color is being removed, switch to the default
        const newState: Partial<ThemeState> = { customColors: updatedColors }
        if (accentColor.id === id) {
          newState.accentColor = predefinedColors[0]
        }

        set(newState)
      },
    }),
    {
      name: "transelgon-theme-store",
    },
  ),
)
