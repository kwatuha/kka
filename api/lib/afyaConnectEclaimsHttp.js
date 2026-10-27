/**
 * Shared HTTP helpers for AfyaConnect eClaims APIs.
 */
const { Blob } = require('buffer');
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');
const { getShrConfig } = require('./shrConsent');
const { resolveEligibilityMode } = require('./afyaConnectEligibility');

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function getApiRoot() {
  return (
    trimEnv('SHA_BASE_URL') ||
    trimEnv('FHIR_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    ''
  );
}

function resolveEclaimsMode() {
  const mode = resolveEligibilityMode();
  if (mode === 'disabled') return 'disabled';
  return mode;
}

/** Avoid surfacing APISIX/openresty HTML pages in chart toasts. */
function formatEclaimsError({ text, httpStatus, data, path }) {
  const trimmed = String(text || '').trim();
  const isHtml = trimmed.startsWith('<') || /<\s*html/i.test(trimmed);
  const isGateway =
    isHtml || /apisix|openresty|bad gateway/i.test(trimmed) || httpStatus === 502 || httpStatus === 504;
  const traceId = data?.trace_id || data?.traceId || null;
  if (isGateway) {
    let error = `National HIE gateway error (HTTP ${httpStatus})`;
    if (path) error += ` — ${path}`;
    error +=
      '. AfyaConnect APISIX could not reach the claims upstream (timeout or outage). Retry in a few minutes; HMIS OAuth and visit setup may still be valid.';
    if (traceId) error += ` DHA trace_id: ${traceId}`;
    return { error, httpStatus, gatewayError: true, traceId, body: data };
  }
  let error = data?.message || data?.error || trimmed.slice(0, 240) || `HTTP ${httpStatus}`;
  if (path && !error.includes(path)) error = `${error} (${path})`;
  return { error, httpStatus, traceId, body: data };
}

function facilityHeaders(json = true) {
  const cfg = getShrConfig();
  const headers = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  if (cfg.facilityFrCode) {
    headers['X-Facility-Id'] = String(cfg.facilityFrCode);
    headers['X-Facility-Id-Type'] = trimEnv('AFYACONNECT_FACILITY_ID_TYPE') || 'fr-code';
  }
  return headers;
}

async function eclaimsRequest(method, relativePath, { query, body } = {}) {
  const mode = resolveEclaimsMode();
  if (mode === 'disabled') return { mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  if (!isAfyaConnectConfigured()) return { mode, error: 'AfyaConnect OAuth not configured' };
  const root = getApiRoot();
  if (!root) return { mode, error: 'API base URL not configured' };

  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const q = query ? `?${new URLSearchParams(query).toString()}` : '';
  const url = `${base}${path}${q}`;

  const res = await afyaConnectFetch(url, {
    method,
    headers: facilityHeaders(method !== 'GET'),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 800) };
  }
  if (!res.ok) {
    const formatted = formatEclaimsError({
      text,
      httpStatus: res.status,
      data,
      path: relativePath,
    });
    return {
      mode: 'live',
      ...formatted,
    };
  }
  return { mode: 'live', httpStatus: res.status, data };
}

/**
 * Multipart POST (e.g. POST /claims/attachments — field name must be `file_blob`).
 * @param {Record<string, string>} fields
 * @param {{ buffer: Buffer, fileName: string, mimeType?: string }} file
 */
async function eclaimsMultipartRequest(relativePath, { fields, file }) {
  const mode = resolveEclaimsMode();
  if (mode === 'disabled') return { mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  if (!isAfyaConnectConfigured()) return { mode, error: 'AfyaConnect OAuth not configured' };
  const root = getApiRoot();
  if (!root) return { mode, error: 'API base URL not configured' };

  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const url = `${base}${path}`;

  const form = new FormData();
  for (const [key, value] of Object.entries(fields || {})) {
    if (value != null && String(value).trim() !== '') {
      form.append(key, String(value));
    }
  }
  const mime = file.mimeType || 'application/pdf';
  const blob = new Blob([file.buffer], { type: mime });
  form.append('file_blob', blob, file.fileName || 'claim-attachment.pdf');

  const headers = facilityHeaders(false);
  const res = await afyaConnectFetch(url, {
    method: 'POST',
    headers,
    body: form,
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 800) };
  }
  if (!res.ok) {
    const formatted = formatEclaimsError({
      text,
      httpStatus: res.status,
      data,
      path: relativePath,
    });
    return {
      mode: 'live',
      ...formatted,
    };
  }
  return { mode: 'live', httpStatus: res.status, data };
}

/**
 * Multipart POST with form fields only (e.g. POST /preauths — no file required for normal preauth).
 * @param {Record<string, string>} fields
 */
async function eclaimsFormRequest(relativePath, { fields } = {}) {
  const mode = resolveEclaimsMode();
  if (mode === 'disabled') return { mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  if (!isAfyaConnectConfigured()) return { mode, error: 'AfyaConnect OAuth not configured' };
  const root = getApiRoot();
  if (!root) return { mode, error: 'API base URL not configured' };

  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const url = `${base}${path}`;

  const form = new FormData();
  for (const [key, value] of Object.entries(fields || {})) {
    if (value != null && String(value).trim() !== '') {
      form.append(key, String(value));
    }
  }

  const res = await afyaConnectFetch(url, {
    method: 'POST',
    headers: facilityHeaders(false),
    body: form,
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 800) };
  }
  if (!res.ok) {
    const formatted = formatEclaimsError({
      text,
      httpStatus: res.status,
      data,
      path: relativePath,
    });
    return {
      mode: 'live',
      ...formatted,
    };
  }
  return { mode: 'live', httpStatus: res.status, data };
}

module.exports = {
  trimEnv,
  resolveEclaimsMode,
  facilityHeaders,
  getApiRoot,
  eclaimsRequest,
  eclaimsMultipartRequest,
  eclaimsFormRequest,
};
