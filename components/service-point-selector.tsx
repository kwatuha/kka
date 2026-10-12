"use client"

import { MapPin } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServicePoints } from "@/lib/hooks/use-service-points"

type ServicePointSelectorProps = {
  pointType?: string
  className?: string
}

export function ServicePointSelector({ pointType, className }: ServicePointSelectorProps) {
  const {
    servicePoints,
    currentServicePointId,
    setCurrentServicePointId,
    loading,
  } = useServicePoints(pointType)

  if (loading || servicePoints.length <= 1) return null

  return (
    <div className={className}>
      <Select
        value={currentServicePointId ? String(currentServicePointId) : undefined}
        onValueChange={(value) => setCurrentServicePointId(Number(value))}
      >
        <SelectTrigger className="h-9 w-[min(100%,18rem)] gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Working desk / window" />
        </SelectTrigger>
        <SelectContent>
          {servicePoints.map((point) => (
            <SelectItem key={point.servicePointId} value={String(point.servicePointId)}>
              {point.pointName}
              {point.isDefault ? " (Default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
