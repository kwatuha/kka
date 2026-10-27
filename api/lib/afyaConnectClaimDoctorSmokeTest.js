/**
 * UAT smoke: HWR lookup + optional POST /claims/doctors when consent token provided.
 */
const { testAfyaConnectAuth } = require('./afyaConnectAuth');
const { trimEnv } = require('./afyaConnectEclaimsHttp');
const { getShrConfig } = require('./shrConsent');
const {
  lookupProfessionalByPuid,
  lookupProfessionalByRegistration,
} = require('./afyaConnectHealthWorkerRegistry');
const {
  addClaimDoctor,
  resolveClaimPractitionerFromEnvOrBody,
  resolveClaimPractitionerForRequest,
  loadActorHwrPuid,
} = require('./afyaConnectClaimPractitioner');

async function listSampleUserPuids(pool, limit = 8) {
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT userId, username, hwrPuid FROM users
       WHERE voided = 0 AND hwrPuid IS NOT NULL AND TRIM(hwrPuid) != ''
       ORDER BY userId ASC LIMIT ?`,
      [limit]
    );
    return rows.map((r) => ({
      userId: r.userId,
      username: r.username,
      hwrPuid: String(r.hwrPuid).trim(),
    }));
  } catch {
    return [];
  }
}

async function runUatClaimDoctorSmokeTest(opts = {}) {
  const pool = opts.pool || null;
  const req = opts.req || null;
  const consentToken =
    opts.consentToken ||
    trimEnv('AFYACONNECT_CLAIM_DOCTOR_SMOKE_CONSENT_TOKEN') ||
    null;

  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    return {
      ok: false,
      error: 'OAuth failed — fix AFYACONNECT_* before claim doctor smoke',
      auth,
    };
  }

  const cfg = getShrConfig(null);
  const started = Date.now();
  const checks = [];

  const envReg = trimEnv('AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER');
  if (envReg) {
    const reg = await lookupProfessionalByRegistration(
      envReg,
      trimEnv('AFYACONNECT_CLAIM_DOCTOR_REGULATION_BODY') || 'KMPDC'
    );
    checks.push({
      name: 'env_registration',
      registrationNumber: envReg,
      ...reg,
    });
  } else {
    checks.push({
      name: 'env_registration',
      skipped: true,
      note: 'Set AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER to validate env doctor in HWR',
    });
  }

  const defaultPuid = trimEnv('SHR_DEFAULT_PRACTITIONER_PUID');
  if (defaultPuid) {
    checks.push({
      name: 'shr_default_puid',
      puid: defaultPuid,
      ...(await lookupProfessionalByPuid(defaultPuid)),
    });
  }

  const actorPuid = req ? await loadActorHwrPuid(pool, req) : null;
  if (actorPuid) {
    checks.push({
      name: 'logged_in_user_puid',
      puid: actorPuid,
      userId: req.user?.userId || req.user?.id || null,
      username: req.user?.username || null,
      ...(await lookupProfessionalByPuid(actorPuid)),
    });
  }

  const sampleUsers = await listSampleUserPuids(pool);
  for (const u of sampleUsers.slice(0, 3)) {
    if (u.hwrPuid === actorPuid) continue;
    checks.push({
      name: 'db_user_puid',
      username: u.username,
      userId: u.userId,
      puid: u.hwrPuid,
      ...(await lookupProfessionalByPuid(u.hwrPuid)),
    });
  }

  let resolved = null;
  if (req) {
    resolved = await resolveClaimPractitionerForRequest(pool, req, {});
  } else {
    const fromEnv = resolveClaimPractitionerFromEnvOrBody({}, {});
    if (fromEnv) {
      resolved = { practitioner: fromEnv, source: 'body_or_env' };
    } else if (defaultPuid) {
      resolved = await resolveClaimPractitionerForRequest(
        null,
        { user: { hwrPuid: defaultPuid } },
        {}
      );
    }
  }

  let attachResult = null;
  if (consentToken && resolved?.practitioner) {
    attachResult = await addClaimDoctor({
      consentToken,
      practitioner: resolved.practitioner,
    });
  }

  const hwrOk = checks.some((c) => c.ok === true);
  const attachOk = attachResult && !attachResult.error;
  const ok = Boolean(hwrOk || attachOk || resolved?.practitioner);

  return {
    ok,
    auth: { ok: true, tokenUrlHost: auth.tokenUrlHost, latencyMs: auth.latencyMs },
    config: {
      facilityFrCode: cfg.facilityFrCode || null,
      envDoctorConfigured: Boolean(envReg),
      defaultPuid: defaultPuid || null,
    },
    checks,
    resolvedForSubmit: resolved,
    attachOnActiveClaim: consentToken
      ? attachResult
      : {
          skipped: true,
          note: 'Set AFYACONNECT_CLAIM_DOCTOR_SMOKE_CONSENT_TOKEN (or pass consentToken) to test POST /claims/doctors',
        },
    latencyMs: Date.now() - started,
    note:
      'Claim submit uses env KMPDC reg, then logged-in user hwrPuid → HWR registration. PUID-as-registration is off unless AFYACONNECT_CLAIM_DOCTOR_ALLOW_PUID_FALLBACK=1.',
  };
}

module.exports = { runUatClaimDoctorSmokeTest, listSampleUserPuids };
