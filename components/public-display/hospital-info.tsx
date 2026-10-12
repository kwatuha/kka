"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { HospitalLogoWithIcon } from "@/components/hospital-logo-with-icon"

interface HospitalInfoProps {
  className?: string
}

export function HospitalInfo({ className = "" }: HospitalInfoProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const timeString = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const dateString = currentTime.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card className={`${className} border-2 shadow-lg`}>
      <CardContent className="p-6 flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-4">
          <HospitalLogoWithIcon className="h-14" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kiplombe Medical Centre</h1>
            <p className="text-sm text-muted-foreground">Queue Management System</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-primary tabular-nums">{timeString}</div>
          <div className="text-sm text-muted-foreground font-medium">{dateString}</div>
        </div>
      </CardContent>
    </Card>
  )
}
