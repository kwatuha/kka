"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Hospital locations
const locations = ["Eldoret", "Kitale", "Kimilili", "Lokichar", "Bungoma"]

// Activity types
const activityTypes = [
  { type: "payment", label: "Payment", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { type: "admission", label: "Admission", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  {
    type: "discharge",
    label: "Discharge",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  { type: "emergency", label: "Emergency", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  {
    type: "appointment",
    label: "Appointment",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
]

// Generate a random activity
const generateActivity = () => {
  const location = locations[Math.floor(Math.random() * locations.length)]
  const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)]
  const amount = activityType.type === "payment" ? Math.floor(Math.random() * 10000) + 500 : null
  const patientId = `P${Math.floor(Math.random() * 10000)}`
  const timestamp = new Date()

  return {
    id: Math.random().toString(36).substring(2, 9),
    location,
    type: activityType.type,
    label: activityType.label,
    color: activityType.color,
    amount,
    patientId,
    timestamp,
    isNew: true,
  }
}

export function RegionalActivity() {
  const [activities, setActivities] = useState<any[]>([])

  // Generate initial activities
  useEffect(() => {
    const initialActivities = Array(10)
      .fill(null)
      .map(() => ({
        ...generateActivity(),
        isNew: false,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    setActivities(initialActivities)
  }, [])

  // Add new activities periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newActivity = generateActivity()

      setActivities((prev) => {
        const updated = [newActivity, ...prev.slice(0, 19)]

        // Remove the "new" flag after animation
        setTimeout(() => {
          setActivities((current) =>
            current.map((activity) => (activity.id === newActivity.id ? { ...activity, isNew: false } : activity)),
          )
        }, 3000)

        return updated
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins === 1) return "1 minute ago"
    if (diffMins < 60) return `${diffMins} minutes ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    return `${diffHours} hours ago`
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-1 pr-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start justify-between rounded-md border p-3 ${
              activity.isNew ? "animate-fadeIn bg-muted/50" : ""
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={activity.color} variant="outline">
                  {activity.label}
                </Badge>
                <span className="text-sm font-medium">{activity.location}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {activity.type === "payment"
                  ? `Payment of KES ${activity.amount} received`
                  : `Patient ${activity.patientId}`}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
