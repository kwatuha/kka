"use client"

import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

export function QueueTabsIndicator() {
  const [showIndicator, setShowIndicator] = useState(true)

  useEffect(() => {
    // Hide the indicator after 5 seconds
    const timer = setTimeout(() => {
      setShowIndicator(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  if (!showIndicator) return null

  return (
    <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none animate-pulse">
      <div className="bg-gradient-to-r from-transparent to-background/90 pr-2 pl-6 py-2 flex items-center">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground ml-1">Scroll for more</span>
      </div>
    </div>
  )
}
