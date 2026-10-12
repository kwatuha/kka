"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { pharmacyApi, laboratoryApi } from "@/lib/api"

export interface DrugStoreUnit {
  storeId: number
  storeName: string
  storeCode?: string
  branchId: number
  branchName?: string
  isDispensingStore?: boolean
}

export interface LaboratoryUnit {
  labId: number
  labName: string
  labCode?: string
  branchId: number
  branchName?: string
  isDefault?: boolean
}

function storageKey(prefix: string, branchId: number | string) {
  return `${prefix}_${branchId}`
}

export function useFacilityUnits() {
  const { currentBranch } = useAuth()
  const branchId = currentBranch?.branchId

  const [drugStores, setDrugStores] = useState<DrugStoreUnit[]>([])
  const [laboratories, setLaboratories] = useState<LaboratoryUnit[]>([])
  const [loadingStores, setLoadingStores] = useState(false)
  const [loadingLabs, setLoadingLabs] = useState(false)
  const [currentStoreId, setCurrentStoreIdState] = useState<number | null>(null)
  const [currentLabId, setCurrentLabIdState] = useState<number | null>(null)

  useEffect(() => {
    if (!branchId) {
      setDrugStores([])
      setLaboratories([])
      return
    }

    let cancelled = false
    const load = async () => {
      setLoadingStores(true)
      setLoadingLabs(true)
      try {
        const [stores, labs] = await Promise.all([
          pharmacyApi.getDrugStores(String(branchId), undefined, "true"),
          laboratoryApi.getLaboratories(String(branchId), undefined, "true"),
        ])
        if (cancelled) return
        setDrugStores(stores || [])
        setLaboratories(labs || [])

        const storedStoreId = localStorage.getItem(storageKey("current_pharmacy_store_id", branchId))
        const storedLabId = localStorage.getItem(storageKey("current_laboratory_id", branchId))

        const defaultStore =
          (stores || []).find((s: DrugStoreUnit) => s.isDispensingStore) ||
          (stores || [])[0] ||
          null
        const defaultLab =
          (labs || []).find((l: LaboratoryUnit) => l.isDefault) ||
          (labs || [])[0] ||
          null

        const parsedStoreId = storedStoreId ? Number(storedStoreId) : null
        const parsedLabId = storedLabId ? Number(storedLabId) : null

        setCurrentStoreIdState(
          parsedStoreId && (stores || []).some((s: DrugStoreUnit) => s.storeId === parsedStoreId)
            ? parsedStoreId
            : defaultStore?.storeId ?? null,
        )
        setCurrentLabIdState(
          parsedLabId && (labs || []).some((l: LaboratoryUnit) => l.labId === parsedLabId)
            ? parsedLabId
            : defaultLab?.labId ?? null,
        )
      } catch (error) {
        console.error("Failed to load facility units:", error)
        if (!cancelled) {
          setDrugStores([])
          setLaboratories([])
        }
      } finally {
        if (!cancelled) {
          setLoadingStores(false)
          setLoadingLabs(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [branchId])

  const setCurrentStoreId = useCallback(
    (storeId: number | null) => {
      setCurrentStoreIdState(storeId)
      if (branchId && storeId) {
        localStorage.setItem(storageKey("current_pharmacy_store_id", branchId), String(storeId))
        localStorage.setItem("current_pharmacy_store_id", String(storeId))
      }
    },
    [branchId],
  )

  const setCurrentLabId = useCallback(
    (labId: number | null) => {
      setCurrentLabIdState(labId)
      if (branchId && labId) {
        localStorage.setItem(storageKey("current_laboratory_id", branchId), String(labId))
        localStorage.setItem("current_laboratory_id", String(labId))
      }
    },
    [branchId],
  )

  const currentStore = useMemo(
    () => drugStores.find((s) => s.storeId === currentStoreId) || null,
    [drugStores, currentStoreId],
  )

  const currentLab = useMemo(
    () => laboratories.find((l) => l.labId === currentLabId) || null,
    [laboratories, currentLabId],
  )

  return {
    branchId,
    drugStores,
    laboratories,
    currentStoreId,
    currentLabId,
    currentStore,
    currentLab,
    setCurrentStoreId,
    setCurrentLabId,
    loadingStores,
    loadingLabs,
  }
}
