/**
 * Public HMIS URLs — supports multiple front-door hostnames (e.g. county + vendor/DHA).
 */

function stripTrailingSlash(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

/** Comma-separated origins in FRONTEND_URL or PUBLIC_CORS_ORIGINS */
function parseOriginList(envValue) {
  return String(envValue || '')
    .split(',')
    .map((s) => stripTrailingSlash(s))
    .filter(Boolean);
}

/** Canonical origin for DHA portal, emails, evidence (no /hmis path). */
function primaryPublicOrigin() {
  const explicit =
    process.env.DHA_PUBLIC_APP_URL ||
    process.env.PRIMARY_FRONTEND_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    '';
  const first = stripTrailingSlash(explicit);
  if (first) return first.replace(/\/hmis\/?$/i, '');
  const fromFrontend = parseOriginList(process.env.FRONTEND_URL)[0];
  if (fromFrontend) return fromFrontend.replace(/\/hmis\/?$/i, '');
  return '';
}

/** All browser origins allowed for CORS (production). */
function allPublicOrigins() {
  const set = new Set([
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.PUBLIC_CORS_ORIGINS),
  ]);
  const primary = primaryPublicOrigin();
  if (primary) set.add(primary);
  return [...set].filter(Boolean);
}

/** Full URL to app home including basePath /hmis */
function uiBaseUrlWithHmPath() {
  const base =
    stripTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL) ||
    (primaryPublicOrigin() ? `${primaryPublicOrigin()}/hmis` : '');
  if (base) return base.endsWith('/hmis') ? base : `${base}/hmis`;
  return 'https://hmis.azimkim.co.ke/hmis';
}

/** Public API base for DHA / evidence (includes /hmis/api when proxied). */
function publicApiBaseUrl() {
  const explicit = stripTrailingSlash(process.env.PUBLIC_API_URL);
  if (explicit) return explicit;
  const ui = uiBaseUrlWithHmPath();
  return `${ui.replace(/\/$/, '')}/api`;
}

/** DHA portal / assessor primary URL (documented in evidence pack). */
const DHA_DOCUMENTED_UI = 'https://hmis.azimkim.co.ke/hmis/';
const DHA_DOCUMENTED_API = 'https://hmis.azimkim.co.ke/hmis/api';
const LEGACY_COUNTY_UI = 'https://kakamega.intellibizafrica.co.ke/hmis/';

module.exports = {
  parseOriginList,
  primaryPublicOrigin,
  allPublicOrigins,
  uiBaseUrlWithHmPath,
  publicApiBaseUrl,
  DHA_DOCUMENTED_UI,
  DHA_DOCUMENTED_API,
  LEGACY_COUNTY_UI,
};
