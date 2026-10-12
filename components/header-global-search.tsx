"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * Global header search — routes to Patient Care with the query applied.
 * Module-specific lists still have their own filters.
 */
export function HeaderGlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const submit = useCallback(() => {
    const term = query.trim()
    if (!term) {
      router.push("/patients")
      return
    }
    router.push(`/patients?q=${encodeURIComponent(term)}`)
  }, [query, router])

  return (
    <form
      className="relative ml-1 hidden min-w-0 flex-1 md:block md:max-w-[10rem] lg:max-w-[12rem] xl:max-w-52 2xl:max-w-64"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      role="search"
      aria-label="Search patients"
    >
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search patients…"
        className="h-8 w-full rounded-full border-border/80 bg-card pl-8 text-sm shadow-sm sm:h-9"
        autoComplete="off"
        enterKeyHint="search"
      />
    </form>
  )
}
