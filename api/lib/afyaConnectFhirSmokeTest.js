/**
 * Connectivity smoke: POST minimal SHR collection Bundle (queued accept, not full IG validation).
 */
const crypto = require('crypto');
const { testAfyaConnectAuth } = require('./afyaConnectAuth');
const { postShrBundle, prepareShrSubmissionBundle } = require('./afyaConnectFhirPublish');

const UAT_FHIR_SMOKE_NUPI = 'CR6724396934727-8';

function buildMinimalPatientBundle() {
  return prepareShrSubmissionBundle({
    id: crypto.randomUUID(),
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: `hmis-smoke-patient-${Date.now()}`,
          meta: { source: 'intellinex-hmis-fhir-smoke' },
          identifier: [
            {
              use: 'official',
              system: 'https://cr.health.go.ke/nupi',
              value: UAT_FHIR_SMOKE_NUPI,
            },
          ],
          name: [{ family: 'MOHAMUD', given: ['OMAR'] }],
          gender: 'male',
          birthDate: '1977-01-01',
        },
      },
    ],
  });
}

async function runUatFhirSmokeTest(opts = {}) {
  const settings = opts.settings ?? null;
  const mode = (process.env.FHIR_MODE || '').toLowerCase() || 'sandbox';

  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    return {
      ok: false,
      auth,
      mode,
      error: 'OAuth failed — fix AFYACONNECT_* before FHIR smoke test',
    };
  }

  if (mode !== 'live') {
    return {
      ok: false,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
      mode,
      error: 'Set FHIR_MODE=live to run UAT SHR bundle smoke test',
    };
  }

  const started = Date.now();
  try {
    const bundle = buildMinimalPatientBundle();
    const result = await postShrBundle(settings, bundle);
    return {
      ok: result.ok,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost, latencyMs: auth.latencyMs },
      mode,
      bundleId: result.bundleId,
      httpStatus: result.status,
      summary: result.summary,
      latencyMs: Date.now() - started,
      note:
        'HTTP 2xx means accepted and queued. Full Encounter/EpisodeOfCare linking is required for production clinical bundles.',
    };
  } catch (err) {
    return {
      ok: false,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
      mode,
      error: err.message || String(err),
      latencyMs: Date.now() - started,
    };
  }
}

module.exports = {
  UAT_FHIR_SMOKE_NUPI,
  buildMinimalPatientBundle,
  runUatFhirSmokeTest,
};
