"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { ServicePoint } from "@/lib/data/public-queue-data"

interface QueueEntry {
  queueId: number
  ticketNumber: string
  status: string
  calledTime: string | null
  servicePoint: string
}

interface LastCalledProps {
  servicePoint: ServicePoint
  queueData: QueueEntry[]
  className?: string
}

const getDisplayName = (servicePoint: string): string => {
  const names: Record<string, string> = {
    triage: "Triage",
    consultation: "Consultation",
    pharmacy: "Pharmacy",
    laboratory: "Laboratory",
    radiology: "Radiology",
    billing: "Billing",
    telemedicine: "Telemedicine",
    procedure: "Procedure",
  }
  return names[servicePoint] || servicePoint
}

export function LastCalled({ servicePoint, queueData, className = "" }: LastCalledProps) {
  const [lastCalled, setLastCalled] = useState<{ ticketNumber: string; servicePoint: string } | null>(null)
  const [visible, setVisible] = useState(false)

  // Find the most recently called patient
  useEffect(() => {
    // Get called patients, sorted by calledTime (most recent first)
    const calledEntries = queueData
      .filter((entry) => entry.status === "called" && entry.calledTime)
      .sort((a, b) => {
        const timeA = a.calledTime ? new Date(a.calledTime).getTime() : 0
        const timeB = b.calledTime ? new Date(b.calledTime).getTime() : 0
        return timeB - timeA // Most recent first
      })

    if (calledEntries.length > 0) {
      const mostRecent = calledEntries[0]
      const newCalled = {
        ticketNumber: mostRecent.ticketNumber,
        servicePoint: mostRecent.servicePoint,
      }

      // Only update if it's different from the current one
      if (
        !lastCalled ||
        lastCalled.ticketNumber !== newCalled.ticketNumber ||
        lastCalled.servicePoint !== newCalled.servicePoint
      ) {
        setLastCalled(newCalled)
        setVisible(true)

        // Hide after 10 seconds
        setTimeout(() => {
          setVisible(false)
        }, 10000)
      }
    }
  }, [queueData, servicePoint, lastCalled])

  if (!lastCalled) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={className}
        >
          <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100/50 shadow-lg">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-75" />
                <div className="relative bg-amber-500 p-3 rounded-full">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-grow">
                <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Now Calling</div>
                <div className="text-2xl font-bold text-foreground">
                  Patient <span className="text-amber-600">{lastCalled.ticketNumber}</span> to{" "}
                  <span className="text-primary">{getDisplayName(lastCalled.servicePoint)}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
