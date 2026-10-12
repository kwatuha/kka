import Link from "next/link"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/** Links to Help → Telemedicine tab (full guides moved out of telemedicine screens). */
export function TelemedicineHelpLink({ className }: { className?: string }) {
  return (
    <Link
      href="/help?tab=telemedicine"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline",
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5 shrink-0" />
      Telemedicine help
    </Link>
  )
}
