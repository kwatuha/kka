export const LAB_RETURN_QUEUE_NOTE_TAG = "[lab-return]"

export type ConsultationQueueOriginFilter = "all" | "lab_return" | "other"

export function isLabReturnConsultationEntry(notes?: string | null): boolean {
  const text = String(notes || "")
  return (
    text.includes(LAB_RETURN_QUEUE_NOTE_TAG) ||
    /lab results ready/i.test(text)
  )
}

export function labReturnOrderLabel(notes?: string | null): string | null {
  const text = String(notes || "")
  const tagged = text.match(/Order\s+([A-Za-z0-9-]+)/i)
  return tagged?.[1] ?? null
}

/** e.g. "2/5 tests" from consultation queue notes when order had multiple tests */
export function labReturnProgressLabel(notes?: string | null): string | null {
  const text = String(notes || "")
  const m = text.match(/\((\d+)\/(\d+)\s+tests\)/i)
  if (!m) return null
  return `${m[1]}/${m[2]} tests`
}

export function consultationEntryOrigin(notes?: string | null): "lab_return" | "other" {
  return isLabReturnConsultationEntry(notes) ? "lab_return" : "other"
}

export function matchesConsultationOriginFilter(
  notes: string | null | undefined,
  filter: ConsultationQueueOriginFilter
): boolean {
  if (filter === "all") return true
  const origin = consultationEntryOrigin(notes)
  return filter === "lab_return" ? origin === "lab_return" : origin === "other"
}
