import { Badge } from "@/components/ui/badge"
import { type QueueStatus, getQueueStatusColor } from "@/lib/data/queue-data"

interface QueueStatusBadgeProps {
  status: QueueStatus
  className?: string
}

export function QueueStatusBadge({ status, className = "" }: QueueStatusBadgeProps) {
  const statusLabels = {
    waiting: "Waiting",
    "in-service": "In Service",
    completed: "Completed",
    "no-show": "No Show",
    rescheduled: "Rescheduled",
  }

  return <Badge className={`${getQueueStatusColor(status)} ${className}`}>{statusLabels[status]}</Badge>
}
