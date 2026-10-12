import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServicePoint } from "@/lib/data/public-queue-data"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { motion } from "framer-motion"

interface QueueEntry {
  queueId: number
  ticketNumber: string
  status: string
  estimatedWaitTime: number | null
  patientFirstName: string | null
  patientLastName: string | null
  priority: string
  arrivalTime: string
}

interface QueueListProps {
  servicePoint: ServicePoint
  queueData: QueueEntry[]
  className?: string
}

// Calculate actual wait time from arrival time
const calculateActualWaitTime = (arrivalTime: string): number => {
  const arrival = new Date(arrivalTime).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - arrival) / (1000 * 60)))
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "emergency":
      return "bg-red-100 text-red-800 border-red-300"
    case "urgent":
      return "bg-orange-100 text-orange-800 border-orange-300"
    default:
      return ""
  }
}

export function QueueList({ servicePoint, queueData, className = "" }: QueueListProps) {
  // Get waiting entries, sorted by priority and arrival time
  const waitingEntries = queueData
    .filter((entry) => entry.status === "waiting")
    .sort((a, b) => {
      // Sort by priority (emergency > urgent > normal)
      const priorityOrder: Record<string, number> = { emergency: 0, urgent: 1, normal: 2 }
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by arrival time (earlier first)
      return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
    })

  // Get patient initials for display
  const getPatientInitials = (entry: QueueEntry): string => {
    if (entry.patientFirstName && entry.patientLastName) {
      return `${entry.patientFirstName.charAt(0)}${entry.patientLastName.charAt(0)}`.toUpperCase()
    }
    return "??"
  }

  return (
    <Card className={`${className} shadow-md`}>
      <CardHeader className="py-3 border-b bg-gradient-to-r from-muted/50 to-transparent">
        <CardTitle className="text-lg font-semibold">Current Queue</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {waitingEntries.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Queue #</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patient</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wait Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {waitingEntries.map((entry, index) => {
                  const actualWait = calculateActualWaitTime(entry.arrivalTime)
                  const displayWait = entry.estimatedWaitTime ? Math.max(actualWait, entry.estimatedWaitTime) : actualWait
                  
                  return (
                    <motion.tr
                      key={entry.queueId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                            <span className="font-bold text-primary">{entry.ticketNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {entry.patientFirstName && entry.patientLastName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">{getPatientInitials(entry)}</span>
                            </div>
                            <span className="font-medium">{getPatientInitials(entry)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Anonymous</span>
                        )}
                      </td>
                      <td className="p-3">
                        {entry.priority !== "normal" && (
                          <Badge className={`text-xs ${getPriorityColor(entry.priority)}`}>
                            {entry.priority}
                          </Badge>
                        )}
                        {entry.priority === "normal" && (
                          <span className="text-xs text-muted-foreground">Normal</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="font-medium">
                            {displayWait} min
                          </Badge>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No patients waiting</p>
              <p className="text-sm">Queue is currently empty</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
