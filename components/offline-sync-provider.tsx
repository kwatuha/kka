'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import {
  countClinicalOutbox,
  syncClinicalOutbox,
} from '@/lib/offline-outbox'
import { useToast } from '@/hooks/use-toast'

/**
 * Listens for browser online events and flushes the clinical outbox.
 * Shows a compact banner when pending offline triage exists.
 */
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(true)

  const refreshCount = () => setPending(countClinicalOutbox())

  useEffect(() => {
    refreshCount()
    const onChange = () => refreshCount()
    window.addEventListener('intellinex:outbox-changed', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('intellinex:outbox-changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    const flush = async () => {
      if (!navigator.onLine) return
      const result = await syncClinicalOutbox()
      refreshCount()
      if (result.synced > 0) {
        toast({
          title: 'Offline queue synced',
          description: `${result.synced} triage record(s) uploaded.`,
        })
      } else if (result.failed > 0) {
        toast({
          title: 'Offline sync issues',
          description: result.errors.slice(0, 2).join(' · '),
          variant: 'destructive',
        })
      }
    }

    window.addEventListener('online', flush)
    // Attempt once on mount if online
    void flush()
    return () => window.removeEventListener('online', flush)
  }, [toast])

  return (
    <>
      {children}
      {pending > 0 ? (
        <div
          className="fixed bottom-4 left-4 z-[80] max-w-sm rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
          role="status"
        >
          <div className="flex items-start gap-2">
            {!online ? <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : null}
            <div>
              <p className="font-medium">
                {pending} triage item{pending === 1 ? '' : 's'} waiting to sync
              </p>
              <p className="text-xs text-muted-foreground">
                {online
                  ? 'Will retry automatically while you are online.'
                  : 'Saved on this device. Will upload when you reconnect.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
