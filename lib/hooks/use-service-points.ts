"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { servicePointApi } from "@/lib/api"

export interface ServicePointUnit {
  servicePointId: number
  pointCode: string
  pointName: string
  branchId: number
  branchName?: string
  pointType: string
  isDefault?: boolean
  location?: string
}

function storageKey(prefix: string, branchId: number | string, pointType?: string) {
  return pointType ? `${prefix}_${branchId}_${pointType}` : `${prefix}_${branchId}`
}

export function useServicePoints(pointType?: string) {
  const { currentBranch, user } = useAuth()
  const branchId = currentBranch?.branchId

  const [servicePoints, setServicePoints] = useState<ServicePointUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [currentServicePointId, setCurrentServicePointIdState] = useState<number | null>(null)

  useEffect(() => {
    if (!branchId) {
      setServicePoints([])
      setCurrentServicePointIdState(null)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await servicePointApi.getAll(String(branchId), pointType, undefined, "true")
        if (cancelled) return

        const points = (data || []) as ServicePointUnit[]
        setServicePoints(points)

        const storageSuffix = pointType || "all"
        const storedId = localStorage.getItem(storageKey("current_service_point_id", branchId, storageSuffix))
        const parsedId = storedId ? Number(storedId) : null
        const roleDefaultType = (user?.landingConfig as { servicePoint?: string } | null)?.servicePoint
        const defaultPoint =
          (roleDefaultType && points.find((p) => p.pointType === roleDefaultType && p.isDefault)) ||
          (pointType && points.find((p) => p.pointType === pointType && p.isDefault)) ||
          points.find((p) => p.isDefault) ||
          points[0] ||
          null

        setCurrentServicePointIdState(
          parsedId && points.some((p) => p.servicePointId === parsedId)
            ? parsedId
            : defaultPoint?.servicePointId ?? null,
        )
      } catch (error) {
        console.error("Failed to load service points:", error)
        if (!cancelled) setServicePoints([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [branchId, pointType, user?.landingConfig])

  const setCurrentServicePointId = useCallback(
    (servicePointId: number | null) => {
      setCurrentServicePointIdState(servicePointId)
      if (branchId && servicePointId) {
        const storageSuffix = pointType || "all"
        localStorage.setItem(storageKey("current_service_point_id", branchId, storageSuffix), String(servicePointId))
        localStorage.setItem("current_service_point_id", String(servicePointId))
      }
    },
    [branchId, pointType],
  )

  const currentServicePoint = useMemo(
    () => servicePoints.find((p) => p.servicePointId === currentServicePointId) || null,
    [servicePoints, currentServicePointId],
  )

  return {
    branchId,
    servicePoints,
    currentServicePointId,
    currentServicePoint,
    setCurrentServicePointId,
    loading,
  }
}
