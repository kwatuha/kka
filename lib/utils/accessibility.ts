import { hexToRgb } from "./color-conversions"

// Calculate relative luminance for a color (WCAG formula)
export function getRelativeLuminance(color: string): number {
  const [r, g, b] = hexToRgb(color).map((c) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1)
  const luminance2 = getRelativeLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

// Check if contrast meets WCAG AA standards
export function meetsWCAGAA(color1: string, color2: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(color1, color2)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

// Check if contrast meets WCAG AAA standards
export function meetsWCAGAAA(color1: string, color2: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(color1, color2)
  return isLargeText ? ratio >= 4.5 : ratio >= 7
}

// Get accessibility level description
export function getAccessibilityLevel(ratio: number): {
  level: "Fail" | "AA Large" | "AA" | "AAA Large" | "AAA"
  description: string
} {
  if (ratio < 3) {
    return {
      level: "Fail",
      description: "Fails WCAG standards",
    }
  } else if (ratio < 4.5) {
    return {
      level: "AA Large",
      description: "Passes AA for large text only",
    }
  } else if (ratio < 7) {
    return {
      level: "AA",
      description: "Passes AA for all text",
    }
  } else {
    return {
      level: "AAA",
      description: "Passes AAA for all text",
    }
  }
}

// Get a color with better contrast against a background
export function getSuggestedAccessibleColor(foreground: string, background: string, targetRatio = 4.5): string {
  // This is a simplified approach - in a real implementation, you might want
  // a more sophisticated algorithm that preserves the hue while adjusting
  // lightness/darkness

  const [r, g, b] = hexToRgb(foreground)
  let newR = r,
    newG = g,
    newB = b
  const step = 10
  let attempts = 0
  const maxAttempts = 25 // Prevent infinite loops

  let currentRatio = getContrastRatio(foreground, background)

  // If we're already meeting the target, return the original color
  if (currentRatio >= targetRatio) return foreground

  // Determine if we need to lighten or darken
  const bgLuminance = getRelativeLuminance(background)
  const shouldLighten = bgLuminance < 0.5

  while (currentRatio < targetRatio && attempts < maxAttempts) {
    if (shouldLighten) {
      // Lighten the color
      newR = Math.min(255, newR + step)
      newG = Math.min(255, newG + step)
      newB = Math.min(255, newB + step)
    } else {
      // Darken the color
      newR = Math.max(0, newR - step)
      newG = Math.max(0, newG - step)
      newB = Math.max(0, newB - step)
    }

    const newColor = `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`
    currentRatio = getContrastRatio(newColor, background)
    attempts++
  }

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`
}
