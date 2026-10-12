import Link from "next/link"
import { Heart } from "lucide-react"

interface HospitalLogoProps {
  className?: string
}

export function HospitalLogoWithIcon({ className }: HospitalLogoProps) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <div className="mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-white">
        <Heart className="h-6 w-6 text-[#0f4c75]" fill="#0f4c75" />
      </div>
      <div className="flex flex-col">
        <div className="text-xl font-bold tracking-tight">
          <span className="text-white">KIPLOMBE</span>
        </div>
        <div className="text-xs text-white/80 font-medium">Medical Centre</div>
        <div className="text-xs text-white/70 italic font-normal">For Quality Healthcare Service Delivery</div>
      </div>
    </Link>
  )
}
