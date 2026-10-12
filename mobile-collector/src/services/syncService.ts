import apiService from './api';
import {
  filterActiveReferrals,
  getCachedTemplates,
  getPendingAssetVerifications,
  getPendingChemistActions,
  getPendingConsultations,
  getPendingSubmissions,
  removePendingAssetVerification,
  removePendingChemistAction,
  removePendingConsultation,
  removePendingSubmission,
  savePendingAssetVerification,
  savePendingChemistAction,
  savePendingConsultation,
  savePendingSubmission,
  setCachedAssets,
  setCachedChemistDrugs,
  setCachedReferrals,
  setCachedTemplates,
  setClinicalSnapshot,
} from './offlineStore';
import { PendingSubmission } from '../types/dataCollection';
import { PendingConsultation } from '../types/clinical';
import { extractApiError, shouldQueueOffline } from '../utils/apiErrorUtils';
import { normalizeAnswersForSubmit } from '../utils/checklistValidation';

export type CatalogRefreshResult = {
  templates: number;
  referrals: number;
  assets: number;
  chemistDrugs: number;
  partial?: boolean;
};

/** Download templates (+ best-effort chemist referrals / critical assets) for offline use. */
export async function refreshCatalog(): Promise<CatalogRefreshResult> {
  const templates = await apiService.listTemplates({});
  await setCachedTemplates(templates);

  let referrals = 0;
  let assets = 0;
  let chemistDrugs = 0;
  let partial = false;

  try {
    // Do not send status=active — that is not a valid referral ENUM value.
    const rows = await apiService.listExternalReferrals({});
    const active = filterActiveReferrals(rows);
    await setCachedReferrals(active.length ? active : rows);
    referrals = (active.length ? active : rows).length;
  } catch {
    partial = true;
  }

  try {
    const me = await apiService.getChemistMe();
    const chemistId = me?.chemistId;
    if (chemistId) {
      const drugs = await apiService.listChemistDrugs(chemistId);
      await setCachedChemistDrugs(drugs);
      chemistDrugs = drugs.length;
    }
  } catch {
    /* chemist scope optional for non-chemist Field users */
  }

  try {
    const rows = await apiService.getCriticalAssets();
    await setCachedAssets(rows);
    assets = rows.length;
  } catch {
    partial = true;
  }

  return { templates: templates.length, referrals, assets, chemistDrugs, partial };
}

/** Download bundled clinical data for doctor offline resilience. */
export async function refreshClinicalSnapshot(servicePoint = 'consultation'): Promise<{
  queue: number;
  medications: number;
  partial?: boolean;
}> {
  try {
    const snapshot = await apiService.getClinicalSnapshot(servicePoint);
    await setClinicalSnapshot(snapshot);
    return {
      queue: snapshot.queue?.length || 0,
      medications: snapshot.medications?.length || 0,
    };
  } catch {
    return { queue: 0, medications: 0, partial: true };
  }
}

export async function syncPendingConsultations(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const pending = await getPendingConsultations();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of pending) {
    if (item.syncStatus !== 'pending' && item.syncStatus !== 'failed') continue;
    try {
      await apiService.syncConsultation({
        clientActionId: item.clientActionId,
        queueId: item.queueId,
        patientId: item.patientId,
        doctorId: item.doctorId,
        visitDate: item.visitDate,
        chiefComplaint: item.chiefComplaint,
        symptoms: item.symptoms,
        historyOfPresentIllness: item.historyOfPresentIllness,
        physicalExamination: item.physicalExamination,
        diagnosis: item.diagnosis,
        treatment: item.treatment,
        outcome: item.outcome,
        notes: item.notes,
        completeQueue: item.completeQueue,
        prescriptionItems: item.prescriptionItems,
      });
      await removePendingConsultation(item.clientActionId);
      synced += 1;
    } catch (err: unknown) {
      failed += 1;
      const message = extractApiError(err);
      errors.push(`${item.patientName || item.patientId}: ${message}`);
      await savePendingConsultation({
        ...item,
        syncStatus: shouldQueueOffline(err) ? 'pending' : 'failed',
        lastError: message,
      });
    }
  }

  return { synced, failed, errors };
}

