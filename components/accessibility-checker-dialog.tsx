"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ColorAccessibilityChecker } from "./color-accessibility-checker"
import { Accessibility } from "lucide-react"

interface AccessibilityCheckerDialogProps {
  color: string
}

export function AccessibilityCheckerDialog({ color }: AccessibilityCheckerDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 flex gap-1 text-xs">
          <Accessibility className="h-3 w-3" />
          Check Accessibility
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Color Accessibility</DialogTitle>
          <DialogDescription>Check if this color meets WCAG accessibility standards for text.</DialogDescription>
        </DialogHeader>

        <ColorAccessibilityChecker color={color} />
      </DialogContent>
    </Dialog>
  )
}
