/**
 * Clinical offline outbox for the web HMIS.
 * Queues create/update payloads when the network is unavailable, then flushes on reconnect.
 */
import { triageApi } from '@/lib/api'

export type ClinicalOutboxKind = 'triage_create' | 'triage_update'

export type ClinicalOutboxEntry = {
  localId: string
  kind: ClinicalOutboxKind
  /** For triage_update */
  resourceId?: string
  payload: Record<string, unknown>
  label: string
  createdAt: string
  status: 'pending' | 'failed'
  lastError?: string
  attempts: number
}

const STORAGE_KEY = 'intellinex_clinical_outbox_v1'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function isNetworkFailure(err: unknown): boolean {
  const e = err as { message?: string; name?: string; status?: number }
  const msg = String(e?.message || '').toLowerCase()
  if (e?.name === 'AbortError') return true
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('unreachable')) return true
  if (msg.includes('unable to reach the server')) return true
  if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('abort')) return true
  // No HTTP status usually means transport failure from our apiRequest wrapper
  if (e?.status == null && (msg.includes('request failed') || msg.includes('connection'))) return true
  return false
}

export function makeOutboxId(): string {
  return `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function listClinicalOutbox(): ClinicalOutboxEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(entries: ClinicalOutboxEntry[]): void {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent('intellinex:outbox-changed'))
}

export function enqueueClinicalOutbox(
  entry: Omit<ClinicalOutboxEntry, 'localId' | 'createdAt' | 'status' | 'attempts'> & {
    localId?: string
  }
): ClinicalOutboxEntry {
  const list = listClinicalOutbox()
  const full: ClinicalOutboxEntry = {
    localId: entry.localId || makeOutboxId(),
    kind: entry.kind,
    resourceId: entry.resourceId,
    payload: entry.payload,
    label: entry.label,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  }

  // Dedupe triage by patientId within pending queue (keep newest)
  const patientId = Number(full.payload?.patientId)
  if (patientId && (full.kind === 'triage_create' || full.kind === 'triage_update')) {
    const filtered = list.filter((e) => {
      if (e.kind !== 'triage_create' && e.kind !== 'triage_update') return true
      return Number(e.payload?.patientId) !== patientId
    })
    filtered.unshift(full)
    persist(filtered)
    return full
  }

  list.unshift(full)
  persist(list)
  return full
}

export function removeClinicalOutbox(localId: string): void {
  persist(listClinicalOutbox().filter((e) => e.localId !== localId))
}

async function flushOne(entry: ClinicalOutboxEntry): Promise<void> {
  if (entry.kind === 'triage_create') {
    await triageApi.create(entry.payload)
    return
  }
  if (entry.kind === 'triage_update') {
    if (!entry.resourceId) throw new Error('Missing triage id for update')
    await triageApi.update(entry.resourceId, entry.payload)
    return
  }
  throw new Error(`Unknown outbox kind: ${entry.kind}`)
}

export async function syncClinicalOutbox(): Promise<{
  synced: number
  failed: number
  errors: string[]
}> {
  const list = listClinicalOutbox()
  let synced = 0
  let failed = 0
  const errors: string[] = []
  const remaining: ClinicalOutboxEntry[] = []

  for (const entry of list) {
    if (entry.status !== 'pending' && entry.status !== 'failed') {
      remaining.push(entry)
      continue
    }
    try {
      await flushOne(entry)
      synced += 1
    } catch (err: unknown) {
      failed += 1
      const message = err instanceof Error ? err.message : 'Sync failed'
      errors.push(`${entry.label}: ${message}`)
      remaining.push({
        ...entry,
        status: isNetworkFailure(err) ? 'pending' : 'failed',
        lastError: message,
        attempts: entry.attempts + 1,
      })
    }
  }

  persist(remaining)
  return { synced, failed, errors }
}

export function countClinicalOutbox(): number {
  return listClinicalOutbox().filter((e) => e.status === 'pending' || e.status === 'failed').length
}
