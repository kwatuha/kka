/**
 * Non-secret checklist for AfyaConnect / HIE live flip (Phase 9).
 */
const pool = require('../config/db');
const { getDhaSandboxSmoke } = require('./dhaSandboxSmoke');
const { isAfyaConnectConfigured, getAfyaConnectPublicStatus } = require('./afyaConnectAuth');
const { getShrConfig } = require('./shrConsent');
const { isShrPublishGateEnabled } = require('./shrPublishGate');
const { isIntegrationAlertEnabled } = require('./integrationFailureAlert');

async function loadRegistrySettings() {
  try {
    const [rows] = await pool.execute(
      `SELECT clientRegistryMode, clientRegistryBaseUrl, fhirMode, fhirBaseUrl,
              facilityRegistryMode, idsrMode, dhis2Mode
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || {};
  } catch {
    return {};
  }
}

function envOrDb(envKey, dbVal) {
  const e = process.env[envKey];
  if (e != null && String(e).trim() !== '') return String(e).trim();
  return dbVal != null && String(dbVal).trim() !== '' ? String(dbVal).trim() : '';
}

async function getHieLiveReadiness() {
  let sandboxSmoke = { passed: false, passedCount: 0, totalChecks: 0 };
  try {
    sandboxSmoke = await getDhaSandboxSmoke();
  } catch {
    /* ignore */
  }

  const reg = await loadRegistrySettings();
  const fhirMode = (process.env.FHIR_MODE || reg.fhirMode || 'sandbox').toLowerCase();
  const crMode = (process.env.CLIENT_REGISTRY_MODE || reg.clientRegistryMode || 'sandbox').toLowerCase();
  const fhirUrl = envOrDb('FHIR_BASE_URL', reg.fhirBaseUrl);
  const crUrl = envOrDb('CLIENT_REGISTRY_BASE_URL', reg.clientRegistryBaseUrl);
  const frMode = (process.env.FACILITY_REGISTRY_MODE || reg.facilityRegistryMode || 'sandbox').toLowerCase();
  const frUrl =
    envOrDb('FACILITY_REGISTRY_BASE_URL', reg.facilityRegistryBaseUrl) || crUrl;
  const fhirKey = Boolean(process.env.FHIR_API_KEY || reg.fhirApiKey);
  const crKey = Boolean(process.env.CLIENT_REGISTRY_API_KEY);
  const afyaStatus = getAfyaConnectPublicStatus();
  const oauthReady = isAfyaConnectConfigured();
  const crAuthReady = oauthReady || crKey;
  const fhirAuthReady = oauthReady || fhirKey;
  const rabbit = Boolean(process.env.RABBITMQ_URL);
  const shrCfg = getShrConfig();

  const items = [
    {
      id: 'afyaconnect_oauth',
      label: 'AfyaConnect OAuth (Consumer Key/Secret + token URL)',
      ready: oauthReady,
      category: 'AfyaConnect',
    },
    {
      id: 'cr_agent',
      label: 'Client Registry agent ID configured (fetch-client)',
      ready: afyaStatus.agentConfigured,
      category: 'Client Registry',
    },
    {
      id: 'fhir_url',
      label: 'FHIR / OpenHIM channel base URL configured',
      ready: Boolean(fhirUrl),
      category: 'FHIR',
    },
    {
      id: 'fhir_auth',
      label: 'FHIR auth configured (AfyaConnect OAuth or API key)',
      ready: fhirAuthReady,
      category: 'FHIR',
    },
    {
      id: 'fhir_mode_live',
      label: 'FHIR mode set to live (env or System Config)',
      ready: fhirMode === 'live',
      category: 'FHIR',
    },
    {
      id: 'cr_url',
      label: 'Client Registry base URL configured',
      ready: Boolean(crUrl),
      category: 'Client Registry',
    },
    {
      id: 'cr_auth',
      label: 'Client Registry auth configured (AfyaConnect OAuth or API key)',
      ready: crAuthReady,
      category: 'Client Registry',
    },
    {
      id: 'cr_mode_live',
      label: 'Client Registry mode set to live',
      ready: crMode === 'live',
      category: 'Client Registry',
    },
    {
      id: 'fr_url',
      label: 'Facility Registry base URL configured',
      ready: Boolean(frUrl),
      category: 'Facility Registry',
    },
    {
      id: 'fr_auth',
      label: 'Facility Registry auth configured (AfyaConnect OAuth or API key)',
      ready: oauthReady || Boolean(process.env.FACILITY_REGISTRY_API_KEY),
      category: 'Facility Registry',
    },
    {
      id: 'fr_mode_live',
      label: 'Facility Registry mode set to live',
      ready: frMode === 'live',
      category: 'Facility Registry',
    },
    {
      id: 'shr_facility_fr_code',
      label: 'SHR facility fr-code configured (SHR_FACILITY_FR_CODE or branch frCode)',
      ready: Boolean(shrCfg.facilityFrCode),
      category: 'SHR consent/read',
    },
    {
      id: 'shr_practitioner_puid',
      label: 'SHR practitioner PUID configured (consent + read)',
      ready: Boolean(shrCfg.defaultPractitionerPuid),
      category: 'SHR consent/read',
    },
    {
      id: 'shr_publish_gate',
      label: 'Live SHR publish gated on national consent (SHR_REQUIRE_CONSENT_FOR_PUBLISH)',
      ready: isShrPublishGateEnabled(),
      category: 'SHR consent/read',
    },
    {
      id: 'event_bus',
      label: 'RabbitMQ event bus (optional but recommended for outbox)',
      ready: rabbit,
      category: 'Infrastructure',
    },
    {
      id: 'integration_failure_alert',
      label: 'Admin SMS/email alert on integration failure (outbox / FHIR live)',
      ready: isIntegrationAlertEnabled(),
      category: 'Infrastructure',
    },
    {
      id: 'sandbox_smoke',
      label: 'Sandbox E2E completed (export log + outbox + evidence catalog)',
      ready: Boolean(sandboxSmoke.passed),
      category: 'Evidence',
    },
  ];

  const scored = items.filter((i) => i.ready !== null);
  const readyCount = scored.filter((i) => i.ready).length;

  return {
    generatedAt: new Date().toISOString(),
    modes: { fhir: fhirMode, clientRegistry: crMode, facilityRegistry: frMode },
    afyaConnect: afyaStatus,
    items,
    readyCount,
    totalScored: scored.length,
    allAutomatedReady: readyCount === scored.length,
    runbookPath: 'docs/DHA_PHASE9_SANDBOX_PREP.md',
    disclaimer:
      'Live national transmission requires MoH credentials. Do not set portal “Can Transmit” to Yes until smoke test passes.',
  };
}

module.exports = { getHieLiveReadiness };
