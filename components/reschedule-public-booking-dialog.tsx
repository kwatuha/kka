"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { publicBookingsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import type { PublicBooking } from "@/lib/public-bookings"

type Props = {
  booking: PublicBooking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReschedulePublicBookingDialog({ booking, open, onOpenChange, onSuccess }: Props) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (booking && open) {
      setDate(booking.preferredDate || "")
      setTime((booking.preferredTime || "").slice(0, 5))
      setReason("")
    }
  }, [booking, open])

  const save = async () => {
    if (!booking?.requestId) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast({ title: "Invalid date", description: "Use YYYY-MM-DD", variant: "destructive" })
      return
    }
    if (!time.trim()) {
      toast({ title: "Time required", variant: "destructive" })
      return
    }
    try {
      setSaving(true)
      const result = await publicBookingsApi.reschedule(booking.requestId, {
        preferredDate: date,
        preferredTime: time,
        reason: reason.trim() || undefined,
      })
      toast({
        title: "Booking rescheduled",
        description: result?.smsSent
          ? `New slot ${date} ${time}. Patient notified by SMS.`
          : `Updated to ${date} ${time}.`,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast({
        title: "Reschedule failed",
        description: err?.message || "Could not update booking",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule online booking</DialogTitle>
          <DialogDescription>
            {booking ? (
              <>
                {booking.firstName} {booking.lastName} · {booking.code} · {booking.clinic}
              </>
            ) : (
              "Update the patient's preferred date and time."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <Label htmlFor="reschedule-date">New date</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="reschedule-time">New time</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="reschedule-reason">Reason (optional)</Label>
            <Textarea
              id="reschedule-reason"
              placeholder="e.g. Patient requested different day"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save new slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
