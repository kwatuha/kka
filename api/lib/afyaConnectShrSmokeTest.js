/**
 * UAT SHR consent/read connectivity smoke (no OTP — open-visits + config only).
 * @see docs/DHA_WEEK4_SHR_CONSENT_READ.md
 */
const { testAfyaConnectAuth } = require('./afyaConnectAuth');
const { getShrConfig, listOpenVisits } = require('./shrConsent');
const { UAT_CR_TEST_CASES } = require('./afyaConnectUatTestIds');

const DEFAULT_CR_ID =
  UAT_CR_TEST_CASES.find((c) => c.id === 'smoke-national-id')?.expectedCrId ||
  'CR6724396934727-8';

async function runUatShrSmokeTest(opts = {}) {
  const crId = opts.crId || process.env.SHR_SMOKE_CR_ID || DEFAULT_CR_ID;
  const cfg = getShrConfig(opts.settings ?? null);

  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    return {
      ok: false,
      auth,
      config: cfg,
      error: 'OAuth failed — fix AFYACONNECT_* before SHR smoke test',
    };
  }

  const missing = [];
  if (!cfg.facilityFrCode) missing.push('SHR_FACILITY_FR_CODE');
  if (!cfg.apiRoot) missing.push('FHIR_BASE_URL or CLIENT_REGISTRY_BASE_URL');
  if (!cfg.defaultPractitionerPuid) missing.push('SHR_DEFAULT_PRACTITIONER_PUID');

  if (!cfg.facilityFrCode || !cfg.apiRoot) {
    return {
      ok: false,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
      config: cfg,
      error: `SHR config incomplete: ${missing.filter((m) => m !== 'SHR_DEFAULT_PRACTITIONER_PUID').join(', ')}`,
    };
  }

  const started = Date.now();
  try {
    const open = await listOpenVisits({ crId }, opts.settings ?? null);
    const visits = open?.data?.visits || open?.data?.visit || [];
    const visitCount = Array.isArray(visits) ? visits.length : 0;
    return {
      ok: true,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost, latencyMs: auth.latencyMs },
      config: {
        facilityFrCode: cfg.facilityFrCode,
        practitionerConfigured: Boolean(cfg.defaultPractitionerPuid),
        apiRootHost: cfg.apiRoot ? new URL(cfg.apiRoot).host : null,
      },
      warnings: missing.length ? [`Set ${missing.join(', ')} before consent OTP / read`] : [],
      openVisits: { crId, visitCount, httpStatus: open.status },
      latencyMs: Date.now() - started,
      note:
        'Full consent OTP flow is manual/UAT-only. Use patient Documents → National SHR consent for end-to-end.',
    };
  } catch (err) {
    return {
      ok: false,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
      config: cfg,
      crId,
      error: err.message || String(err),
      httpStatus: err.status,
      latencyMs: Date.now() - started,
    };
  }
}

module.exports = { runUatShrSmokeTest, DEFAULT_CR_ID };
