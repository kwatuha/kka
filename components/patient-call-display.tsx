"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Clock, User } from "lucide-react"
import { getServicePointName, type ServicePoint } from "@/lib/data/queue-data"
import { queueApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

interface PatientCallDisplayProps {
  servicePoint: ServicePoint
  counterNumber: number
}

interface CalledPatient {
  queueId: string
  ticketNumber: string
  patientName: string
  patientNumber?: string
  status: string
  calledTime: string | null
  startTime: string | null
  priority: string
}

export function PatientCallDisplay({ servicePoint, counterNumber }: PatientCallDisplayProps) {
  const [calledPatient, setCalledPatient] = useState<CalledPatient | null>(null)
  const [isNewCall, setIsNewCall] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastCalledTime, setLastCalledTime] = useState<string | null>(null)

  // Fetch queue data from API
  useEffect(() => {
    const loadQueueData = async () => {
      try {
        setLoading(true)
        
        // Fetch all queue entries for this service point with status 'called' or 'serving'
        const data = await queueApi.getAll(servicePoint, undefined, undefined, false)
        
        // Filter for called or serving patients, sorted by calledTime or startTime
        const activePatients = data
          .filter((entry: any) => 
            entry.status === 'called' || entry.status === 'serving'
          )
          .map((entry: any) => ({
            queueId: entry.queueId?.toString() || '',
            ticketNumber: entry.ticketNumber || '',
            patientName: entry.patientFirstName && entry.patientLastName
              ? `${entry.patientFirstName} ${entry.patientLastName}`
              : 'Unknown Patient',
            patientNumber: entry.patientNumber || '',
            status: entry.status || 'called',
            calledTime: entry.calledTime || entry.startTime || null,
            startTime: entry.startTime || null,
            priority: entry.priority || 'normal'
          }))
          .sort((a: CalledPatient, b: CalledPatient) => {
            // Sort by calledTime or startTime, most recent first
            const timeA = a.calledTime || a.startTime || ''
            const timeB = b.calledTime || b.startTime || ''
            return new Date(timeB).getTime() - new Date(timeA).getTime()
          })

        // Assign patients to counters based on order
        // Counter 1 gets the most recently called/serving patient
        // Counter 2 gets the second, etc.
        const patientForThisCounter = activePatients[counterNumber - 1] || null

        if (patientForThisCounter) {
          // Check if this is a new call (different patient or new call time)
          const isNew = 
            !calledPatient || 
            calledPatient.queueId !== patientForThisCounter.queueId ||
            (patientForThisCounter.calledTime && 
             patientForThisCounter.calledTime !== lastCalledTime)

          if (isNew && patientForThisCounter.calledTime) {
            setLastCalledTime(patientForThisCounter.calledTime)
            setIsNewCall(true)
            // Reset the new call highlight after 5 seconds
            setTimeout(() => {
              setIsNewCall(false)
            }, 5000)
          }

          setCalledPatient(patientForThisCounter)
        } else {
          setCalledPatient(null)
        }
      } catch (error) {
        console.error('Error loading queue data:', error)
        setCalledPatient(null)
      } finally {
        setLoading(false)
      }
    }

    // Load immediately
    loadQueueData()

    // Auto-refresh every 5 seconds to get real-time updates
    const interval = setInterval(loadQueueData, 5000)

    return () => clearInterval(interval)
  }, [servicePoint, counterNumber, calledPatient?.queueId, lastCalledTime])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{getServicePointName(servicePoint)}</span>
            <Badge variant="outline">Counter {counterNumber}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="space-y-2 w-full">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!calledPatient) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{getServicePointName(servicePoint)}</span>
            <Badge variant="outline">Counter {counterNumber}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Waiting for next patient call</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const calledTime = calledPatient.calledTime 
    ? new Date(calledPatient.calledTime) 
    : calledPatient.startTime 
      ? new Date(calledPatient.startTime)
      : new Date()

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-500/10 text-red-700 border-red-500'
      case 'urgent':
        return 'bg-orange-500/10 text-orange-700 border-orange-500'
      default:
        return 'bg-primary/10 text-primary border-primary'
    }
  }

  return (
    <Card className={`${isNewCall ? "animate-pulse border-primary shadow-lg" : ""} transition-all duration-300`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>{getServicePointName(servicePoint)}</span>
          <Badge variant="outline">Counter {counterNumber}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bell className={`h-6 w-6 ${isNewCall ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
            <h3 className="text-lg font-medium">
              {calledPatient.status === 'serving' ? 'Now Serving' : 'Now Calling'}
            </h3>
          </div>

          <div className={`rounded-lg py-8 px-6 border-2 ${getPriorityColor(calledPatient.priority)} shadow-lg`}>
            <div className="text-7xl font-bold mb-4 tracking-tight">#{calledPatient.ticketNumber}</div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <User className="h-6 w-6" />
              <p className="text-xl font-semibold">{calledPatient.patientName}</p>
            </div>
            {calledPatient.patientNumber && (
              <p className="text-base text-muted-foreground mb-3">
                Patient: {calledPatient.patientNumber}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {calledPatient.status === 'serving' && calledPatient.startTime
                  ? `Started at ${new Date(calledPatient.startTime).toLocaleTimeString()}`
                  : `Called at ${calledTime.toLocaleTimeString()}`
                }
              </p>
            </div>
            {calledPatient.priority !== 'normal' && (
              <div className="mt-3">
                <Badge 
                  variant={calledPatient.priority === 'emergency' ? 'destructive' : 'default'}
                  className="text-sm"
                >
                  {calledPatient.priority.toUpperCase()}
                </Badge>
              </div>
            )}
          </div>

          <p className="mt-6 text-base font-medium">
            Please proceed to Counter {counterNumber}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
