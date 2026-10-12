"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getActiveServicePoints, getDisplayName, type ServicePoint } from "@/lib/data/public-queue-data"
import { motion } from "framer-motion"

interface ServiceSelectorProps {
  onChange: (servicePoint: ServicePoint) => void
  defaultValue?: ServicePoint
  className?: string
}

export function ServiceSelector({ onChange, defaultValue = "triage", className = "" }: ServiceSelectorProps) {
  const [activeServicePoints, setActiveServicePoints] = useState<ServicePoint[]>([])

  useEffect(() => {
    // In a real implementation, this would fetch from an API
    const points = getActiveServicePoints()
    // Make sure triage is included and is first
    setActiveServicePoints(points.length > 0 ? points : ["triage", "consultation", "pharmacy", "laboratory"])
  }, [])

  return (
    <div className={className}>
      <Tabs defaultValue={defaultValue} onValueChange={(value) => onChange(value as ServicePoint)}>
        <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50 p-1 shadow-md">
          {activeServicePoints.map((point, index) => (
            <motion.div
              key={point}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <TabsTrigger 
                value={point} 
                className="py-4 px-6 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                {getDisplayName(point)}
              </TabsTrigger>
            </motion.div>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
