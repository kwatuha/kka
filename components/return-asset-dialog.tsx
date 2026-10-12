"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface ReturnAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  assignment: any
}

export function ReturnAssetDialog({
  open,
  onOpenChange,
  onSuccess,
  assignment,
}: ReturnAssetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [returnDate, setReturnDate] = useState<Date>(new Date())
  const [conditionAtReturn, setConditionAtReturn] = useState<string>("good")
  const [returnNotes, setReturnNotes] = useState<string>("")

  useEffect(() => {
    if (open && assignment) {
      setReturnDate(new Date())
      setConditionAtReturn("good")
      setReturnNotes("")
    }
  }, [open, assignment])

  async function handleReturn() {
    if (!assignment) return

    try {
      setIsSubmitting(true)

      const payload: any = {
        returnDate: format(returnDate, "yyyy-MM-dd"),
        conditionAtReturn,
        returnNotes: returnNotes || null,
      }

      await assetApi.returnAssignment(assignment.assignmentId.toString(), payload)

      toast({
        title: "Success",
        description: "Asset returned successfully",
      })

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error returning asset:", error)
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to return asset"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!assignment) return null

  const conditions = [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>
            Record the return of this asset. The assignment will be marked as returned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <div className="text-sm font-medium">
              {assignment.assetCode} - {assignment.assetName}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned To</Label>
            <div className="text-sm font-medium">
              {assignment.assignedToFirstName} {assignment.assignedToLastName}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Return Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`w-full justify-start text-left font-normal ${!returnDate ? "text-muted-foreground" : ""}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={returnDate} onSelect={(date) => date && setReturnDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Condition at Return *</Label>
            <Select value={conditionAtReturn} onValueChange={setConditionAtReturn}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((condition) => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Return Notes</Label>
            <Textarea
              placeholder="Notes about the return (damage, issues, etc.)..."
              className="min-h-[80px]"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleReturn} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Return Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
