const { testAfyaConnectAuth } = require('./afyaConnectAuth');
const { lookupFacility } = require('./facilityRegistry');
const { UAT_FR_TEST_CASES } = require('./afyaConnectUatTestFacilities');

/**
 * @param {{ pool?: import('mysql2/promise').Pool|null, cases?: typeof UAT_FR_TEST_CASES }} [opts]
 */
async function runUatFrSmokeTests(opts = {}) {
  const pool = opts.pool ?? null;
  const cases = opts.cases ?? UAT_FR_TEST_CASES;

  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    return {
      ok: false,
      auth,
      mode: (process.env.FACILITY_REGISTRY_MODE || '').toLowerCase() || 'sandbox',
      results: [],
      summary: { passed: 0, failed: 0, total: cases.length },
      error: 'OAuth failed — fix AFYACONNECT_* before Facility Registry smoke tests',
    };
  }

  const mode = (process.env.FACILITY_REGISTRY_MODE || '').toLowerCase() || 'sandbox';
  if (mode !== 'live') {
    return {
      ok: false,
      auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
      mode,
      results: [],
      summary: { passed: 0, failed: 0, total: cases.length },
      error: 'Set FACILITY_REGISTRY_MODE=live to run UAT Facility Registry smoke tests',
    };
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of cases) {
    const started = Date.now();
    let outcome = 'fail';
    let detail = null;
    let officialName = null;

    try {
      const resolved = await lookupFacility(pool, testCase.identifier, {
        identifierType: testCase.identifierType,
      });

      if (testCase.expect === 'found') {
        if (resolved.found && resolved.facility?.officialName) {
          outcome = 'pass';
          officialName = resolved.facility.officialName;
        } else {
          detail = 'Expected found=true with facility name';
        }
      } else if (resolved.found) {
        detail = 'Expected not_found but registry returned a match';
      } else {
        outcome = 'pass';
      }
    } catch (err) {
      detail = err.message?.slice(0, 300) || String(err);
    }

    if (outcome === 'pass') passed += 1;
    else failed += 1;

    results.push({
      id: testCase.id,
      label: testCase.label,
      identifier: testCase.identifier,
      identifierType: testCase.identifierType,
      expect: testCase.expect,
      outcome,
      officialName,
      latencyMs: Date.now() - started,
      detail,
    });
  }

  return {
    ok: failed === 0,
    auth: { ok: true, tokenUrlHost: auth.tokenUrlHost, latencyMs: auth.latencyMs },
    mode,
    results,
    summary: { passed, failed, total: cases.length },
  };
}

module.exports = { runUatFrSmokeTests };
