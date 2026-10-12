import { hslToHex, hexToHsl } from "./color-conversions"

// Types for our color harmony functions
export type ColorHarmony = "complementary" | "analogous" | "triadic" | "split-complementary" | "monochromatic"

export type ColorPalette = {
  name: string
  colors: string[] // Hex colors
  harmony: ColorHarmony
}

// Convert hue to a value between 0 and 360
const normalizeHue = (hue: number): number => ((hue % 360) + 360) % 360

// Generate a complementary color (opposite on the color wheel)
export function getComplementaryPalette(baseColor: string): ColorPalette {
  const [h, s, l] = hexToHsl(baseColor)
  const complementHue = normalizeHue(h + 180)

  return {
    name: "Complementary",
    colors: [baseColor, hslToHex(complementHue, s, l)],
    harmony: "complementary",
  }
}

// Generate analogous colors (adjacent on the color wheel)
export function getAnalogousPalette(baseColor: string): ColorPalette {
  const [h, s, l] = hexToHsl(baseColor)

  return {
    name: "Analogous",
    colors: [hslToHex(normalizeHue(h - 30), s, l), baseColor, hslToHex(normalizeHue(h + 30), s, l)],
    harmony: "analogous",
  }
}

// Generate triadic colors (three colors equally spaced)
export function getTriadicPalette(baseColor: string): ColorPalette {
  const [h, s, l] = hexToHsl(baseColor)

  return {
    name: "Triadic",
    colors: [baseColor, hslToHex(normalizeHue(h + 120), s, l), hslToHex(normalizeHue(h + 240), s, l)],
    harmony: "triadic",
  }
}

// Generate split-complementary colors
export function getSplitComplementaryPalette(baseColor: string): ColorPalette {
  const [h, s, l] = hexToHsl(baseColor)

  return {
    name: "Split-Complementary",
    colors: [baseColor, hslToHex(normalizeHue(h + 150), s, l), hslToHex(normalizeHue(h + 210), s, l)],
    harmony: "split-complementary",
  }
}

// Generate monochromatic colors (variations of the same hue)
export function getMonochromaticPalette(baseColor: string): ColorPalette {
  const [h, s, l] = hexToHsl(baseColor)

  return {
    name: "Monochromatic",
    colors: [hslToHex(h, s, Math.max(0, l - 0.3)), baseColor, hslToHex(h, s, Math.min(0.9, l + 0.3))],
    harmony: "monochromatic",
  }
}

// Generate all palette types for a given color
export function getAllPalettes(baseColor: string): ColorPalette[] {
  return [
    getComplementaryPalette(baseColor),
    getAnalogousPalette(baseColor),
    getTriadicPalette(baseColor),
    getSplitComplementaryPalette(baseColor),
    getMonochromaticPalette(baseColor),
  ]
}
