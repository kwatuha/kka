import { queueApi } from "@/lib/api"
import type { QueueServicePointChoice } from "@/components/add-to-queue-dialog"

export type EnsureQueueResult =
  | { ok: true; status: "added"; ticketNumber?: string | null }
  | { ok: true; status: "already_queued"; ticketNumber?: string | null }
  | { ok: false; error: string }

/** Idempotent queue add — skips if patient already waiting at the service point. */
export async function ensurePatientInQueue(params: {
  patientId: number
  servicePoint: QueueServicePointChoice
  notes?: string
}): Promise<EnsureQueueResult> {
  const { patientId, servicePoint, notes } = params
  try {
    const queues = await queueApi.getAll(servicePoint, undefined, 1, 100, false)
    const existingEntry = (queues || []).find(
      (entry: { patientId?: number | string; status?: string; ticketNumber?: string }) =>
        entry.patientId?.toString() === patientId.toString() &&
        entry.status !== "completed" &&
        entry.status !== "cancelled"
    )
    if (existingEntry) {
      return {
        ok: true,
        status: "already_queued",
        ticketNumber: existingEntry.ticketNumber ?? null,
      }
    }

    const created = await queueApi.create({
      patientId,
      servicePoint,
      priority: "normal",
      status: "waiting",
      notes: notes || `TaifaCare care pathway — ${servicePoint} queue`,
    })
    return {
      ok: true,
      status: "added",
      ticketNumber: created?.ticketNumber ?? null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add patient to queue"
    return { ok: false, error: message }
  }
}
