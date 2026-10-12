"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { radiologyApi } from "@/lib/api"

export interface ExamTypeOption {
  examTypeId: number
  examName: string
  examCode?: string
  category?: string
  cost?: number
}

interface ExamTypeComboboxProps {
  value?: string
  onValueChange: (value: string, examType?: ExamTypeOption) => void
  placeholder?: string
  disabled?: boolean
  category?: string
  /** Restrict options to this list; search is client-side */
  staticExamTypes?: ExamTypeOption[]
  /** For label lookup when value is set but not in static list */
  catalogForLookup?: ExamTypeOption[]
}

export function ExamTypeCombobox({
  value,
  onValueChange,
  placeholder = "Search examination type...",
  disabled = false,
  category,
  staticExamTypes,
  catalogForLookup,
}: ExamTypeComboboxProps) {
  const isStaticMode = staticExamTypes !== undefined
  const [open, setOpen] = React.useState(false)
  const [examTypes, setExamTypes] = React.useState<ExamTypeOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    if (isStaticMode) return
    if (open) {
      loadExamTypes("")
    } else {
      setSearchQuery("")
    }
  }, [open, category, isStaticMode])

  React.useEffect(() => {
    if (isStaticMode) return
    if (value && examTypes.length === 0 && !loading && !open) {
      loadExamTypes("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isStaticMode])

  React.useEffect(() => {
    if (isStaticMode || !open) return
    const timer = setTimeout(() => {
      loadExamTypes(searchQuery.trim() || "")
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, open, category, isStaticMode])

  const loadExamTypes = async (search?: string) => {
    try {
      setLoading(true)
      const data = await radiologyApi.getExamTypes(search || "", category, 1, 1000)
      setExamTypes(Array.isArray(data) ? data : [])
    } catch (error: unknown) {
      console.error("Error loading exam types:", error)
      setExamTypes([])
    } finally {
      setLoading(false)
    }
  }

  const displayList = isStaticMode ? staticExamTypes! : examTypes

  const selectedExam = React.useMemo(() => {
    if (!value) return undefined
    const id = value
    const fromDisplay = displayList.find((e) => e.examTypeId.toString() === id)
    if (fromDisplay) return fromDisplay
    return catalogForLookup?.find((e) => e.examTypeId.toString() === id)
  }, [value, displayList, catalogForLookup])

  const getDisplay = (e: ExamTypeOption) => {
    let display = e.examName
    if (e.category) display += ` (${e.category})`
    if (e.cost != null && e.cost !== undefined) {
      display += ` - KES ${parseFloat(String(e.cost)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    }
    return display
  }

  const handleSelect = (exam: ExamTypeOption) => {
    onValueChange(exam.examTypeId.toString(), exam)
    setOpen(false)
    if (!isStaticMode) setSearchQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedExam ? (
            <span className="truncate">{getDisplay(selectedExam)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[100vw] p-0"
        align="start"
      >
        {isStaticMode ? (
          <Command shouldFilter>
            <CommandInput placeholder="Search by name, code, or category..." />
            <CommandList>
              <CommandEmpty>No examination types match your search.</CommandEmpty>
              <CommandGroup>
                {displayList.map((exam) => (
                  <CommandItem
                    key={exam.examTypeId}
                    value={`${exam.examName} ${exam.examCode || ""} ${exam.category || ""}`}
                    onSelect={() => handleSelect(exam)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === exam.examTypeId.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{exam.examName}</div>
                      {(exam.category || exam.cost != null) && (
                        <div className="text-xs text-muted-foreground">
                          {exam.category}
                          {exam.category && exam.cost != null && " • "}
                          {exam.cost != null &&
                            `KES ${parseFloat(String(exam.cost)).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <Command>
            <CommandInput
              placeholder="Search examination type..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {searchQuery ? `No types found for "${searchQuery}"` : "No examination types available"}
                  </CommandEmpty>
                  <CommandGroup>
                    {displayList.map((exam) => (
                      <CommandItem
                        key={exam.examTypeId}
                        value={`${exam.examName} ${exam.examCode || ""} ${exam.category || ""}`}
                        onSelect={() => handleSelect(exam)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === exam.examTypeId.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{exam.examName}</div>
                          {(exam.category || exam.cost != null) && (
                            <div className="text-xs text-muted-foreground">
                              {exam.category}
                              {exam.category && exam.cost != null && " • "}
                              {exam.cost != null &&
                                `KES ${parseFloat(String(exam.cost)).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
