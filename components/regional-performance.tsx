"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Mock data for hospital performance
const revenueData = [
  { name: "Eldoret", current: 4500000, previous: 4200000 },
  { name: "Kitale", current: 3200000, previous: 2800000 },
  { name: "Kimilili", current: 1800000, previous: 1500000 },
  { name: "Lokichar", current: 1200000, previous: 1400000 },
  { name: "Bungoma", current: 3800000, previous: 3500000 },
]

const patientData = [
  { name: "Eldoret", current: 1250, previous: 1180 },
  { name: "Kitale", current: 980, previous: 850 },
  { name: "Kimilili", current: 620, previous: 580 },
  { name: "Lokichar", current: 450, previous: 520 },
  { name: "Bungoma", current: 1050, previous: 980 },
]

// Format data for chart
const formatChartData = (data: any[], metric: string) => {
  return data.map((item) => ({
    name: item.name,
    "Current Month": item.current,
    "Previous Month": item.previous,
    percentChange: ((item.current - item.previous) / item.previous) * 100,
  }))
}

// Format currency
const formatCurrency = (value: number) => {
  return `KES ${value.toLocaleString()}`
}

// Format percentage
const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`
}

interface RegionalPerformanceProps {
  metric: "revenue" | "patients"
}

export function RegionalPerformance({ metric }: RegionalPerformanceProps) {
  const [showPercentage, setShowPercentage] = useState(false)

  const data = metric === "revenue" ? revenueData : patientData
  const chartData = formatChartData(data, metric)

  const formatYAxis = (value: number) => {
    if (metric === "revenue") {
      return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  const formatTooltip = (value: number) => {
    if (metric === "revenue") {
      return formatCurrency(value)
    }
    return value.toString()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">{metric === "revenue" ? "Monthly Revenue" : "Monthly Patient Count"}</h4>
          <p className="text-xs text-muted-foreground">Comparing current month with previous month</p>
        </div>
        <button
          onClick={() => setShowPercentage(!showPercentage)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showPercentage ? "Show Values" : "Show % Change"}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} tickMargin={10} />
          <YAxis tickFormatter={formatYAxis} fontSize={12} />
          <Tooltip
            formatter={(value: number) => formatTooltip(value)}
            labelFormatter={(label) => `${label} Hospital`}
          />
          <Legend wrapperStyle={{ fontSize: "12px", marginTop: "10px" }} />
          {showPercentage ? (
            <Bar
              dataKey="percentChange"
              name="% Change"
              fill="#3182ce"
              radius={[4, 4, 0, 0]}
              formatter={(value: number) => formatPercentage(value)}
            />
          ) : (
            <>
              <Bar dataKey="Current Month" fill="#3182ce" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Previous Month" fill="#90cdf4" radius={[4, 4, 0, 0]} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 pt-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex justify-between items-center rounded-md border p-2">
            <span className="text-xs font-medium">{item.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs">
                {metric === "revenue" ? `KES ${(item["Current Month"] / 1000000).toFixed(1)}M` : item["Current Month"]}
              </span>
              <span className={`text-xs ${item.percentChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                ({item.percentChange >= 0 ? "+" : ""}
                {item.percentChange.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
