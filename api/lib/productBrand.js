/**
 * DHA / attestation product branding (AZ CarePlus).
 * Override via env on deploy; defaults match DHA application name.
 */
function trimOr(value, fallback) {
  const s = value != null ? String(value).trim() : '';
  return s || fallback;
}

const PRODUCT_NAME = trimOr(process.env.APP_NAME || process.env.PRODUCT_NAME, 'AZ CarePlus');
const APP_BRAND = trimOr(
  process.env.APP_BRAND || process.env.SMS_FACILITY_NAME || process.env.NEXT_PUBLIC_APP_BRAND,
  PRODUCT_NAME
);
const FHIR_META_SOURCE = trimOr(process.env.FHIR_META_SOURCE, 'AZ-CarePlus-HMIS');
const FHIR_AUTHOR_DISPLAY = trimOr(process.env.FHIR_AUTHOR_DISPLAY, 'AZ CarePlus HMIS');
const EVIDENCE_EXPORT_PRODUCT = trimOr(process.env.EVIDENCE_PRODUCT_NAME, `${PRODUCT_NAME} HMIS`);
const TOTP_ISSUER = trimOr(process.env.TOTP_ISSUER, PRODUCT_NAME);
const DHA_APPLICATION_ID = trimOr(process.env.DHA_APPLICATION_ID, 'DHS-1790683976496-C791HNX7L');
const DHA_ORGANISATION = trimOr(process.env.DHA_ORGANISATION, 'AZIMKIM INVESTMENTS LIMITED');
const DHA_PORTAL_APP_ID = trimOr(process.env.DHA_PORTAL_APP_ID, 'APP-2026-K6UPM3');

module.exports = {
  PRODUCT_NAME,
  APP_BRAND,
  FHIR_META_SOURCE,
  FHIR_AUTHOR_DISPLAY,
  EVIDENCE_EXPORT_PRODUCT,
  TOTP_ISSUER,
  DHA_APPLICATION_ID,
  DHA_ORGANISATION,
  DHA_PORTAL_APP_ID,
};
