import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/api';
import {
  DataCollectionTemplate,
  PendingAssetVerification,
  PendingChemistItemAction,
  PendingSubmission,
  VisitDraft,
} from '../types/dataCollection';
import { ClinicalSnapshot, ConsultationDraft, PendingConsultation } from '../types/clinical';

export async function getCachedTemplates(): Promise<DataCollectionTemplate[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.TEMPLATES_CACHE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedTemplates(templates: DataCollectionTemplate[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES_CACHE, JSON.stringify(templates));
  await AsyncStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, new Date().toISOString());
}

export async function getCacheTimestamp(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
}

export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SUBMISSIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePendingSubmission(entry: PendingSubmission): Promise<void> {
  const list = await getPendingSubmissions();
  const idx = list.findIndex((x) => x.localId === entry.localId);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SUBMISSIONS, JSON.stringify(list));
}

export async function removePendingSubmission(localId: string): Promise<void> {
  const list = await getPendingSubmissions();
  await AsyncStorage.setItem(
    STORAGE_KEYS.PENDING_SUBMISSIONS,
    JSON.stringify(list.filter((x) => x.localId !== localId))
  );
}

export async function getVisitDraft(): Promise<VisitDraft | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.VISIT_DRAFT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setVisitDraft(draft: VisitDraft | null): Promise<void> {
  if (!draft) {
    await AsyncStorage.removeItem(STORAGE_KEYS.VISIT_DRAFT);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.VISIT_DRAFT, JSON.stringify(draft));
}

