/**
 * Optional gate: live AfyaConnect SHR bundles only when national visit consent is active.
 * Enable with SHR_REQUIRE_CONSENT_FOR_PUBLISH=1 (recommended for production clinical write).
 */
const pool = require('../config/db');
const { getActiveSessionForPatient } = require('./shrVisitSessions');
const { resolveFhirPublishProvider, resolveFhirPublishStyle } = require('./afyaConnectFhirPublish');

async function loadFhirSettings(executor) {
  const db = executor || pool;
  try {
    const [rows] = await db.execute(
      `SELECT fhirMode, fhirBaseUrl, fhirApiKey FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveFhirMode(settings) {
  const fromEnv = (process.env.FHIR_MODE || '').toLowerCase();
  if (fromEnv === 'sandbox' || fromEnv === 'live' || fromEnv === 'disabled') return fromEnv;
  return String(settings?.fhirMode || 'sandbox').toLowerCase();
}

function isShrPublishGateEnabled() {
  const v = String(process.env.SHR_REQUIRE_CONSENT_FOR_PUBLISH || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function shrPublishGateApplies(executor, settings = null) {
  if (!isShrPublishGateEnabled()) return false;
  const s = settings || (await loadFhirSettings(executor));
  const mode = resolveFhirMode(s);
  if (mode !== 'live') return false;
  const provider = resolveFhirPublishProvider(s);
  const style = resolveFhirPublishStyle();
  return provider === 'afyaconnect' && style === 'shr-bundles-v1';
}

async function patientHasShrPublishConsent(patientId) {
  const session = await getActiveSessionForPatient(Number(patientId));
  if (!session) return false;
  return session.consentStatus === 'approved' || session.consentStatus === 'emergency';
}

/**
 * @returns {{ allowed: true } | { allowed: false, reason: string }}
 */
async function checkShrLivePublishAllowed(executor, patientId) {
  const settings = await loadFhirSettings(executor);
  if (!(await shrPublishGateApplies(executor, settings))) {
    return { allowed: true };
  }
  if (!patientId) {
    return { allowed: false, reason: 'Patient required for SHR consent gate' };
  }
  const ok = await patientHasShrPublishConsent(patientId);
  if (!ok) {
    return {
      allowed: false,
      reason:
        'Live SHR publish requires approved national visit consent (Documents → National SHR consent)',
    };
  }
  return { allowed: true };
}

module.exports = {
  isShrPublishGateEnabled,
  shrPublishGateApplies,
  patientHasShrPublishConsent,
  checkShrLivePublishAllowed,
};
