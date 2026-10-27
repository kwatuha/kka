/**
 * AfyaConnect / HIE middleware FHIR publish (POST /shr/bundles).
 * @see https://hie-docs.dha.go.ke/sharedhealthrecord/shr-records
 * @see docs/DHA_FHIR_LIVE_TRANSMIT.md
 */
const crypto = require('crypto');
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function resolveFhirPublishStyle() {
  const style = trimEnv('FHIR_PUBLISH_STYLE').toLowerCase();
  if (style === 'shr-bundles-v1' || style === 'openhim-fhir') return style;
  return 'shr-bundles-v1';
}

function resolveFhirBaseUrl(settings) {
  return (
    trimEnv('FHIR_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    String(settings?.fhirBaseUrl || '').trim()
  );
}

/** @returns {'afyaconnect'|'openhim'} */
function resolveFhirPublishProvider(settings) {
  const fromEnv = trimEnv('FHIR_PUBLISH_PROVIDER').toLowerCase();
  if (fromEnv === 'afyaconnect' || fromEnv === 'openhim') return fromEnv;
  if (resolveFhirPublishStyle() === 'openhim-fhir') return 'openhim';
  if (isAfyaConnectConfigured()) return 'afyaconnect';
  const apiKey = trimEnv('FHIR_API_KEY') || String(settings?.fhirApiKey || '').trim();
  return apiKey ? 'openhim' : 'afyaconnect';
}

/**
 * Normalize HMIS bundle/resource for SHR middleware acceptance.
 * @param {object} bundleOrResource
 */
function prepareShrSubmissionBundle(bundleOrResource) {
  let bundle = bundleOrResource;
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('FHIR bundle or resource required');
  }
  if (bundle.resourceType !== 'Bundle') {
    bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: bundle }],
    };
  }

  const copy = JSON.parse(JSON.stringify(bundle));
  copy.resourceType = 'Bundle';
  copy.type = 'collection';
  if (!copy.id) copy.id = crypto.randomUUID();

  if (Array.isArray(copy.entry)) {
    copy.entry = copy.entry
      .map((entry) => {
        if (!entry?.resource) return null;
        const out = { resource: entry.resource };
        if (entry.fullUrl) out.fullUrl = entry.fullUrl;
        return out;
      })
      .filter(Boolean);
  } else {
    copy.entry = [];
  }

  return copy;
}

function summarizeShrResponse(status, bodyText) {
  try {
    const data = JSON.parse(bodyText);
    const parts = [];
    if (data.status) parts.push(String(data.status));
    if (data.message) parts.push(String(data.message));
    if (data.mediator_id) parts.push(`mediator_id=${data.mediator_id}`);
    return parts.join(' · ') || bodyText.slice(0, 500);
  } catch {
    return bodyText.slice(0, 500);
  }
}

/**
 * @param {object} settings — integration_registry_settings row
 * @param {object} bundle — prepared SHR collection Bundle
 */
async function postShrBundle(settings, bundle) {
  const base = resolveFhirBaseUrl(settings);
  if (!base) {
    throw new Error('FHIR_BASE_URL (or CLIENT_REGISTRY_BASE_URL) not configured for live SHR publish');
  }
  if (!isAfyaConnectConfigured()) {
    throw new Error('AfyaConnect OAuth not configured (see AFYACONNECT_* env vars)');
  }

  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  const url = `${root}/shr/bundles`;
  const payload = prepareShrSubmissionBundle(bundle);

  const res = await afyaConnectFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => '');
  return {
    ok: res.ok,
    status: res.status,
    body: text.slice(0, 2000),
    summary: summarizeShrResponse(res.status, text),
    bundleId: payload.id,
  };
}

function getFhirPublishPublicStatus() {
  return {
    publishStyle: resolveFhirPublishStyle(),
    baseUrlConfigured: Boolean(
      trimEnv('FHIR_BASE_URL') || trimEnv('CLIENT_REGISTRY_BASE_URL')
    ),
    shrEndpoint: 'POST {apiRoot}/shr/bundles',
    doc: 'docs/DHA_FHIR_LIVE_TRANSMIT.md',
  };
}

module.exports = {
  trimEnv,
  resolveFhirPublishStyle,
  resolveFhirBaseUrl,
  resolveFhirPublishProvider,
  prepareShrSubmissionBundle,
  postShrBundle,
  summarizeShrResponse,
  getFhirPublishPublicStatus,
};
