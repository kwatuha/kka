/**
 * Auto-sync when connectivity returns (NetInfo).
 * Starts once after login; safe to call start/stop multiple times.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { refreshCatalog, refreshClinicalSnapshot, syncAllPending } from './syncService';
import apiService from './api';

let unsubscribe: (() => void) | null = null;
let syncInFlight = false;
let wasOffline = false;

async function runAutoSync(opts: { announce?: boolean } = {}): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const sync = await syncAllPending();
    try {
      await refreshCatalog();
    } catch {
      /* catalog refresh is best-effort while syncing outbox */
    }
    const uploaded =
      sync.submissions.synced +
      sync.chemist.synced +
      sync.assets.synced +
      sync.consultations.synced;
    if (opts.announce && uploaded > 0) {
      Alert.alert('Back online', `${uploaded} queued item(s) synced.`);
    }
    if (uploaded > 0) {
      apiService.reportAppUsage('app_sync').catch(() => {});
    }
    try {
      await refreshClinicalSnapshot('consultation');
    } catch {
      /* best-effort */
    }
  } finally {
    syncInFlight = false;
  }
}

function onNetInfoChange(state: NetInfoState): void {
  const online = Boolean(state.isConnected && state.isInternetReachable !== false);
  if (!online) {
    wasOffline = true;
    return;
  }
  if (wasOffline) {
    wasOffline = false;
    void runAutoSync({ announce: true });
  }
}

/** Begin listening for connectivity; triggers sync when returning online. */
export function startNetworkAutoSync(): void {
  if (unsubscribe) return;
  unsubscribe = NetInfo.addEventListener(onNetInfoChange);
  void NetInfo.fetch().then((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (!online) wasOffline = true;
    else void runAutoSync({ announce: false });
  });
}

export function stopNetworkAutoSync(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  wasOffline = false;
}

export async function triggerManualSync(): Promise<void> {
  await runAutoSync({ announce: false });
}
