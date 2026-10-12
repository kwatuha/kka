"use client"

import { useState, useEffect } from "react"
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
import { assetApi } from "@/lib/api"

interface AssetComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  excludeAssigned?: boolean // Exclude assets that are already assigned
}

export function AssetCombobox({
  value,
  onValueChange,
  placeholder = "Search asset by code, name, or category...",
  disabled = false,
  excludeAssigned = false,
}: AssetComboboxProps) {
  const [open, setOpen] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      setLoading(true)
      let allAssets = await assetApi.getAll()

      // If excludeAssigned is true, filter out assets that have active assignments
      if (excludeAssigned && allAssets) {
        const currentAssignments = await assetApi.getCurrentAssignments()
        const assignedAssetIds = new Set(
          currentAssignments.map((a: any) => a.assetId)
        )
        allAssets = allAssets.filter((asset: any) => !assignedAssetIds.has(asset.assetId))
      }

      setAssets(allAssets || [])
    } catch (error) {
      console.error("Error loading assets:", error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = assets.filter((asset) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      asset.assetCode?.toLowerCase().includes(query) ||
      asset.assetName?.toLowerCase().includes(query) ||
      asset.category?.toLowerCase().includes(query) ||
      asset.serialNumber?.toLowerCase().includes(query) ||
      asset.location?.toLowerCase().includes(query)
    )
  })

  const selectedAsset = assets.find((asset) => asset.assetId.toString() === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading assets...
            </>
          ) : selectedAsset ? (
            <>
              {selectedAsset.assetCode} - {selectedAsset.assetName}
              {selectedAsset.category && ` (${selectedAsset.category})`}
            </>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading assets..." : "No asset found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredAssets.map((asset) => (
                <CommandItem
                  key={asset.assetId}
                  value={asset.assetId.toString()}
                  onSelect={() => {
                    onValueChange(asset.assetId.toString())
                    setOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === asset.assetId.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {asset.assetCode} - {asset.assetName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {asset.category}
                      {asset.location && ` • ${asset.location}`}
                      {asset.serialNumber && ` • S/N: ${asset.serialNumber}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
