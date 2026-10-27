/**
 * Attending practitioner (claim doctor) for national eClaims.
 * @see https://hie-docs.dha.go.ke/docs/claims/guides/adding-claim-doctor
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');
const { lookupProfessionalByPuid } = require('./afyaConnectHealthWorkerRegistry');

function looksLikeHwrPuid(value) {
  return /^PUID-/i.test(String(value || '').trim());
}

function normalizePractitioner(input) {
  if (!input?.identificationNumber) return null;
  const identificationNumber = String(input.identificationNumber).trim();
  if (!identificationNumber) return null;
  const identificationType = String(
    input.identificationType || 'registration_number'
  ).trim();
  const regulationBody = String(input.regulationBody || 'KMPDC').trim();
  if (!identificationType || !regulationBody) return null;
  if (
    identificationType === 'registration_number' &&
    looksLikeHwrPuid(identificationNumber)
  ) {
    return null;
  }
  return { identificationType, identificationNumber, regulationBody };
}

function resolveClaimPractitionerFromEnvOrBody(_req, body = {}) {
  const fromBody = normalizePractitioner({
    identificationType:
      body.practitionerIdentificationType || body.practitioner_identification_type,
    identificationNumber:
      body.practitionerIdentificationNumber || body.practitioner_identification_number,
    regulationBody:
      body.practitionerRegulationBody || body.practitioner_regulation_body,
  });
  if (fromBody) return fromBody;

  const idNumber = trimEnv('AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER');
  if (!idNumber) return null;
  if (/[<>]/.test(idNumber) || /from HWR/i.test(idNumber) || idNumber.length > 24) {
    return null;
  }
  return normalizePractitioner({
    identificationType: trimEnv('AFYACONNECT_CLAIM_DOCTOR_ID_TYPE') || 'registration_number',
    identificationNumber: idNumber,
    regulationBody: trimEnv('AFYACONNECT_CLAIM_DOCTOR_REGULATION_BODY') || 'KMPDC',
  });
}

/** @deprecated use resolveClaimPractitionerFromEnvOrBody */
function resolveClaimPractitioner(req, body = {}) {
  return resolveClaimPractitionerFromEnvOrBody(req, body);
}

async function loadActorHwrPuid(pool, req) {
  let puid =
    req?.user?.hwrPuid ||
    req?.user?.practitionerPuid ||
    null;
  const actorId = req?.user?.userId || req?.user?.id;
  if (!puid && actorId && pool) {
    try {
      const [rows] = await pool.execute(
        'SELECT hwrPuid FROM users WHERE userId = ? AND voided = 0 LIMIT 1',
        [actorId]
      );
      puid = rows[0]?.hwrPuid || null;
    } catch {
      /* column may be missing until migration 143 */
    }
  }
  return puid ? String(puid).trim() : null;
}

async function loadActorHwrRegistration(pool, req) {
  let reg =
    req?.user?.hwrRegistrationNumber ||
    req?.user?.claimDoctorRegistrationNumber ||
    null;
  const actorId = req?.user?.userId || req?.user?.id;
  if (!reg && actorId && pool) {
    try {
      const [rows] = await pool.execute(
        'SELECT hwrRegistrationNumber FROM users WHERE userId = ? AND voided = 0 LIMIT 1',
        [actorId]
      );
      reg = rows[0]?.hwrRegistrationNumber || null;
    } catch {
      /* column may be missing until migration 148 */
    }
  }
  reg = String(reg || '').trim();
  if (!reg || looksLikeHwrPuid(reg)) return null;
  return normalizePractitioner({
    identificationType: 'registration_number',
    identificationNumber: reg,
    regulationBody: trimEnv('AFYACONNECT_CLAIM_DOCTOR_REGULATION_BODY') || 'KMPDC',
  });
}

