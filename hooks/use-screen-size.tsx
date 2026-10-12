"use client"

import { useState, useEffect } from "react"

type ScreenSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>("md")

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setScreenSize("xs")
      } else if (width >= 640 && width < 768) {
        setScreenSize("sm")
      } else if (width >= 768 && width < 1024) {
        setScreenSize("md")
      } else if (width >= 1024 && width < 1280) {
        setScreenSize("lg")
      } else if (width >= 1280 && width < 1536) {
        setScreenSize("xl")
      } else {
        setScreenSize("2xl")
      }
    }

    // Set initial size
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return screenSize
}
