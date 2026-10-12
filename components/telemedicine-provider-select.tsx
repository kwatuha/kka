"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TELEMEDICINE_PROVIDER_OPTIONS, type TelemedicineVideoProviderId } from "@/lib/telemedicine-providers"

type Props = {
  id?: string
  value: TelemedicineVideoProviderId
  onChange: (v: TelemedicineVideoProviderId) => void
  disabled?: boolean
  label?: string
  /** compact = single line, no description */
  variant?: "default" | "compact"
  className?: string
}

export function TelemedicineProviderSelect({
  id = "telemedicine-video-provider",
  value,
  onChange,
  disabled,
  label = "Video platform",
  variant = "default",
  className,
}: Props) {
  const current = TELEMEDICINE_PROVIDER_OPTIONS.find((o) => o.id === value)

  return (
    <div className={className}>
      <Label htmlFor={id} className={variant === "compact" ? "text-xs" : undefined}>
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as TelemedicineVideoProviderId)} disabled={disabled}>
        <SelectTrigger id={id} className={variant === "compact" ? "h-9 text-sm mt-1" : "mt-1.5"}>
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {TELEMEDICINE_PROVIDER_OPTIONS.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {variant === "default" && current && (
        <p className="text-xs text-muted-foreground mt-1.5">{current.description}</p>
      )}
    </div>
  )
}
