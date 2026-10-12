import type { AppThemeId } from "@/lib/app-themes"

/** Recharts axis/grid/tooltip colors aligned with app themes. */
export function getChartChrome(themeId: AppThemeId) {
  if (themeId === "dark") {
    return {
      grid: "#334155",
      axis: "#94a3b8",
      tickLine: "#475569",
      tooltipBg: "#1e293b",
      tooltipFg: "#f8fafc",
      tooltipBorder: "#475569",
    }
  }

  if (themeId === "professional-blue") {
    return {
      grid: "hsl(214 28% 86%)",
      axis: "hsl(215 22% 38%)",
      tickLine: "hsl(214 28% 78%)",
      tooltipBg: "hsl(210 40% 99%)",
      tooltipFg: "hsl(215 45% 14%)",
      tooltipBorder: "hsl(214 28% 84%)",
    }
  }

  return {
    grid: "#e5e7eb",
    axis: "#374151",
    tickLine: "#d1d5db",
    tooltipBg: "#ffffff",
    tooltipFg: "#111827",
    tooltipBorder: "#e5e7eb",
  }
}

export const CHART_SERIES_PROFESSIONAL = {
  primary: "hsl(201 77% 38%)",
  secondary: "hsl(205 72% 48%)",
  tertiary: "hsl(215 58% 35%)",
} as const
