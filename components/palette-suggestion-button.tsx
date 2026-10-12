"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Palette } from "lucide-react"
import { ColorPaletteSuggestions } from "./color-palette-suggestions"

interface PaletteSuggestionButtonProps {
  baseColor: string
}

export function PaletteSuggestionButton({ baseColor }: PaletteSuggestionButtonProps) {
  const [showPalettes, setShowPalettes] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="h-8 flex gap-1 text-xs" onClick={() => setShowPalettes(true)}>
        <Palette className="h-3 w-3" />
        Suggest Palettes
      </Button>

      <ColorPaletteSuggestions open={showPalettes} onOpenChange={setShowPalettes} baseColor={baseColor} />
    </>
  )
}
