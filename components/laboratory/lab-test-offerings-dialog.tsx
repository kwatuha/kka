"use client"

import { useEffect, useMemo, useState } from "react"
import { laboratoryApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lab: { labId: number; labName: string } | null
}

export function LabTestOfferingsDialog({ open, onOpenChange, lab }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [catalog, setCatalog] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open || !lab) return
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [types, offeringsRes] = await Promise.all([
          laboratoryApi.getTestTypes(undefined, undefined, 1, 500),
          laboratoryApi.getLabOfferings(String(lab.labId)),
        ])
        if (cancelled) return
        setCatalog(types || [])
        const activeIds = new Set(
          (offeringsRes.offerings || [])
            .filter((o: any) => o.isActive)
            .map((o: any) => Number(o.testTypeId))
        )
        setSelected(activeIds)
      } catch (err: any) {
        toast({
          title: "Failed to load offerings",
          description: err?.message || "Try again",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, lab])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (t) =>
        String(t.testName || "").toLowerCase().includes(q) ||
        String(t.testCode || "").toLowerCase().includes(q) ||
        String(t.category || "").toLowerCase().includes(q)
    )
  }, [catalog, search])

  const toggle = (testTypeId: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(testTypeId)
      else next.delete(testTypeId)
      return next
    })
  }

  const save = async () => {
    if (!lab) return
    try {
      setSaving(true)
      await laboratoryApi.updateLabOfferings(String(lab.labId), Array.from(selected))
      toast({
        title: "Test catalog updated",
        description: `${lab.labName} now offers ${selected.size} test type(s).`,
      })
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not update offerings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tests offered — {lab?.labName}</DialogTitle>
          <DialogDescription>
            Clinicians will only see this laboratory when ordering mapped tests (unless no mappings exist yet).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Search tests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set(catalog.map((t) => Number(t.testTypeId))))}
              >
                Select all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{selected.size} selected</p>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading catalog…
            </div>
          ) : (
            <div className="flex-1 overflow-auto rounded-md border divide-y max-h-[50vh]">
              {filtered.map((t) => {
                const id = Number(t.testTypeId)
                const checked = selected.has(id)
                return (
                  <label
                    key={id}
                    className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggle(id, v === true)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{t.testName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[t.testCode, t.category].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                )
              })}
              {!filtered.length ? (
                <p className="p-4 text-sm text-muted-foreground">No tests match your search.</p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save offerings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
