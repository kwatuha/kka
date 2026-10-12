"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

// Common symptoms database - can be expanded or moved to API later
const COMMON_SYMPTOMS = [
  "Fever", "Headache", "Cough", "Fatigue", "Nausea", "Vomiting", "Diarrhea",
  "Constipation", "Abdominal pain", "Chest pain", "Shortness of breath",
  "Dizziness", "Dizziness on standing", "Weakness", "Joint pain",
  "Muscle pain", "Back pain", "Neck pain", "Rash", "Itching", "Swelling",
  "Weight loss", "Weight gain", "Loss of appetite", "Difficulty swallowing",
  "Heartburn", "Acid reflux", "Bloating", "Blood in stool", "Blood in urine",
  "Frequent urination", "Painful urination", "Burning sensation", "Sore throat",
  "Runny nose", "Nasal congestion", "Sneezing", "Watery eyes", "Eye pain",
  "Blurred vision", "Double vision", "Hearing loss", "Ringing in ears",
  "Tinnitus", "Ear pain", "Toothache", "Bleeding gums", "Mouth sores",
  "Difficulty breathing", "Wheezing", "Chest tightness", "Palpitations",
  "Irregular heartbeat", "High blood pressure", "Low blood pressure",
  "Cold hands/feet", "Night sweats", "Hot flashes", "Insomnia",
  "Excessive sleepiness", "Memory problems", "Confusion", "Anxiety",
  "Depression", "Mood swings", "Irritability", "Hair loss", "Dry skin",
  "Oily skin", "Acne", "Bruising easily", "Bleeding easily", "Pale skin",
  "Yellow skin", "Jaundice", "Swollen lymph nodes", "Nightmares",
  "Sleep apnea", "Snoring", "Excessive thirst", "Frequent infections",
  "Slow healing", "Numbness", "Tingling", "Tremors", "Seizures",
  "Loss of consciousness", "Speech problems", "Coordination problems",
  "Balance problems", "Difficulty walking", "Stiffness", "Reduced range of motion",
  "Stomach cramps", "Indigestion", "Gas", "Belching", "Hiccups",
  "Dry mouth", "Excessive saliva", "Bad taste in mouth", "Metallic taste",
  "Sensitivity to light", "Sensitivity to sound", "Sensitivity to touch",
  "Numbness in extremities", "Cold intolerance", "Heat intolerance",
  "Excessive sweating", "Reduced sweating", "Skin discoloration",
  "Hair growth changes", "Nail changes", "Bone pain", "Fractures",
  "Muscle cramps", "Muscle spasms", "Tics", "Twitches", "Restlessness"
]

interface SymptomsAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SymptomsAutocomplete({
  value = "",
  onChange,
  placeholder = "Enter symptoms...",
  disabled = false,
  className,
}: SymptomsAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")

  // Extract symptoms from value (comma-separated)
  React.useEffect(() => {
    if (value) {
      const symptoms = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      setSelectedSymptoms(symptoms)
    } else {
      setSelectedSymptoms([])
    }
  }, [value])

  // Filter symptoms based on search
  const filteredSymptoms = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return COMMON_SYMPTOMS.filter(
        (symptom) => !selectedSymptoms.includes(symptom)
      )
    }
    const lowerQuery = searchQuery.toLowerCase()
    return COMMON_SYMPTOMS.filter(
      (symptom) =>
        symptom.toLowerCase().includes(lowerQuery) &&
        !selectedSymptoms.includes(symptom)
    )
  }, [searchQuery, selectedSymptoms])

  const handleAddSymptom = (symptom: string) => {
    if (!selectedSymptoms.includes(symptom)) {
      const updated = [...selectedSymptoms, symptom]
      setSelectedSymptoms(updated)
      onChange(updated.join(", "))
      setSearchQuery("")
    }
  }

  const handleRemoveSymptom = (symptom: string) => {
    const updated = selectedSymptoms.filter((s) => s !== symptom)
    setSelectedSymptoms(updated)
    onChange(updated.join(", "))
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected symptoms as badges */}
      {selectedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSymptoms.map((symptom) => (
            <Badge
              key={symptom}
              variant="secondary"
              className="flex items-center gap-1 py-1"
            >
              <span className="text-xs">{symptom}</span>
              <button
                type="button"
                onClick={() => handleRemoveSymptom(symptom)}
                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Textarea for free text input */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[100px] pr-10"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 h-7"
              disabled={disabled}
              onClick={() => setOpen(!open)}
            >
              + Suggest
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search symptoms..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {searchQuery
                    ? "No matching symptoms found"
                    : "Start typing to search for symptoms"}
                </CommandEmpty>
                <CommandGroup>
                  {filteredSymptoms.slice(0, 20).map((symptom) => (
                    <CommandItem
                      key={symptom}
                      value={symptom}
                      onSelect={() => {
                        handleAddSymptom(symptom)
                        setSearchQuery("")
                      }}
                    >
                      {symptom}
                    </CommandItem>
                  ))}
                  {filteredSymptoms.length > 20 && (
                    <CommandItem disabled className="text-center text-xs text-muted-foreground">
                      ... and {filteredSymptoms.length - 20} more
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick add buttons for most common symptoms */}
      {selectedSymptoms.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.slice(0, 8).map((symptom) => (
            <Button
              key={symptom}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleAddSymptom(symptom)}
              disabled={disabled}
            >
              + {symptom}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

