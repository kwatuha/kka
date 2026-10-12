"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import type { ServicePoint } from "@/lib/data/public-queue-data"
import { queueApi } from "@/lib/api"
import { ServiceSelector } from "./service-selector"
import { NowServing } from "./now-serving"
import { NextInQueue } from "./next-in-queue"
import { QueueStats } from "./queue-stats"
import { QueueList } from "./queue-list"
import { LastCalled } from "./last-called"
import { HospitalInfo } from "./hospital-info"

interface QueueEntry {
  queueId: number
  patientId: number | null
  ticketNumber: string
  servicePoint: string
  servicePointId?: number | null
  servicePointName?: string | null
  status: string
  priority: string
  estimatedWaitTime: number | null
  arrivalTime: string
  calledTime: string | null
  startTime: string | null
  endTime: string | null
  patientFirstName: string | null
  patientLastName: string | null
}

export function QueueDisplayScreen() {
  const searchParams = useSearchParams()
  const roomServicePointId = searchParams.get("servicePointId")
  const urlServicePoint = searchParams.get("servicePoint") as ServicePoint | null
  const [selectedService, setSelectedService] = useState<ServicePoint>(
    urlServicePoint || "triage"
  )
  const [currentTime, setCurrentTime] = useState(new Date())
  const [queueData, setQueueData] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch queue data from API
  const loadQueueData = useCallback(async () => {
    try {
      setError(null)
      const data = await queueApi.getAll(
        selectedService,
        undefined,
        1,
        100,
        false,
        roomServicePointId || undefined
      )
      setQueueData(data as QueueEntry[])
    } catch (err: any) {
      console.error("Error fetching queue data:", err)
      setError("Failed to load queue data")
      setQueueData([])
    } finally {
      setLoading(false)
    }
  }, [selectedService, roomServicePointId])

  // Initial load and when service point changes
  useEffect(() => {
    setLoading(true)
    loadQueueData()
  }, [loadQueueData])

  // Auto-refresh the display every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
      loadQueueData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [loadQueueData])

  // Filter queue data by service point
  const filteredQueueData = queueData.filter(
    (entry) => entry.servicePoint === selectedService
  )

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6 min-h-screen bg-gradient-to-b from-background to-muted/20">
      <HospitalInfo className="mb-2" />

      {roomServicePointId && filteredQueueData[0]?.servicePointName && (
        <p className="text-center text-sm text-muted-foreground">
          Showing queue for <strong>{filteredQueueData[0].servicePointName}</strong>
        </p>
      )}

      <ServiceSelector onChange={setSelectedService} defaultValue={selectedService} />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-center shadow-sm"
        >
          <div className="font-medium">{error}</div>
          <div className="text-sm mt-1">Please refresh the page or contact support</div>
        </motion.div>
      )}

      {loading && queueData.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <div className="text-lg font-medium text-muted-foreground">Loading queue data...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <NowServing 
                servicePoint={selectedService} 
                queueData={filteredQueueData}
              />
              <NextInQueue 
                servicePoint={selectedService} 
                queueData={filteredQueueData}
              />
            </div>

            <div className="flex flex-col gap-6">
              <QueueStats 
                servicePoint={selectedService} 
                queueData={filteredQueueData}
              />
              <QueueList 
                servicePoint={selectedService} 
                queueData={filteredQueueData}
                className="flex-grow" 
              />
            </div>
          </div>

          <LastCalled 
            servicePoint={selectedService}
            queueData={filteredQueueData}
            className="mt-2" 
          />
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-3 text-center shadow-lg z-50 border-t-2 border-primary/20">
        <marquee scrollamount="3" className="font-medium">
          Welcome to Kiplombe Medical Centre. Please take a queue number at the reception desk if you don't have
          one. For assistance, please speak to any of our staff members. Thank you for your patience.
        </marquee>
      </div>
    </div>
  )
}
