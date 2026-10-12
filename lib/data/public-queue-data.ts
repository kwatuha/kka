import type { ServicePointType, QueueStatus, Priority, ServicePoint } from "./queue-data"

// Re-export ServicePoint for convenience
export type { ServicePoint }

export interface PublicQueueEntry {
  ticketNumber: string
  queueNumber?: string // Alias for ticketNumber for compatibility
  servicePoint: ServicePointType
  status: QueueStatus
  priority: Priority
  estimatedWaitTime?: number // in minutes
  isAnonymous?: boolean
  displayInitials?: string
}

// Simplified public queue data
export const publicQueueData: PublicQueueEntry[] = [
  {
    ticketNumber: "T001",
    queueNumber: "T001",
    servicePoint: "triage",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 15,
    isAnonymous: false,
    displayInitials: "JK",
  },
  {
    ticketNumber: "T002",
    queueNumber: "T002",
    servicePoint: "triage",
    status: "waiting",
    priority: "urgent",
    estimatedWaitTime: 5,
    isAnonymous: false,
    displayInitials: "SW",
  },
  {
    ticketNumber: "C001",
    queueNumber: "C001",
    servicePoint: "consultation",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 20,
    isAnonymous: false,
    displayInitials: "MO",
  },
  {
    ticketNumber: "P001",
    queueNumber: "P001",
    servicePoint: "pharmacy",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 10,
    isAnonymous: false,
    displayInitials: "EA",
  },
  {
    ticketNumber: "L001",
    queueNumber: "L001",
    servicePoint: "laboratory",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 30,
    isAnonymous: false,
    displayInitials: "DM",
  },
]

export const activeServicePoints: ServicePointType[] = ["triage", "consultation", "pharmacy", "laboratory"]

export function getPublicQueueEntriesByServicePoint(servicePoint: ServicePointType): PublicQueueEntry[] {
  return publicQueueData.filter((entry) => entry.servicePoint === servicePoint)
}

export function getNowServingByServicePoint(servicePoint: ServicePointType): string | null {
  const servingEntry = publicQueueData.find(
    (entry) => entry.servicePoint === servicePoint && entry.status === "serving",
  )
  return servingEntry ? servingEntry.ticketNumber : null
}

export function getNextInQueueByServicePoint(servicePoint: ServicePointType): string | null {
  const waitingEntries = publicQueueData.filter(
    (entry) => entry.servicePoint === servicePoint && entry.status === "waiting",
  )

  if (waitingEntries.length === 0) return null

  // Sort by priority (emergency > urgent > normal) and then by estimated wait time
  const sortedEntries = waitingEntries.sort((a, b) => {
    const priorityOrder = { emergency: 0, urgent: 1, normal: 2 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff

    return (a.estimatedWaitTime || 0) - (b.estimatedWaitTime || 0)
  })

  return sortedEntries[0].ticketNumber
}

// Get next N tickets in queue for a service point
export function getNextInQueue(servicePoint: ServicePointType, count: number = 3): string[] {
  const waitingEntries = publicQueueData.filter(
    (entry) => entry.servicePoint === servicePoint && entry.status === "waiting",
  )

  if (waitingEntries.length === 0) return []

  // Sort by priority (emergency > urgent > normal) and then by estimated wait time
  const sortedEntries = waitingEntries.sort((a, b) => {
    const priorityOrder = { emergency: 0, urgent: 1, normal: 2 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff

    return (a.estimatedWaitTime || 0) - (b.estimatedWaitTime || 0)
  })

  return sortedEntries.slice(0, count).map((entry) => entry.ticketNumber)
}

// Get currently serving tickets for a service point
export function getCurrentlyServing(servicePoint: ServicePointType): string[] {
  const servingEntries = publicQueueData.filter(
    (entry) => entry.servicePoint === servicePoint && entry.status === "serving",
  )
  return servingEntries.map((entry) => entry.ticketNumber)
}

// Get public queue data for a service point
export function getPublicQueueData(servicePoint: ServicePointType): PublicQueueEntry[] {
  return publicQueueData
    .filter((entry) => entry.servicePoint === servicePoint)
    .map((entry) => ({
      ...entry,
      queueNumber: entry.queueNumber || entry.ticketNumber,
    }))
}

// Get average wait time for a service point
export function getAverageWaitTime(servicePoint: ServicePointType): number {
  const waitingEntries = publicQueueData.filter(
    (entry) => entry.servicePoint === servicePoint && entry.status === "waiting",
  )

  if (waitingEntries.length === 0) return 0

  const totalWaitTime = waitingEntries.reduce(
    (sum, entry) => sum + (entry.estimatedWaitTime || 0),
    0,
  )

  return Math.round(totalWaitTime / waitingEntries.length)
}

// Get total number of patients waiting for a service point
export function getTotalWaiting(servicePoint: ServicePointType): number {
  return publicQueueData.filter(
    (entry) => entry.servicePoint === servicePoint && entry.status === "waiting",
  ).length
}

// Get active service points
export function getActiveServicePoints(): ServicePointType[] {
  return activeServicePoints
}

// Get display name for a service point
export function getDisplayName(servicePoint: ServicePointType): string {
  const names: Record<ServicePointType, string> = {
    triage: "Triage",
    consultation: "Consultation",
    pharmacy: "Pharmacy",
    laboratory: "Laboratory",
    radiology: "Radiology",
    billing: "Billing",
  }
  return names[servicePoint] || servicePoint
}
