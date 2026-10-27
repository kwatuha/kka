/**
 * Run documented UAT Client Registry smoke cases (OAuth + live resolve).
 */
const { testAfyaConnectAuth } = require('./afyaConnectAuth');
const { resolveClient } = require('./clientRegistry');
const { UAT_CR_TEST_CASES } = require('./afyaConnectUatTestIds');

function isRegistryEmptyError(err) {
  const msg = String(err?.message || '');
  return msg.includes('zero results') || msg.includes('HTTP 404');
}

/**
 * @param {{ pool?: import('mysql2/promise').Pool|null, cases?: typeof UAT_CR_TEST_CASES }} [opts]
 */
async function runUatCrSmokeTests(opts = {}) {
  const pool = opts.pool ?? null;
  const cases = opts.cases ?? UAT_CR_TEST_CASES;

  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    return {
      ok: false,
      auth,
      mode: (process.env.CLIENT_REGISTRY_MODE || '').toLowerCase() || 'sandbox',
      results: [],
      summary: { passed: 0, failed: 0, skipped: cases.length },
      error: 'OAuth failed — fix AFYACONNECT_* before CR smoke tests',
    };
  }

  const mode = (process.env.CLIENT_REGISTRY_MODE || '').toLowerCase() || 'sandbox';
  if (mode !== 'live') {
    return {
      ok: false,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
      mode,
      results: [],
      summary: { passed: 0, failed: 0, skipped: cases.length },
      error: 'Set CLIENT_REGISTRY_MODE=live to run UAT CR smoke tests',
    };
  }

  const results = [];
  let passed = 0;
  let failed = 0;
  let nationalCrUnavailable = false;
  let nationalCrUnavailableReason = null;

  for (const testCase of cases) {
    const started = Date.now();
    let outcome = 'fail';
    let detail = null;
    let crId = null;

    try {
      const resolved = await resolveClient(pool, {
        idNumber: testCase.identificationNumber,
        identificationType: testCase.identificationType,
      });

      if (resolved.nationalCrUnavailable) {
        nationalCrUnavailable = true;
        nationalCrUnavailableReason =
          resolved.reason ||
          'National Client Registry (GET /patients) returned a DHA UAT server error';
      }

      if (testCase.expect === 'found') {
        if (resolved.found && resolved.nupi) {
          outcome = 'pass';
          crId = resolved.nupi;
          if (testCase.expectedCrId && resolved.nupi !== testCase.expectedCrId) {
            outcome = 'fail';
            detail = `Expected CR ID ${testCase.expectedCrId}, got ${resolved.nupi}`;
          }
        } else if (resolved.nationalCrUnavailable) {
          detail = nationalCrUnavailableReason;
        } else {
          detail = resolved.reason || 'Expected found=true with NUPI';
        }
      } else if (testCase.expect === 'not_found') {
        if (resolved.nationalCrUnavailable) {
          outcome = 'skip';
          detail = 'Skipped — national CR search unavailable (DHA UAT outage)';
        } else if (!resolved.found) {
          outcome = 'pass';
        } else if (testCase.optional) {
          outcome = 'pass';
          detail = 'Optional negative case — UAT registry now returns a match (auth path still OK)';
          crId = resolved.nupi || null;
        } else {
          detail = 'Expected not_found but registry returned a match';
        }
      }
    } catch (err) {
      if (testCase.expect === 'not_found' && isRegistryEmptyError(err)) {
        outcome = 'pass';
      } else {
        detail = err.message?.slice(0, 300) || String(err);
      }
    }

    if (outcome === 'pass') passed += 1;
    else if (outcome === 'skip') {
      /* do not count as pass or fail */
    } else failed += 1;

    results.push({
      id: testCase.id,
      label: testCase.label,
      identificationNumber: testCase.identificationNumber,
      identificationType: testCase.identificationType,
      expect: testCase.expect,
      expectedCrId: testCase.expectedCrId || null,
      outcome,
      crId,
      latencyMs: Date.now() - started,
      detail,
    });
  }

  return {
    ok: failed === 0 && !nationalCrUnavailable,
    nationalCrUnavailable,
    nationalCrUnavailableReason,
    hmisConfiguredOk: auth.ok && mode === 'live',
    auth: { ok: true, tokenUrlHost: auth.tokenUrlHost, latencyMs: auth.latencyMs },
    mode,
    results,
    summary: { passed, failed, total: cases.length },
    error: nationalCrUnavailable
      ? 'DHA UAT Client Registry lookup is down (not an HMIS config regression). Eligibility/eClaims may still work.'
      : null,
  };
}

module.exports = { runUatCrSmokeTests, isRegistryEmptyError };
