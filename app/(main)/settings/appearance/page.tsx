import { Separator } from "@/components/ui/separator"
import { AppearanceSettings } from "@/components/appearance-settings"

export default function AppearanceSettingsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appearance Settings</h1>
        <p className="text-muted-foreground">Customize the appearance of the application to suit your preferences.</p>
      </div>

      <Separator />

      <AppearanceSettings />
    </div>
  )
}
