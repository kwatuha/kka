"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface QRCodeWrapperProps {
  value: string
  size?: number
  style?: React.CSSProperties
  viewBox?: string
}

export function QRCodeWrapper({ value, size = 120, style, viewBox }: QRCodeWrapperProps) {
  const [QRCodeComponent, setQRCodeComponent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadQRCode = async () => {
      try {
        // Try to load react-qr-code
        const mod = await import("react-qr-code")
        const Component = mod.default || mod.QRCode || mod
        if (mounted) {
          setQRCodeComponent(() => Component)
          setLoading(false)
        }
      } catch (err) {
        console.error("Failed to load QR code library:", err)
        if (mounted) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadQRCode()

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-muted rounded" style={{ width: size, height: size, ...style }}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !QRCodeComponent) {
    // Fallback: Use an external QR code service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
    return (
      <img
        src={qrUrl}
        alt="QR Code"
        style={{ width: size, height: size, ...style }}
        className="rounded"
      />
    )
  }

  const Component = typeof QRCodeComponent === 'function' ? QRCodeComponent : QRCodeComponent.default || QRCodeComponent

  return (
    <Component
      value={value}
      size={size}
      style={style}
      viewBox={viewBox}
    />
  )
}
