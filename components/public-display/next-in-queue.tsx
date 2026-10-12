import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServicePoint } from "@/lib/data/public-queue-data"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface QueueEntry {
  queueId: number
  ticketNumber: string
  status: string
  priority: string
  estimatedWaitTime: number | null
  arrivalTime: string
}

interface NextInQueueProps {
  servicePoint: ServicePoint
  queueData: QueueEntry[]
  className?: string
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "emergency":
      return "bg-red-100 text-red-800 border-red-300"
    case "urgent":
      return "bg-orange-100 text-orange-800 border-orange-300"
    default:
      return "bg-blue-100 text-blue-800 border-blue-300"
  }
}

export function NextInQueue({ servicePoint, queueData, className = "" }: NextInQueueProps) {
  // Get next 3 patients in queue (waiting status, sorted by priority and arrival time)
  const nextInQueue = queueData
    .filter((entry) => entry.status === "waiting")
    .sort((a, b) => {
      // Sort by priority (emergency > urgent > normal)
      const priorityOrder: Record<string, number> = { emergency: 0, urgent: 1, normal: 2 }
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by arrival time (earlier first)
      return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
    })
    .slice(0, 3)

  return (
    <Card className={`${className} shadow-md`}>
      <CardHeader className="bg-gradient-to-r from-muted to-muted/80 py-3">
        <CardTitle className="text-center text-lg font-semibold">NEXT IN QUEUE</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center justify-center min-h-[180px]">
        {nextInQueue.length > 0 ? (
          <div className="flex flex-wrap gap-4 justify-center w-full">
            {nextInQueue.map((entry, index) => (
              <motion.div
                key={entry.queueId}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-muted to-muted/80 rounded-full border-2 border-muted-foreground/30 shadow-md">
                    <span className="text-3xl font-bold text-foreground">{entry.ticketNumber}</span>
                  </div>
                  {entry.priority !== "normal" && (
                    <Badge
                      className={`absolute -top-2 -right-2 text-xs px-1.5 py-0.5 ${getPriorityColor(entry.priority)}`}
                    >
                      {entry.priority}
                    </Badge>
                  )}
                </div>
                {entry.estimatedWaitTime && (
                  <span className="text-xs text-muted-foreground">~{entry.estimatedWaitTime} min</span>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-xl font-medium text-muted-foreground py-8 flex items-center gap-2">
            <div className="w-2 h-2 bg-muted-foreground rounded-full" />
            Queue is empty
          </div>
        )}
      </CardContent>
    </Card>
  )
}
