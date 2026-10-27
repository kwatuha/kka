/**
 * POST /claims/diagnoses — ICD-11 on national visit intervention.
 * @see https://hie-docs.dha.go.ke/eclaims/billing
 * @see https://hie-docs.dha.go.ke/docs/claims/process/billing/addDiagnosis
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');
const { practitionerFieldsForBillingLine } = require('./afyaConnectClaimPractitioner');
const { resolveClaimIcd11FromMedicalRecord } = require('./claimDiagnosisFromEncounter');

async function addClaimDiagnosis({
  consentToken,
  icdCode,
  interventionCode,
  practitioner,
}) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  const icd = String(icdCode || '').trim();
  const intervention = String(interventionCode || '').trim();
  if (!icd) return { mode, error: 'icdCode required (ICD-11, e.g. ca07.0)' };
  if (!intervention) return { mode, error: 'interventionCode required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      icdCode: icd,
      interventionCode: intervention,
      message: `Sandbox: diagnosis ${icd} on ${intervention}`,
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_DIAGNOSES_PATH') || '/claims/diagnoses';
  const body = {
    consent_token: String(consentToken),
    ConsentToken: String(consentToken),
    icd_code: icd,
    intervention_code: intervention,
  };
  Object.assign(body, practitionerFieldsForBillingLine(practitioner));

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data || {};
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    icdCode: icd,
    interventionCode: intervention,
    message: data.message || 'Diagnosis added to claim',
    raw: data,
  };
}

function claimHasDiagnoses(preview) {
  const raw = preview?.raw || preview;
  const count = Number(raw?.diagnoses_count);
  if (Number.isFinite(count) && count > 0) return true;
  const list = raw?.claim_diagnoses;
  if (Array.isArray(list) && list.length > 0) return true;
  for (const inv of raw?.invoices || []) {
    if (Array.isArray(inv.diagnoses) && inv.diagnoses.length > 0) return true;
    for (const line of inv.lines || []) {
      if (line.icd_code || line.icd11_code || line.icd11Code || line.diagnosis_code) {
        return true;
      }
    }
    const gaps = inv.missing_fields || inv.missingFields || [];
    if (Array.isArray(gaps) && gaps.some((g) => /DIAGNOSIS/i.test(String(g)))) {
      return false;
    }
  }
  return false;
}

/**
 * Add ICD-11 to each visit intervention when preview has none (required before submit).
 */
async function ensureClaimDiagnosesForSubmit({
  pool,
  patientId,
  medicalRecordId,
  consentToken,
  preview,
  practitioner,
  icdCode,
  interventionCodes,
}) {
  if (claimHasDiagnoses(preview)) {
    return { ok: true, skipped: true, message: 'Claim already has diagnosis' };
  }
  let resolveMeta = null;
  let icd = icdCode != null && String(icdCode).trim() !== '' ? String(icdCode).trim() : null;
  if (!icd && pool && (medicalRecordId || patientId)) {
    resolveMeta = await resolveClaimIcd11FromMedicalRecord(pool, { medicalRecordId, patientId });
    icd = resolveMeta.icd11Code;
  }
  icd = String(icd || trimEnv('AFYACONNECT_CLAIM_DEFAULT_ICD11') || 'ca07.0').trim();
  let codes = interventionCodes;
  if (!codes?.length) {
    codes = (preview?.interventions || [])
      .map((r) => r.interventionCode || r.intervention_code)
      .filter(Boolean);
  }
  codes = [...new Set(codes.map(String))];
  if (!codes.length) {
    return { ok: false, error: 'No intervention on visit — cannot add claim diagnosis' };
  }
  const added = [];
  const errors = [];
  for (const interventionCode of codes) {
    const result = await addClaimDiagnosis({
      consentToken,
      icdCode: icd,
      interventionCode,
      practitioner,
    });
    if (result.error) errors.push({ interventionCode, error: result.error });
    else added.push({ interventionCode, icdCode: icd, message: result.message });
  }
  if (!added.length) {
    return {
      ok: false,
      error: errors[0]?.error || 'Failed to add claim diagnosis',
      attempts: errors,
    };
  }
  return {
    ok: true,
    icdCode: icd,
    added,
    attempts: errors.length ? errors : undefined,
    resolveMeta,
  };
}

module.exports = {
  addClaimDiagnosis,
  ensureClaimDiagnosesForSubmit,
  claimHasDiagnoses,
};
