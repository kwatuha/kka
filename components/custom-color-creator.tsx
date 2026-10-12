"use client"

import { useState } from "react"
import { HexColorPicker } from "react-colorful"
import { useThemeStore } from "@/lib/stores/theme-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Palette } from "lucide-react"
import { ColorPaletteSuggestions } from "./color-palette-suggestions"
import { ColorAccessibilityChecker } from "./color-accessibility-checker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CustomColorCreator() {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState("#1e40af") // Default to a blue color
  const [name, setName] = useState("")
  const { addCustomColor } = useThemeStore()
  const [showPalettes, setShowPalettes] = useState(false)

  const handleSubmit = () => {
    if (name.trim()) {
      addCustomColor(name.trim(), color)
      setOpen(false)
      setName("")
      setColor("#1e40af")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add custom color</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Custom Color</DialogTitle>
            <DialogDescription>Create your own custom accent color for the application.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="picker">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="picker">Color Picker</TabsTrigger>
              <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            </TabsList>

            <TabsContent value="picker" className="space-y-4 py-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="colorName">Color Name</Label>
                  <Input
                    id="colorName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Custom Blue"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label>Color</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 flex gap-1 text-xs"
                      onClick={() => setShowPalettes(true)}
                    >
                      <Palette className="h-3 w-3" />
                      Suggest Palettes
                    </Button>
                  </div>
                  <div className="flex justify-center p-2">
                    <HexColorPicker color={color} onChange={setColor} />
                  </div>
                  <div className="h-10 w-full rounded-md border border-input" style={{ backgroundColor: color }} />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accessibility">
              <ColorAccessibilityChecker color={color} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              Save Color
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColorPaletteSuggestions open={showPalettes} onOpenChange={setShowPalettes} baseColor={color} />
    </>
  )
}
