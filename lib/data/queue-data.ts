export type ServicePointType =
  | "triage"
  | "registration"
  | "consultation"
  | "pharmacy"
  | "laboratory"
  | "radiology"
  | "billing"
  | "cashier"
  | "telemedicine"
  | "procedure"

// Alias for compatibility
export type ServicePoint = ServicePointType

export type QueueStatus = "waiting" | "called" | "serving" | "completed" | "no-show" | "cancelled"

export type Priority = "normal" | "urgent" | "emergency"

export interface QueueEntry {
  id: string
  patientId: string
  patientName: string
  servicePoint: ServicePointType
  ticketNumber: string
  status: QueueStatus
  priority: Priority
  estimatedWaitTime?: number // in minutes
  arrivalTime: string // ISO string
  startTime?: string // ISO string
  endTime?: string // ISO string
}

// Simplified queue data with fewer entries
export const queueData: QueueEntry[] = [
  {
    id: "1",
    patientId: "P001",
    patientName: "John Kimani",
    servicePoint: "triage",
    ticketNumber: "T001",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 15,
    arrivalTime: new Date().toISOString(),
  },
  {
    id: "2",
    patientId: "P002",
    patientName: "Sarah Wanjiku",
    servicePoint: "triage",
    ticketNumber: "T002",
    status: "waiting",
    priority: "urgent",
    estimatedWaitTime: 5,
    arrivalTime: new Date().toISOString(),
  },
  {
    id: "3",
    patientId: "P003",
    patientName: "Michael Omondi",
    servicePoint: "consultation",
    ticketNumber: "C001",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 20,
    arrivalTime: new Date().toISOString(),
  },
  {
    id: "4",
    patientId: "P004",
    patientName: "Elizabeth Achieng",
    servicePoint: "pharmacy",
    ticketNumber: "P001",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 10,
    arrivalTime: new Date().toISOString(),
  },
  {
    id: "5",
    patientId: "P005",
    patientName: "David Mwangi",
    servicePoint: "laboratory",
    ticketNumber: "L001",
    status: "waiting",
    priority: "normal",
    estimatedWaitTime: 30,
    arrivalTime: new Date().toISOString(),
  },
]

export const servicePoints: ServicePointType[] = [
  "triage",
  "consultation",
  "pharmacy",
  "laboratory",
  "radiology",
  "billing",
  "cashier",
]

export function getQueueEntriesByServicePoint(servicePoint: ServicePointType): QueueEntry[] {
  return queueData.filter((entry) => entry.servicePoint === servicePoint)
}

// Alias for compatibility with existing components
export const getQueueByServicePoint = getQueueEntriesByServicePoint

export function getQueueEntryById(id: string): QueueEntry | undefined {
  return queueData.find((entry) => entry.id === id)
}

// Helper function to get human-readable service point name
export function getServicePointName(servicePoint: ServicePointType): string {
  const names: Record<ServicePointType, string> = {
    triage: "Triage",
    registration: "Registration",
    consultation: "Consultation",
    pharmacy: "Pharmacy",
    laboratory: "Laboratory",
    radiology: "Radiology",
    billing: "Billing",
    cashier: "Cashier",
    telemedicine: "Telemedicine",
    procedure: "Procedure",
  }
  return names[servicePoint] || servicePoint
}

// Helper function to get color class for queue status
export function getQueueStatusColor(status: QueueStatus): string {
  const colors: Record<QueueStatus, string> = {
    waiting: "bg-yellow-100 text-yellow-800 border-yellow-300",
    serving: "bg-blue-100 text-blue-800 border-blue-300",
    completed: "bg-green-100 text-green-800 border-green-300",
    "no-show": "bg-gray-100 text-gray-800 border-gray-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
  }
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300"
}

// Helper function to get patient queue status
export function getPatientQueueStatus(patientId: string, servicePoint?: ServicePointType): QueueEntry | null {
  const entries = servicePoint
    ? queueData.filter((entry) => entry.patientId === patientId && entry.servicePoint === servicePoint)
    : queueData.filter((entry) => entry.patientId === patientId)
  
  // Return the most recent entry (waiting or serving status preferred)
  const activeEntry = entries.find((entry) => entry.status === "waiting" || entry.status === "serving")
  return activeEntry || entries[0] || null
}

// Helper function to calculate wait time
export function calculateWaitTime(entry: QueueEntry): number {
  if (entry.startTime) {
    return 0 // Already being served
  }
  
  const arrivalTime = new Date(entry.arrivalTime).getTime()
  const now = Date.now()
  const waitMinutes = Math.floor((now - arrivalTime) / (1000 * 60))
  
  return Math.max(0, waitMinutes)
}

// Helper function to get priority color
export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    normal: "bg-blue-100 text-blue-800 border-blue-300",
    urgent: "bg-orange-100 text-orange-800 border-orange-300",
    emergency: "bg-red-100 text-red-800 border-red-300",
  }
  return colors[priority] || "bg-gray-100 text-gray-800 border-gray-300"
}