export async function getCachedReferrals(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.REFERRALS_CACHE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedReferrals(rows: any[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REFERRALS_CACHE, JSON.stringify(rows));
}

/** Optimistically update a referral item in the local cache (pending sync / after dispense). */
export async function patchCachedReferralItem(
  referralId: number,
  referralItemId: number,
  patch: Record<string, unknown>
): Promise<any[]> {
  const rows = await getCachedReferrals();
  const next = rows.map((referral) => {
    if (Number(referral.referralId) !== Number(referralId)) return referral;
    const items = (referral.items || []).map((item: any) =>
      Number(item.referralItemId) === Number(referralItemId) ? { ...item, ...patch } : item
    );
    return { ...referral, items };
  });
  await setCachedReferrals(next);
  return next;
}

export async function getCachedAssets(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS_CACHE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedAssets(rows: any[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ASSETS_CACHE, JSON.stringify(rows));
}

export async function patchCachedAsset(
  assetId: number,
  patch: Record<string, unknown>
): Promise<any[]> {
  const rows = await getCachedAssets();
  const next = rows.map((a) => (Number(a.assetId) === Number(assetId) ? { ...a, ...patch } : a));
  await setCachedAssets(next);
  return next;
}

export async function getCachedChemistDrugs(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CHEMIST_DRUGS_CACHE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedChemistDrugs(rows: any[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CHEMIST_DRUGS_CACHE, JSON.stringify(rows));
}

export async function getPendingChemistActions(): Promise<PendingChemistItemAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CHEMIST_ACTIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function findPendingChemistAction(
  referralItemId: number
): Promise<PendingChemistItemAction | undefined> {
  const list = await getPendingChemistActions();
  return list.find(
    (x) =>
      Number(x.referralItemId) === Number(referralItemId) &&
      (x.syncStatus === 'pending' || x.syncStatus === 'failed')
  );
}

/**
 * Upsert by referralItemId so double-tap / offline re-queue cannot create duplicates.
 */
export async function savePendingChemistAction(entry: PendingChemistItemAction): Promise<void> {
  const list = await getPendingChemistActions();
  const byItem = list.findIndex(
    (x) => Number(x.referralItemId) === Number(entry.referralItemId)
  );
  if (byItem >= 0) {
    list[byItem] = { ...list[byItem], ...entry, localId: list[byItem].localId };
  } else {
    const byLocal = list.findIndex((x) => x.localId === entry.localId);
    if (byLocal >= 0) list[byLocal] = entry;
    else list.unshift(entry);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CHEMIST_ACTIONS, JSON.stringify(list));
}

export async function removePendingChemistAction(localId: string): Promise<void> {
  const list = await getPendingChemistActions();
  await AsyncStorage.setItem(
    STORAGE_KEYS.PENDING_CHEMIST_ACTIONS,
    JSON.stringify(list.filter((x) => x.localId !== localId))
  );
}

export async function getPendingAssetVerifications(): Promise<PendingAssetVerification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ASSET_VERIFICATIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function findPendingAssetVerification(
  assetId: number
): Promise<PendingAssetVerification | undefined> {
  const list = await getPendingAssetVerifications();
  return list.find(
    (x) =>
      Number(x.assetId) === Number(assetId) &&
      (x.syncStatus === 'pending' || x.syncStatus === 'failed')
  );
}

/** Upsert by assetId to avoid duplicate offline verify rows. */
export async function savePendingAssetVerification(entry: PendingAssetVerification): Promise<void> {
  const list = await getPendingAssetVerifications();
  const byAsset = list.findIndex((x) => Number(x.assetId) === Number(entry.assetId));
  if (byAsset >= 0) {
    list[byAsset] = { ...list[byAsset], ...entry, localId: list[byAsset].localId };
  } else {
    const byLocal = list.findIndex((x) => x.localId === entry.localId);
    if (byLocal >= 0) list[byLocal] = entry;
    else list.unshift(entry);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ASSET_VERIFICATIONS, JSON.stringify(list));
}

export async function removePendingAssetVerification(localId: string): Promise<void> {
  const list = await getPendingAssetVerifications();
  await AsyncStorage.setItem(
    STORAGE_KEYS.PENDING_ASSET_VERIFICATIONS,
    JSON.stringify(list.filter((x) => x.localId !== localId))
  );
}

export function makeLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Client-facing active referral statuses (API has no ENUM value `active`). */
export const ACTIVE_REFERRAL_STATUSES = new Set([
  'referred',
  'acknowledged',
  'ready_for_pickup',
  'partially_picked',
  'sample_collected',
  'in_progress',
]);

export function filterActiveReferrals(rows: any[]): any[] {
  return (rows || []).filter((r) => ACTIVE_REFERRAL_STATUSES.has(String(r.status || '')));
}

export async function getClinicalSnapshot(): Promise<ClinicalSnapshot | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CLINICAL_SNAPSHOT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setClinicalSnapshot(snapshot: ClinicalSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CLINICAL_SNAPSHOT, JSON.stringify(snapshot));
  await AsyncStorage.setItem(STORAGE_KEYS.CLINICAL_SNAPSHOT_TS, snapshot.generatedAt || new Date().toISOString());
}

export async function getClinicalSnapshotTimestamp(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.CLINICAL_SNAPSHOT_TS);
}

export async function getConsultationDraft(): Promise<ConsultationDraft | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CONSULTATION_DRAFT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setConsultationDraft(draft: ConsultationDraft | null): Promise<void> {
  if (!draft) {
    await AsyncStorage.removeItem(STORAGE_KEYS.CONSULTATION_DRAFT);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.CONSULTATION_DRAFT, JSON.stringify(draft));
}

export async function getPendingConsultations(): Promise<PendingConsultation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CONSULTATIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePendingConsultation(entry: PendingConsultation): Promise<void> {
  const list = await getPendingConsultations();
  const idx = list.findIndex((x) => x.clientActionId === entry.clientActionId);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CONSULTATIONS, JSON.stringify(list));
}

export async function removePendingConsultation(clientActionId: string): Promise<void> {
  const list = await getPendingConsultations();
  await AsyncStorage.setItem(
    STORAGE_KEYS.PENDING_CONSULTATIONS,
    JSON.stringify(list.filter((x) => x.clientActionId !== clientActionId))
  );
}