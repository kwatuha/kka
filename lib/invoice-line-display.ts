/** Client-side display helper when API line unitPrice lags totalPrice. */
export function displayUnitPriceForInvoiceLine(item: {
  quantity?: number | string | null
  unitPrice?: number | string | null
  totalPrice?: number | string | null
  price?: number | string | null
}): number {
  const qty = Math.max(parseFloat(String(item.quantity ?? 1)) || 1, 1)
  const total = parseFloat(String(item.totalPrice ?? item.total ?? ""))
  let unit = parseFloat(String(item.unitPrice ?? item.price ?? ""))

  if (Number.isFinite(total) && total > 0) {
    if (!Number.isFinite(unit) || Math.abs(unit * qty - total) > 0.02) {
      return Math.round((total / qty) * 100) / 100
    }
  }

  return Number.isFinite(unit) ? unit : 0
}
