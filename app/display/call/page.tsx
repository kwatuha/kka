"use client"

import { PatientCallDisplay } from "@/components/patient-call-display"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getServicePointName } from "@/lib/data/queue-data"
import type { ServicePoint } from "@/lib/data/queue-data"
import { Clock, Users } from "lucide-react"
import { useState, useEffect } from "react"

export default function PatientCallDisplayPage() {
  const servicePoints: ServicePoint[] = ["triage", "consultation", "laboratory", "radiology", "pharmacy", "billing", "cashier"]
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">Patient Call Display</h1>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>{currentTime.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <p className="text-muted-foreground text-center">
            Real-time patient call information for all service points
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Service Point Tabs */}
      <Tabs defaultValue="triage" className="w-full">
        <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7 h-auto p-1">
          {servicePoints.map((point) => (
            <TabsTrigger key={point} value={point} className="flex-1 text-sm font-medium">
              {getServicePointName(point)}
            </TabsTrigger>
          ))}
        </TabsList>

        {servicePoints.map((point) => (
          <TabsContent key={point} value={point} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PatientCallDisplay servicePoint={point} counterNumber={1} />
              <PatientCallDisplay servicePoint={point} counterNumber={2} />
              <PatientCallDisplay servicePoint={point} counterNumber={3} />
            </div>
            {point === "cashier" && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>Additional counters may be available. Please check with staff if your number is not displayed.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