async function practitionerFromPuidChain(puid) {
  const id = String(puid || '').trim();
  if (!id) return { practitioner: null, puid: null };

  const hwr = await lookupProfessionalByPuid(id);
  if (hwr.ok && hwr.practitioner) {
    return {
      practitioner: normalizePractitioner({
        identificationType: hwr.practitioner.identificationType,
        identificationNumber: hwr.practitioner.identificationNumber,
        regulationBody: hwr.practitioner.regulationBody,
      }),
      source: 'hwr_from_puid',
      puid: id,
      hwr,
    };
  }

  const allowFallback = trimEnv('AFYACONNECT_CLAIM_DOCTOR_ALLOW_PUID_FALLBACK') === '1';
  if (allowFallback) {
    const fallback = normalizePractitioner({
      identificationType: 'registration_number',
      identificationNumber: id,
      regulationBody: 'KMPDC',
    });
    if (fallback) {
      return {
        practitioner: fallback,
        source: 'puid_as_registration_fallback',
        puid: id,
        hwr,
      };
    }
  }

  return {
    practitioner: null,
    source: null,
    puid: id,
    hwr,
    hwrError: `Could not map hwrPuid ${id} to a KMPDC registration number — set AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER on the server (real KMPDC reg, not PUID).`,
  };
}

/**
 * Resolve claim doctor: body → env → logged-in user PUID (HWR) → SHR default PUID → optional PUID fallback.
 */
async function resolveClaimPractitionerForRequest(pool, req, body = {}) {
  const fromEnv = resolveClaimPractitionerFromEnvOrBody(req, body);
  if (fromEnv) {
    return { practitioner: fromEnv, source: 'body_or_env' };
  }

  const fromUserReg = await loadActorHwrRegistration(pool, req);
  if (fromUserReg) {
    return { practitioner: fromUserReg, source: 'user_kmpdc_registration' };
  }

  const actorPuid = await loadActorHwrPuid(pool, req);
  let lastHwrError = null;
  if (actorPuid) {
    const fromUser = await practitionerFromPuidChain(actorPuid);
    if (fromUser.practitioner) return fromUser;
    lastHwrError = fromUser.hwrError || null;
  }

  const defaultPuid = trimEnv('SHR_DEFAULT_PRACTITIONER_PUID');
  if (defaultPuid && defaultPuid !== actorPuid) {
    const fromDefault = await practitionerFromPuidChain(defaultPuid);
    if (fromDefault.practitioner) {
      return { ...fromDefault, source: 'hwr_from_shr_default_puid' };
    }
    lastHwrError = fromDefault.hwrError || lastHwrError;
  }

  return {
    practitioner: null,
    source: null,
    puid: actorPuid || defaultPuid || null,
    hwrError:
      lastHwrError ||
      (actorPuid || defaultPuid
        ? 'HWR lookup failed — set AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER (KMPDC registration number, not PUID).'
        : 'No claim doctor env, user hwrPuid, or SHR_DEFAULT_PRACTITIONER_PUID'),
  };
}

function practitionerFieldsForBillingLine(practitioner) {
  const p = normalizePractitioner(practitioner);
  if (!p) return {};
  return {
    practitioner_identification_type: p.identificationType,
    practitioner_identification_number: p.identificationNumber,
    practitioner_regulation_body: p.regulationBody,
  };
}

async function addClaimDoctor({ consentToken, practitioner }) {
  const mode = resolveEclaimsMode();
  const p = normalizePractitioner(practitioner);
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (!p) {
    return {
      mode,
      error:
        'Claim doctor required — set AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER, user hwrPuid (HWR lookup), or pass practitionerIdentificationNumber',
    };
  }
  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      message: `Sandbox: doctor ${p.identificationNumber} attached`,
      practitioner: p,
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_DOCTORS_PATH') || '/claims/doctors';
  const body = {
    consent_token: String(consentToken),
    ConsentToken: String(consentToken),
    identification_type: p.identificationType,
    identification_number: p.identificationNumber,
    regulation_body: p.regulationBody,
  };
  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) {
    const detail = String(live.error);
    const hint =
      looksLikeHwrPuid(p.identificationNumber) || /Record not found in the Health Worker Registry/i.test(detail)
        ? ' Use a valid KMPDC registration number in AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER (PUID is not accepted as registration_number).'
        : '';
    return { ...live, error: `failed to add doctor to claim: ${detail}${hint}` };
  }
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    message: live.data?.message || 'Claim doctor attached',
    practitioner: p,
    raw: live.data,
  };
}

module.exports = {
  resolveClaimPractitioner,
  resolveClaimPractitionerFromEnvOrBody,
  resolveClaimPractitionerForRequest,
  loadActorHwrPuid,
  practitionerFieldsForBillingLine,
  addClaimDoctor,
};
