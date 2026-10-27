/**
 * Add / retire intervention lines on an active national visit (Phase G).
 * Paths are tenant-specific — confirm in AfyaConnect Postman.
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');

/**
 * @param {{ nationalVisitId: string, interventionCode: string, quantity?: number, patientCrId?: string }} params
 */
async function addInterventionToVisit(params = {}) {
  const mode = resolveEclaimsMode();
  const visitId = params.nationalVisitId || params.visit_id || params.visitId;
  const code = params.interventionCode || params.intervention_code;
  if (!visitId) return { mode, error: 'nationalVisitId required' };
  if (!code) return { mode, error: 'interventionCode required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      nationalVisitId: String(visitId),
      interventionCode: String(code),
      lineId: `SBX-LINE-${Date.now()}`,
      message: 'Sandbox line add — not sent to AfyaConnect',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_ADD_LINE_PATH') || '/claims/interventions';
  const body = {
    visit_id: String(visitId),
    intervention_code: String(code),
  };
  if (!params.consentToken) {
    return {
      mode,
      error:
        'consentToken required (authorization_code from start visit — store in session.consentToken)',
    };
  }
  body.consent_token = String(params.consentToken);
  body.ConsentToken = String(params.consentToken);
  if (params.quantity != null) body.quantity = Number(params.quantity);
  if (params.patientCrId) body.patient_id = String(params.patientCrId);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  const lineId =
    data?.line_id ||
    data?.lineId ||
    data?.id ||
    data?.data?.line_id ||
    null;
  const interventionName = data?.intervention_name || data?.interventionName || null;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    nationalVisitId: String(visitId),
    interventionCode: String(code),
    interventionName: interventionName ? String(interventionName) : null,
    lineId: lineId ? String(lineId) : null,
    message:
      interventionName && lineId
        ? `${interventionName} added (${lineId})`
        : data?.message || 'Intervention added to visit',
    raw: data,
  };
}

/**
 * @param {{ nationalVisitId: string, lineId?: string, interventionCode?: string }} params
 */
async function retireInterventionFromVisit(params = {}) {
  const mode = resolveEclaimsMode();
  const visitId = params.nationalVisitId || params.visit_id || params.visitId;
  if (!visitId) return { mode, error: 'nationalVisitId required' };
  if (!params.lineId && !params.interventionCode) {
    return { mode, error: 'lineId or interventionCode required to retire' };
  }

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      nationalVisitId: String(visitId),
      message: 'Sandbox line retire — not sent to AfyaConnect',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_RETIRE_LINE_PATH') || '/claims/interventions/retire';
  const body = {};
  if (params.consentToken) {
    body.consent_token = String(params.consentToken);
    body.ConsentToken = String(params.consentToken);
  } else {
    body.visit_id = String(visitId);
  }
  if (params.lineId) body.line_id = String(params.lineId);
  if (params.interventionCode) body.intervention_code = String(params.interventionCode);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    nationalVisitId: String(visitId),
    message: data?.message || 'Intervention retired',
    raw: data,
  };
}

/**
 * @see https://hie-docs.dha.go.ke/docs/claims/process/interventions/switchIntervention
 */
async function switchInterventionOnVisit(params = {}) {
  const mode = resolveEclaimsMode();
  const consentToken = params.consentToken || params.consent_token;
  const existingCode =
    params.existingInterventionCode ||
    params.existing_intervention_code ||
    params.interventionCode;
  const newCode =
    params.newInterventionCode || params.new_intervention_code || params.switchToCode;
  if (!consentToken) {
    return { mode, error: 'consentToken required (active national visit)' };
  }
  if (!existingCode || !newCode) {
    return { mode, error: 'existingInterventionCode and newInterventionCode required' };
  }
  if (String(existingCode) === String(newCode)) {
    return { mode, error: 'new intervention must differ from existing' };
  }

  const retainBillItems = params.retainBillItems ?? params.retain_bill_items ?? true;

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      existingInterventionCode: String(existingCode),
      newInterventionCode: String(newCode),
      message: 'Sandbox intervention switch',
    };
  }

  const path =
    trimEnv('AFYACONNECT_CLAIMS_SWITCH_LINE_PATH') || '/claims/interventions/switch';
  const body = {
    consent_token: String(consentToken),
    ConsentToken: String(consentToken),
    existing_intervention_code: String(existingCode),
    new_intervention_code: String(newCode),
    retain_bill_items: Boolean(retainBillItems),
  };
  if (params.billFrom) body.bill_from = String(params.billFrom);
  if (params.billTo) body.bill_to = String(params.billTo);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    existingInterventionCode: String(existingCode),
    newInterventionCode: String(newCode),
    message: data?.message || 'Intervention switched',
    raw: data,
  };
}

module.exports = {
  addInterventionToVisit,
  retireInterventionFromVisit,
  switchInterventionOnVisit,
};
