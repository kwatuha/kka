import { Card, CardContent } from "@/components/ui/card"
import type { ServicePoint } from "@/lib/data/public-queue-data"
import { Clock, Users, Activity } from "lucide-react"
import { motion } from "framer-motion"

interface QueueEntry {
  queueId: number
  status: string
  estimatedWaitTime: number | null
  arrivalTime: string
}

interface QueueStatsProps {
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

export function QueueStats({ servicePoint, queueData, className = "" }: QueueStatsProps) {
  // Calculate total waiting patients
  const totalWaiting = queueData.filter((entry) => entry.status === "waiting").length
  
  // Calculate total serving
  const totalServing = queueData.filter((entry) => entry.status === "serving").length

  // Calculate average wait time from actual wait times
  const waitingEntries = queueData.filter((entry) => entry.status === "waiting")
  const averageWaitTime =
    waitingEntries.length > 0
      ? Math.round(
          waitingEntries.reduce((sum, entry) => {
            const actualWait = calculateActualWaitTime(entry.arrivalTime)
            const estimatedWait = entry.estimatedWaitTime || actualWait
            return sum + Math.max(actualWait, estimatedWait)
          }, 0) / waitingEntries.length
        )
      : 0

  return (
    <Card className={`${className} shadow-md`}>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Waiting</div>
              <div className="text-3xl font-bold text-foreground">{totalWaiting}</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
          >
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Serving</div>
              <div className="text-3xl font-bold text-foreground">{totalServing}</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-2 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
          >
            <div className="p-2 bg-primary/20 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average Wait Time</div>
              <div className="text-2xl font-bold text-primary">{averageWaitTime} <span className="text-lg text-muted-foreground">min</span></div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}
