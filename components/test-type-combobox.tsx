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
import { laboratoryApi } from "@/lib/api"

interface TestType {
  testTypeId: number
  testName: string
  testCode?: string
  category?: string
  cost?: number
}

interface TestTypeComboboxProps {
  value?: string
  onValueChange: (value: string, testType?: TestType) => void
  placeholder?: string
  disabled?: boolean
  category?: string
  /**
   * When set, options come only from this list (no API). Search is client-side (name, code, category).
   * Use for forms that must restrict tests (e.g. encounter: exclude already-ordered types).
   */
  staticTestTypes?: TestType[]
  /** Full catalog for label lookup when `value` is set but not in `staticTestTypes` */
  catalogForLookup?: TestType[]
}

export function TestTypeCombobox({
  value,
  onValueChange,
  placeholder = "Search test type...",
  disabled = false,
  category,
  staticTestTypes,
  catalogForLookup,
}: TestTypeComboboxProps) {
  const isStaticMode = staticTestTypes !== undefined
  const [open, setOpen] = React.useState(false)
  const [testTypes, setTestTypes] = React.useState<TestType[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Load test types when popover opens (API mode only)
  React.useEffect(() => {
    if (isStaticMode) return
    if (open) {
      loadTestTypes("")
    } else {
      setSearchQuery("")
    }
  }, [open, category, isStaticMode])

  // Load test types when value is provided (for editing) but list is empty (API mode only)
  React.useEffect(() => {
    if (isStaticMode) return
    if (value && testTypes.length === 0 && !loading && !open) {
      loadTestTypes("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isStaticMode])

  // Debounced search — API mode only
  React.useEffect(() => {
    if (isStaticMode || !open) return

    const timer = setTimeout(() => {
      loadTestTypes(searchQuery.trim() || "")
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open, category, isStaticMode])

  const loadTestTypes = async (search?: string) => {
    try {
      setLoading(true)
      const data = await laboratoryApi.getTestTypes(search || "", category, 1, 1000)
      setTestTypes(Array.isArray(data) ? data : [])

      if (process.env.NODE_ENV === "development") {
        console.log(`Loaded ${data?.length || 0} test types${search ? ` for search: "${search}"` : ""}`)
      }
    } catch (error: unknown) {
      console.error("Error loading test types:", error)
      setTestTypes([])
    } finally {
      setLoading(false)
    }
  }

  const displayList = isStaticMode ? staticTestTypes! : testTypes

  const selectedTestType = React.useMemo(() => {
    if (!value) return undefined
    const id = value
    const fromDisplay = displayList.find((t) => t.testTypeId.toString() === id)
    if (fromDisplay) return fromDisplay
    return catalogForLookup?.find((t) => t.testTypeId.toString() === id)
  }, [value, displayList, catalogForLookup])

  const getTestTypeDisplay = (testType: TestType) => {
    let display = testType.testName
    if (testType.category) {
      display += ` (${testType.category})`
    }
    if (testType.cost) {
      display += ` - KES ${parseFloat(testType.cost.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return display
  }

  const handleSelect = (testType: TestType) => {
    onValueChange(testType.testTypeId.toString(), testType)
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
          {selectedTestType ? (
            <span className="truncate">{getTestTypeDisplay(selectedTestType)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[100vw] p-0" align="start">
        {isStaticMode ? (
          <Command shouldFilter>
            <CommandInput placeholder="Search test type by name, code, or category..." />
            <CommandList>
              <CommandEmpty>No test types match your search.</CommandEmpty>
              <CommandGroup>
                {displayList.map((testType) => (
                  <CommandItem
                    key={testType.testTypeId}
                    value={`${testType.testName} ${testType.testCode || ""} ${testType.category || ""}`}
                    onSelect={() => handleSelect(testType)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === testType.testTypeId.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{testType.testName}</div>
                      {(testType.category || testType.cost) && (
                        <div className="text-xs text-muted-foreground">
                          {testType.category && `${testType.category}`}
                          {testType.category && testType.cost && " • "}
                          {testType.cost &&
                            `KES ${parseFloat(testType.cost.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
              placeholder="Search test type by name, code, or category..."
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
                    {searchQuery ? `No test types found for "${searchQuery}"` : "No test types available"}
                  </CommandEmpty>
                  <CommandGroup>
                    {displayList.map((testType) => (
                      <CommandItem
                        key={testType.testTypeId}
                        value={`${testType.testName} ${testType.testCode || ""} ${testType.category || ""}`}
                        onSelect={() => handleSelect(testType)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === testType.testTypeId.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{testType.testName}</div>
                          {(testType.category || testType.cost) && (
                            <div className="text-xs text-muted-foreground">
                              {testType.category && `${testType.category}`}
                              {testType.category && testType.cost && " • "}
                              {testType.cost &&
                                `KES ${parseFloat(testType.cost.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
