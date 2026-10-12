"use client"

import { useEffect, useState } from "react"
import { laboratoryApi } from "@/lib/api"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Phone, UserRound, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type LabDestinationOption = {
  labId: number
  labCode: string
  labName: string
  branchId: number
  branchName?: string
  isDefault?: boolean
  location?: string
  contactPerson?: string
  phone?: string
  email?: string
  notes?: string
  waitingCount?: number
  openOrderCount?: number
  facilityLabQueueWaiting?: number
  isPreferred?: boolean
}

type Props = {
  testTypeIds: Array<number | string>
  branchId?: string | number | null
  value?: string
  onChange: (labId: string, lab?: LabDestinationOption | null) => void
  disabled?: boolean
}

export function LabDestinationPicker({ testTypeIds, branchId, value, onChange, disabled }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [labs, setLabs] = useState<LabDestinationOption[]>([])
  const [preferredLabId, setPreferredLabId] = useState<number | null>(null)
  const [matchMode, setMatchMode] = useState<string>("")
  const [infoLab, setInfoLab] = useState<LabDestinationOption | null>(null)

  useEffect(() => {
    const ids = (testTypeIds || []).map(String).filter(Boolean)
    if (!ids.length || !branchId) {
      setLabs([])
      setPreferredLabId(null)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await laboratoryApi.getLabsForTests(ids, String(branchId))
        if (cancelled) return
        const list = (data.labs || []) as LabDestinationOption[]
        setLabs(list)
        setPreferredLabId(data.preferredLabId)
        setMatchMode(data.matchMode || "")
        if (!value && data.preferredLabId) {
          const preferred = list.find((l) => l.labId === data.preferredLabId) || list[0]
          if (preferred) onChange(String(preferred.labId), preferred)
        } else if (value && !list.some((l) => String(l.labId) === value) && list[0]) {
          onChange(String(list[0].labId), list[0])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load laboratories")
          setLabs([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // intentionally omit onChange from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(testTypeIds), branchId])

  if (!testTypeIds?.length) {
    return <p className="text-xs text-muted-foreground">Select a test to see available laboratories.</p>
  }
  if (!branchId) {
    return <p className="text-xs text-muted-foreground">Facility context required to pick a laboratory.</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Laboratory destination *</Label>
        {matchMode === "any" ? (
          <Badge variant="outline" className="text-[10px]">
            Partial catalog match
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding labs that offer this test…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : labs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No laboratory units are configured for these tests at this facility.
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {labs.map((lab) => {
            const selected = String(lab.labId) === String(value)
            const preferred = lab.isPreferred || lab.labId === preferredLabId
            return (
              <div
                key={lab.labId}
                className={`rounded-lg border p-3 text-sm ${selected ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    className="text-left flex-1"
                    onClick={() => onChange(String(lab.labId), lab)}
                  >
                    <div className="font-medium flex flex-wrap items-center gap-2">
                      {lab.labName}
                      {preferred ? <Badge className="text-[10px]">Preferred</Badge> : null}
                      {lab.isDefault ? <Badge variant="secondary" className="text-[10px]">Default</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {lab.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lab.location}
                        </div>
                      ) : null}
                      <div>
                        Open lab orders: {lab.waitingCount ?? lab.openOrderCount ?? 0}
                        {lab.facilityLabQueueWaiting != null
                          ? ` · Facility lab queue: ${lab.facilityLabQueueWaiting}`
                          : ""}
                      </div>
                    </div>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setInfoLab(lab)}
                    title="Lab directions / contacts"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={!!infoLab} onOpenChange={(open) => !open && setInfoLab(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{infoLab?.labName}</DialogTitle>
            <DialogDescription>
              Share this with the patient if they need help finding the laboratory.
            </DialogDescription>
          </DialogHeader>
          {infoLab ? (
            <div className="space-y-3 text-sm">
              {infoLab.location ? (
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-muted-foreground">{infoLab.location}</div>
                  </div>
                </div>
              ) : null}
              {infoLab.contactPerson ? (
                <div className="flex gap-2">
                  <UserRound className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">In-charge / contact</div>
                    <div className="text-muted-foreground">{infoLab.contactPerson}</div>
                  </div>
                </div>
              ) : null}
              {infoLab.phone ? (
                <div className="flex gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Phone</div>
                    <div className="text-muted-foreground">{infoLab.phone}</div>
                  </div>
                </div>
              ) : null}
              {infoLab.email ? (
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-muted-foreground">{infoLab.email}</div>
                </div>
              ) : null}
              {infoLab.notes ? (
                <div>
                  <div className="font-medium">Directions / notes</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">{infoLab.notes}</div>
                </div>
              ) : null}
              {!infoLab.location && !infoLab.contactPerson && !infoLab.phone && !infoLab.notes ? (
                <p className="text-muted-foreground">
                  No location or contact details configured for this lab yet. Update them under Settings →
                  Laboratories.
                </p>
              ) : null}
              <Button type="button" className="w-full" onClick={() => {
                onChange(String(infoLab.labId), infoLab)
                setInfoLab(null)
              }}>
                Use this laboratory
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
