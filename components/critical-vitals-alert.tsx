"use client"

import { useState, useEffect } from "react"
import { triageApi } from "@/lib/api"
import { useCriticalNotifications } from "@/lib/critical-notifications-context"

interface CriticalVitalRange {
  criticalVitalId: number
  vitalParameter: string
  unit: string | null
  criticalLowValue: number | null
  criticalHighValue: number | null
  description: string | null
}

interface PatientVitals {
  systolicBP?: number | null
  diastolicBP?: number | null
  heartRate?: number | null
  respiratoryRate?: number | null
  temperature?: number | null
  oxygenSaturation?: number | null
  glasgowComaScale?: number | null
  bloodGlucose?: number | null
}

interface CriticalAlert {
  parameter: string
  value: number
  unit: string
  range: string
  description: string | null
  severity: 'critical' | 'urgent'
}

interface CriticalVitalsAlertProps {
  vitals: PatientVitals | null
  patientId?: string | number
  patientName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CriticalVitalsAlert({ vitals, patientId, patientName, open, onOpenChange }: CriticalVitalsAlertProps) {
  const [criticalRanges, setCriticalRanges] = useState<CriticalVitalRange[]>([])
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAcknowledged, setHasAcknowledged] = useState(false)
  const [lastVitalsHash, setLastVitalsHash] = useState<string>("")
  
  // Use critical notifications context (requires CriticalNotificationsProvider in parent)
  // If not available, this will throw an error - ensure provider is in the component tree
  const { addNotification } = useCriticalNotifications()

  useEffect(() => {
    loadCriticalRanges()
  }, [])

  useEffect(() => {
    if (vitals && criticalRanges.length > 0) {
      checkCriticalVitals()
    }
  }, [vitals, criticalRanges])

  // Reset acknowledgment when vitals change significantly
  useEffect(() => {
    const vitalsHash = JSON.stringify(vitals)
    if (vitalsHash !== lastVitalsHash) {
      setHasAcknowledged(false)
      setLastVitalsHash(vitalsHash)
    }
  }, [vitals, lastVitalsHash])

  const loadCriticalRanges = async () => {
    try {
      setLoading(true)
      const ranges = await triageApi.getCriticalVitalRanges()
      setCriticalRanges(ranges.filter((r: any) => r.isActive !== false))
    } catch (err: any) {
      console.error('Error loading critical vital ranges:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkCriticalVitals = () => {
    if (!vitals) return

    const alerts: CriticalAlert[] = []

    criticalRanges.forEach((range) => {
      const param = range.vitalParameter
      let value: number | null = null

      // Map vital parameter names to actual vital values
      switch (param) {
        case 'systolicBP':
          value = vitals.systolicBP || null
          break
        case 'diastolicBP':
          value = vitals.diastolicBP || null
          break
        case 'heartRate':
          value = vitals.heartRate || null
          break
        case 'respiratoryRate':
          value = vitals.respiratoryRate || null
          break
        case 'temperature':
          value = vitals.temperature || null
          break
        case 'oxygenSaturation':
          value = vitals.oxygenSaturation || null
          break
        case 'glasgowComaScale':
          value = vitals.glasgowComaScale || null
          break
        case 'bloodGlucose':
          value = vitals.bloodGlucose || null
          break
      }

      if (value === null || value === undefined) return

      // Check if value is critical
      const isCriticalLow = range.criticalLowValue !== null && value < range.criticalLowValue
      const isCriticalHigh = range.criticalHighValue !== null && value > range.criticalHighValue

      if (isCriticalLow || isCriticalHigh) {
        let rangeText = ''
        if (isCriticalLow && isCriticalHigh) {
          rangeText = `< ${range.criticalLowValue} or > ${range.criticalHighValue}`
        } else if (isCriticalLow) {
          rangeText = `< ${range.criticalLowValue}`
        } else {
          rangeText = `> ${range.criticalHighValue}`
        }

        // Determine severity - very extreme values are critical, others are urgent
        const severity: 'critical' | 'urgent' = 
          (isCriticalLow && range.criticalLowValue && value < range.criticalLowValue * 0.8) ||
          (isCriticalHigh && range.criticalHighValue && value > range.criticalHighValue * 1.2)
            ? 'critical'
            : 'urgent'

        alerts.push({
          parameter: getParameterDisplayName(param),
          value: value,
          unit: range.unit || '',
          range: rangeText,
          description: range.description || null,
          severity
        })
      }
    })

    setCriticalAlerts(alerts)
    
    // Don't auto-open dialog or add notifications during typing
    // Notifications should only be added after form is saved
  }

  const getParameterDisplayName = (param: string): string => {
    const names: Record<string, string> = {
      'systolicBP': 'Systolic Blood Pressure',
      'diastolicBP': 'Diastolic Blood Pressure',
      'heartRate': 'Heart Rate',
      'respiratoryRate': 'Respiratory Rate',
      'temperature': 'Temperature',
      'oxygenSaturation': 'Oxygen Saturation (SpO2)',
      'glasgowComaScale': 'Glasgow Coma Scale (GCS)',
      'bloodGlucose': 'Blood Glucose'
    }
    return names[param] || param
  }

  // Don't render the dialog - we only use the floating component now
  // This component is kept for backward compatibility but won't display
  // Critical alerts are now shown in the floating component after form is saved
  return null
}

