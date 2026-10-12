"use client"

import { useAppThemeId } from "@/lib/hooks/use-app-theme"
import { CHART_SERIES_PROFESSIONAL, getChartChrome } from "@/lib/chart-chrome"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Jan",
    Inpatients: 65,
    Outpatients: 120,
    Emergency: 28,
  },
  {
    name: "Feb",
    Inpatients: 59,
    Outpatients: 110,
    Emergency: 32,
  },
  {
    name: "Mar",
    Inpatients: 80,
    Outpatients: 145,
    Emergency: 35,
  },
  {
    name: "Apr",
    Inpatients: 81,
    Outpatients: 132,
    Emergency: 30,
  },
  {
    name: "May",
    Inpatients: 56,
    Outpatients: 125,
    Emergency: 27,
  },
  {
    name: "Jun",
    Inpatients: 55,
    Outpatients: 105,
    Emergency: 24,
  },
  {
    name: "Jul",
    Inpatients: 40,
    Outpatients: 98,
    Emergency: 20,
  },
]

export function DashboardChart() {
  const themeId = useAppThemeId()
  const chrome = getChartChrome(themeId)
  const series =
    themeId === "professional-blue"
      ? CHART_SERIES_PROFESSIONAL
      : { primary: "#3b82f6", secondary: "#10b981", tertiary: "#ef4444" }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} />
        <XAxis
          dataKey="name"
          stroke={chrome.axis}
          tick={{ fill: chrome.axis, fontSize: 10 }}
          tickLine={{ stroke: chrome.tickLine }}
          axisLine={{ stroke: chrome.tickLine }}
        />
        <YAxis
          stroke={chrome.axis}
          tick={{ fill: chrome.axis, fontSize: 10 }}
          tickLine={{ stroke: chrome.tickLine }}
          axisLine={{ stroke: chrome.tickLine }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chrome.tooltipBg,
            color: chrome.tooltipFg,
            border: `1px solid ${chrome.tooltipBorder}`,
            fontSize: "11px",
            padding: "4px 8px",
          }}
          itemStyle={{ fontSize: "10px" }}
          labelStyle={{ fontSize: "10px", fontWeight: "bold" }}
        />
        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} iconSize={8} iconType="circle" />
        <Bar dataKey="Inpatients" fill={series.primary} radius={[2, 2, 0, 0]} barSize={6} />
        <Bar dataKey="Outpatients" fill={series.secondary} radius={[2, 2, 0, 0]} barSize={6} />
        <Bar dataKey="Emergency" fill={series.tertiary} radius={[2, 2, 0, 0]} barSize={6} />
      </BarChart>
    </ResponsiveContainer>
  )
}
