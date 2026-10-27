"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function MainRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("HMIS route error:", error)
  }, [error])

  const chunkLike = /Loading chunk|ChunkLoadError|dynamically imported module/i.test(
    error?.message || ""
  )

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">Something went wrong loading this page</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {chunkLike
          ? "This often happens right after a system update when the browser still has an older copy of the app. Reload once to fetch the latest files."
          : "A client error occurred. Try again, or reload the browser tab."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="default" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  )
}
