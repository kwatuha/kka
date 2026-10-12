"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { geographyApi } from "@/lib/api"
import { DEFAULT_FACILITY_COUNTY } from "@/lib/patient-demographics"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"

export type KenyaLocationValue = {
  county: string
  subcounty: string
  ward: string
}

type Props = {
  value: KenyaLocationValue
  onChange: (next: KenyaLocationValue) => void
  defaultCounty?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function KenyaLocationSelect({
  value,
  onChange,
  defaultCounty = DEFAULT_FACILITY_COUNTY,
  disabled = false,
  required = true,
  className,
}: Props) {
  const [counties, setCounties] = useState<string[]>([])
  const [subcounties, setSubcounties] = useState<string[]>([])
  const [wards, setWards] = useState<{ id: number; name: string; pcode: string | null }[]>([])
  const [loadingCounties, setLoadingCounties] = useState(true)
  const [loadingSub, setLoadingSub] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const req = required ? " *" : ""

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoadingCounties(true)
        setGeoError(null)
        const list = await geographyApi.getCounties()
        if (cancelled) return
        setCounties(list)
        if (!value.county && list.length) {
          const pick = list.find((c) => c.toLowerCase() === defaultCounty.toLowerCase()) || list[0]
          if (pick) onChange({ county: pick, subcounty: "", ward: "" })
        }
      } catch (err: any) {
        if (!cancelled) setGeoError(err?.message || "Could not load counties")
      } finally {
        if (!cancelled) setLoadingCounties(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCounty])

  const loadSubcounties = useCallback(async (county: string) => {
    if (!county) {
      setSubcounties([])
      return
    }
    setLoadingSub(true)
    try {
      const list = await geographyApi.getSubcounties(county)
      setSubcounties(list)
    } catch {
      setSubcounties([])
    } finally {
      setLoadingSub(false)
    }
  }, [])

  const loadWards = useCallback(async (county: string, subcounty: string) => {
    if (!county || !subcounty) {
      setWards([])
      return
    }
    setLoadingWards(true)
    try {
      const list = await geographyApi.getWards(county, subcounty)
      setWards(list)
    } catch {
      setWards([])
    } finally {
      setLoadingWards(false)
    }
  }, [])

  useEffect(() => {
    void loadSubcounties(value.county)
  }, [value.county, loadSubcounties])

  useEffect(() => {
    void loadWards(value.county, value.subcounty)
  }, [value.county, value.subcounty, loadWards])

  const countyOptions = useMemo(
    () => counties.map((c) => ({ value: c, label: c })),
    [counties]
  )
  const subcountyOptions = useMemo(
    () => subcounties.map((s) => ({ value: s, label: s })),
    [subcounties]
  )
  const wardOptions = useMemo(
    () => wards.map((w) => ({ value: w.name, label: w.name })),
    [wards]
  )

  return (
    <div className={className}>
      {geoError ? (
        <p className="mb-2 text-xs text-destructive">
          {geoError}. Run migration 138 and import Kenya wards data on the server.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>County{req}</Label>
          {loadingCounties ? (
            <div className="flex h-10 items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <SearchableSelect
              value={value.county}
              onValueChange={(county) => onChange({ county, subcounty: "", ward: "" })}
              options={countyOptions}
              placeholder="Search county…"
              disabled={disabled || !countyOptions.length}
              emptyMessage="No county found."
              modal
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Sub-county{req}</Label>
          {loadingSub ? (
            <div className="flex h-10 items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <SearchableSelect
              value={value.subcounty}
              onValueChange={(subcounty) => onChange({ ...value, subcounty, ward: "" })}
              options={subcountyOptions}
              placeholder={value.county ? "Search sub-county…" : "Choose county first"}
              disabled={disabled || !value.county || !subcountyOptions.length}
              emptyMessage="No sub-county found."
              modal
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Ward{req}</Label>
          {loadingWards ? (
            <div className="flex h-10 items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <SearchableSelect
              value={value.ward}
              onValueChange={(ward) => onChange({ ...value, ward })}
              options={wardOptions}
              placeholder={value.subcounty ? "Search ward…" : "Choose sub-county first"}
              disabled={disabled || !value.subcounty || !wardOptions.length}
              emptyMessage="No ward found."
              contentClassName="max-h-[min(320px,50vh)]"
              modal
            />
          )}
        </div>
      </div>
    </div>
  )
}