export async function syncPendingSubmissions(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const pending = await getPendingSubmissions();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const templates = await getCachedTemplates();

  for (const item of pending) {
    if (item.status !== 'pending' && item.status !== 'failed') continue;
    try {
      const tpl = templates.find((t) => t.templateId === item.templateId);
      const answers = normalizeAnswersForSubmit(tpl?.structure || { sections: [] }, item.answers);
      await apiService.createSubmission({
        templateId: item.templateId,
        subjectType: item.subjectType || 'standalone',
        subjectId: item.subjectId,
        subjectLabel: item.subjectLabel,
        visitDate: item.visitDate,
        title: item.title,
        answers,
      });
      await removePendingSubmission(item.localId);
      synced += 1;
    } catch (err: unknown) {
      failed += 1;
      const message = extractApiError(err);
      errors.push(`${item.title || item.localId}: ${message}`);
      const updated: PendingSubmission = {
        ...item,
        status: shouldQueueOffline(err) ? 'pending' : 'failed',
        lastError: message,
      };
      await savePendingSubmission(updated);
    }
  }

  return { synced, failed, errors };
}

export async function syncPendingChemistActions(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const pending = await getPendingChemistActions();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of pending) {
    if (item.syncStatus !== 'pending' && item.syncStatus !== 'failed') continue;
    try {
      const clientActionId = item.clientActionId || item.localId;
      await apiService.updateReferralItem(
        item.referralId,
        item.referralItemId,
        {
          status: item.status,
          quantityPicked: item.quantityPicked,
          chemistNotes: item.chemistNotes,
          clientActionId,
        },
        clientActionId
      );
      await removePendingChemistAction(item.localId);
      synced += 1;
    } catch (err: unknown) {
      failed += 1;
      const message = extractApiError(err);
      const friendly =
        /already been fully picked|insufficient|no active chemist stock/i.test(message)
          ? message
          : message;
      errors.push(`Referral item ${item.referralItemId}: ${friendly}`);
      await savePendingChemistAction({
        ...item,
        clientActionId: item.clientActionId || item.localId,
        syncStatus: shouldQueueOffline(err) ? 'pending' : 'failed',
        lastError: friendly,
      });
    }
  }
  return { synced, failed, errors };
}

export async function syncPendingAssetVerifications(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const pending = await getPendingAssetVerifications();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  if (!pending.length) return { synced, failed, errors };

  const user = await apiService.getStoredUser();
  const verifiedBy = user?.id;
  if (!verifiedBy) {
    return { synced: 0, failed: pending.length, errors: ['Not signed in'] };
  }

  const onlineReady = pending.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'failed');
  if (!onlineReady.length) return { synced, failed, errors };

  try {
    await apiService.bulkVerifyAssets({
      verifiedBy,
      verifications: onlineReady.map((p) => ({
        assetId: p.assetId,
        isPresent: p.isPresent,
        notes: p.notes,
        condition: p.condition || 'good',
      })),
    });
    for (const p of onlineReady) {
      await removePendingAssetVerification(p.localId);
      synced += 1;
    }
  } catch (err: unknown) {
    const message = extractApiError(err);
    for (const p of onlineReady) {
      failed += 1;
      errors.push(`${p.assetTag || p.assetId}: ${message}`);
      await savePendingAssetVerification({
        ...p,
        syncStatus: shouldQueueOffline(err) ? 'pending' : 'failed',
        lastError: message,
      });
    }
  }
  return { synced, failed, errors };
}

export async function syncAllPending(): Promise<{
  submissions: { synced: number; failed: number };
  chemist: { synced: number; failed: number };
  assets: { synced: number; failed: number };
  consultations: { synced: number; failed: number };
  errors: string[];
}> {
  const submissions = await syncPendingSubmissions();
  const chemist = await syncPendingChemistActions();
  const assets = await syncPendingAssetVerifications();
  const consultations = await syncPendingConsultations();
  return {
    submissions: { synced: submissions.synced, failed: submissions.failed },
    chemist: { synced: chemist.synced, failed: chemist.failed },
    assets: { synced: assets.synced, failed: assets.failed },
    consultations: { synced: consultations.synced, failed: consultations.failed },
    errors: [...submissions.errors, ...chemist.errors, ...assets.errors, ...consultations.errors],
  };
}

export { makeLocalId } from './offlineStore';
