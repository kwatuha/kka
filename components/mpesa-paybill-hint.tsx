"use client"

import type { MpesaPublicConfig } from "@/lib/api"

type Props = {
  config: MpesaPublicConfig | null
  accountReference?: string | null
  className?: string
}

/** Lipa na M-Pesa Paybill instructions + STK note (values from hospital settings). */
export function MpesaPaybillHint({ config, accountReference, className }: Props) {
  if (!config?.showPaybillInstructions && !config?.configured) return null

  const ref = accountReference || config?.accountReferenceExample || config?.accountPrefix
  const stkReady = config?.configured && config?.stkEnabled && config?.callbackConfigured

  return (
    <div
      className={
        className ||
        "rounded-md border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/40"
      }
    >
      <p className="font-medium text-sky-950 dark:text-sky-100">M-Pesa payment</p>
      {config?.showPaybillInstructions !== false && (
        <ul className="mt-2 space-y-1 text-sky-900/90 dark:text-sky-100/90">
          <li>
            <span className="text-muted-foreground">Paybill:</span>{" "}
            <span className="font-mono font-semibold">{config?.paybillNumber || "—"}</span>
          </li>
          <li>
            <span className="text-muted-foreground">Account:</span>{" "}
            <span className="font-mono font-semibold">{ref || "—"}</span>
          </li>
        </ul>
      )}
      {config?.sandboxStkNote ? (
        <p className="mt-2 text-xs text-amber-900 dark:text-amber-100">{config.sandboxStkNote}</p>
      ) : null}
      {stkReady ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Enter the <strong>Safaricom number that should get the PIN prompt</strong> in the field below (it does
          not follow patient profile edits after this screen is open). Once confirmed, the invoice updates
          automatically.
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          STK prompt is not available on this server. Use Paybill + Account above, then record the M-Pesa
          receipt manually.
        </p>
      )}
    </div>
  )
}
