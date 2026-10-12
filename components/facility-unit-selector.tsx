"use client"

import { FlaskConical, Pill } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFacilityUnits } from "@/lib/hooks/use-facility-units"

type FacilityUnitSelectorProps = {
  mode: "pharmacy" | "laboratory"
  className?: string
}

export function FacilityUnitSelector({ mode, className }: FacilityUnitSelectorProps) {
  const {
    drugStores,
    laboratories,
    currentStoreId,
    currentLabId,
    setCurrentStoreId,
    setCurrentLabId,
    loadingStores,
    loadingLabs,
  } = useFacilityUnits()

  if (mode === "pharmacy") {
    if (loadingStores || drugStores.length === 0) return null
    const selected = drugStores.find((s) => String(s.storeId) === String(currentStoreId))
    return (
      <div className={className}>
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Active pharmacy store
          </p>
          <Select
            value={currentStoreId ? String(currentStoreId) : undefined}
            onValueChange={(value) => setCurrentStoreId(Number(value))}
          >
            <SelectTrigger className="h-9 w-[min(100%,16rem)] gap-2">
              <Pill className="h-4 w-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Pharmacy store" />
            </SelectTrigger>
            <SelectContent>
              {drugStores.map((store) => (
                <SelectItem key={store.storeId} value={String(store.storeId)}>
                  {store.storeName}
                  {store.isDispensingStore ? " (Dispensing)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected?.isDispensingStore ? (
            <p className="text-[11px] text-emerald-800">Dispensing from this store</p>
          ) : selected ? (
            <p className="text-[11px] text-muted-foreground">Stock / warehouse store</p>
          ) : null}
        </div>
      </div>
    )
  }

  if (loadingLabs || laboratories.length === 0) return null
  return (
    <div className={className}>
      <Select
        value={currentLabId ? String(currentLabId) : undefined}
        onValueChange={(value) => setCurrentLabId(Number(value))}
      >
        <SelectTrigger className="h-9 w-[min(100%,16rem)] gap-2">
          <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Laboratory unit" />
        </SelectTrigger>
        <SelectContent>
          {laboratories.map((lab) => (
            <SelectItem key={lab.labId} value={String(lab.labId)}>
              {lab.labName}
              {lab.isDefault ? " (Default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
