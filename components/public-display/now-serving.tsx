import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServicePoint } from "@/lib/data/public-queue-data"
import { motion } from "framer-motion"

interface QueueEntry {
  queueId: number
  ticketNumber: string
  status: string
}

interface NowServingProps {
  servicePoint: ServicePoint
  queueData: QueueEntry[]
  className?: string
}

export function NowServing({ servicePoint, queueData, className = "" }: NowServingProps) {
  // Filter for currently serving patients
  const currentlyServing = queueData
    .filter((entry) => entry.status === "serving")
    .map((entry) => entry.ticketNumber)

  return (
    <Card className={`${className} border-2 border-primary shadow-lg overflow-hidden`}>
      <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-4">
        <CardTitle className="text-center text-2xl font-bold tracking-wide">NOW SERVING</CardTitle>
      </CardHeader>
      <CardContent className="p-8 flex flex-col items-center justify-center min-h-[200px] bg-gradient-to-b from-primary/5 to-transparent">
        {currentlyServing.length > 0 ? (
          <div className="flex flex-wrap gap-6 justify-center">
            {currentlyServing.map((ticketNumber, index) => (
              <motion.div
                key={ticketNumber}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="relative"
              >
                <div className="flex items-center justify-center w-32 h-32 bg-gradient-to-br from-primary to-primary/80 rounded-full border-4 border-primary shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                  <span className="text-5xl font-bold text-primary-foreground relative z-10 drop-shadow-lg">
                    {ticketNumber}
                  </span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-ping" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-2xl font-medium text-muted-foreground py-8 flex items-center gap-3">
            <div className="w-3 h-3 bg-muted-foreground rounded-full animate-pulse" />
            No patients currently being served
          </div>
        )}
      </CardContent>
    </Card>
  )
}
