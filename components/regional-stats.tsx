"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

// Hospital stats data
const hospitalStats = [
  {
    name: "Eldoret",
    patients: { total: 1250, change: 5.9 },
    revenue: { total: 4500000, change: 7.1 },
    beds: { total: 120, occupied: 98 },
    staff: { doctors: 45, nurses: 98 },
    waitTime: { average: 28, change: -5.2 },
  },
  {
    name: "Kitale",
    patients: { total: 980, change: 15.3 },
    revenue: { total: 3200000, change: 14.3 },
    beds: { total: 85, occupied: 72 },
    staff: { doctors: 32, nurses: 76 },
    waitTime: { average: 35, change: -2.1 },
  },
  {
    name: "Kimilili",
    patients: { total: 620, change: 6.9 },
    revenue: { total: 1800000, change: 20.0 },
    beds: { total: 60, occupied: 48 },
    staff: { doctors: 18, nurses: 42 },
    waitTime: { average: 42, change: 3.8 },
  },
  {
    name: "Lokichar",
    patients: { total: 450, change: -13.5 },
    revenue: { total: 1200000, change: -14.3 },
    beds: { total: 45, occupied: 32 },
    staff: { doctors: 12, nurses: 28 },
    waitTime: { average: 38, change: 8.2 },
  },
  {
    name: "Bungoma",
    patients: { total: 1050, change: 7.1 },
    revenue: { total: 3800000, change: 8.6 },
    beds: { total: 95, occupied: 82 },
    staff: { doctors: 38, nurses: 82 },
    waitTime: { average: 32, change: -4.5 },
  },
]

export function RegionalStats() {
  const [activeTab, setActiveTab] = useState("eldoret")

  return (
    <Tabs defaultValue="eldoret" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-5 h-auto p-1">
        {hospitalStats.map((hospital) => (
          <TabsTrigger key={hospital.name.toLowerCase()} value={hospital.name.toLowerCase()} className="text-xs py-1.5">
            {hospital.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {hospitalStats.map((hospital) => (
        <TabsContent key={hospital.name.toLowerCase()} value={hospital.name.toLowerCase()} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Monthly Patients</div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="text-2xl font-semibold">{hospital.patients.total}</div>
                <div
                  className={`flex items-center text-xs ${
                    hospital.patients.change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {hospital.patients.change >= 0 ? (
                    <ArrowUpIcon className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownIcon className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(hospital.patients.change)}%
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Monthly Revenue</div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="text-2xl font-semibold">{(hospital.revenue.total / 1000000).toFixed(1)}M</div>
                <div
                  className={`flex items-center text-xs ${
                    hospital.revenue.change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {hospital.revenue.change >= 0 ? (
                    <ArrowUpIcon className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownIcon className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(hospital.revenue.change)}%
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Bed Occupancy</div>
            <div className="mt-2 flex items-center">
              <div className="relative h-2 w-full rounded-full bg-muted">
                <div
                  className="absolute h-2 rounded-full bg-blue-500"
                  style={{ width: `${(hospital.beds.occupied / hospital.beds.total) * 100}%` }}
                />
              </div>
              <span className="ml-2 text-xs font-medium">
                {Math.round((hospital.beds.occupied / hospital.beds.total) * 100)}%
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {hospital.beds.occupied} of {hospital.beds.total} beds occupied
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Medical Staff</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Doctors:</span>
                  <span className="font-medium">{hospital.staff.doctors}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Nurses:</span>
                  <span className="font-medium">{hospital.staff.nurses}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Ratio:</span>
                  <span className="font-medium">1:{Math.round(hospital.staff.nurses / hospital.staff.doctors)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Average Wait Time</div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="text-2xl font-semibold">{hospital.waitTime.average}m</div>
                <div
                  className={`flex items-center text-xs ${
                    hospital.waitTime.change <= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {hospital.waitTime.change <= 0 ? (
                    <ArrowDownIcon className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowUpIcon className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(hospital.waitTime.change)}%
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
