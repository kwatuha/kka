/**
 * Periodic clinical snapshot refresh for doctor/pharmacy roles.
 */
import { CLINICAL_SYNC_INTERVAL_MS } from '../config/api';
import { refreshClinicalSnapshot, syncAllPending } from './syncService';
import { resolveFieldAppProfile } from '../config/roleTabs';
import apiService from './api';

let intervalId: ReturnType<typeof setInterval> | null = null;

async function tick(roleName?: string): Promise<void> {
  const profile = resolveFieldAppProfile(roleName);
  if (profile !== 'doctor' && profile !== 'pharmacy' && profile !== 'cashier') return;
  const servicePoint =
    profile === 'doctor' ? 'consultation' : profile === 'pharmacy' ? 'pharmacy' : 'cashier';
  try {
    await syncAllPending();
  } catch {
    /* outbox drain is best-effort during background refresh */
  }
  try {
    await refreshClinicalSnapshot(servicePoint);
  } catch {
    /* keep last good snapshot */
  }
}

export function startClinicalPeriodicSync(roleName?: string): void {
  stopClinicalPeriodicSync();
  void tick(roleName);
  intervalId = setInterval(() => {
    void apiService.getStoredUser().then((u) => tick(u?.roleName || roleName));
  }, CLINICAL_SYNC_INTERVAL_MS);
}

export function stopClinicalPeriodicSync(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
