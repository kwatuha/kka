/** Notify lab desk tabs to reload after cashier / M-Pesa payment. */
export const LAB_BILLING_UPDATED_EVENT = "hmis:lab-billing-updated"

export function emitLabBillingUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(LAB_BILLING_UPDATED_EVENT))
}

export function onLabBillingUpdated(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(LAB_BILLING_UPDATED_EVENT, handler)
  return () => window.removeEventListener(LAB_BILLING_UPDATED_EVENT, handler)
}
