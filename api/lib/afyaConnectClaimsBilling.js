/**
 * Billing lines, preview, outpatient submit (Phase G/H).
 * @see https://hie-docs.dha.go.ke/eclaims/billing
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');
const {
  extractAttachmentsFromClaimData,
  interventionCodesMissingAttachments,
} = require('./afyaConnectClaimsAttachments');
const { practitionerFieldsForBillingLine } = require('./afyaConnectClaimPractitioner');

function parseUatOtpFromMessage(message) {
  const m = String(message || '').match(/\bOTP is\s+(\d{4,8})\b/i);
  return m ? m[1] : null;
}

async function previewProviderClaim({ consentToken }) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (mode === 'sandbox') {
    return { mode, consentToken, interventions: [], invoiceLines: [], message: 'Sandbox preview' };
  }
  const path = trimEnv('AFYACONNECT_CLAIMS_PREVIEW_PATH') || '/claims/preview';
  const live = await eclaimsRequest('POST', path, {
    body: { consent_token: String(consentToken), ConsentToken: String(consentToken) },
  });
  if (live.error) return live;
  const data = live.data || {};
  const interventions = Array.isArray(data.interventions) ? data.interventions : [];
  const attachments = extractAttachmentsFromClaimData(data);
  const invoiceLines = [];
  for (const inv of data.invoices || []) {
    for (const line of inv.lines || []) {
      invoiceLines.push({
        ...line,
        invoice_number: inv.invoice_number,
      });
    }
  }
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    consentToken: String(consentToken),
    invoiceNumber: data.invoices?.[0]?.invoice_number || null,
    interventions: interventions.map((row) => ({
      lineId: row.id,
      interventionCode: row.intervention_code,
      name: row.intervention_name,
      workflowState: row.workflow_state,
    })),
    invoiceLines: invoiceLines.map((row) => ({
      lineId: row.id,
      interventionCode: row.intervention_code || row.item_code,
      name: row.item_name,
      unitPrice: row.unit_price,
      quantity: row.quantity,
      lineTotal: row.line_total_amount,
      invoiceNumber: row.invoice_number,
    })),
    attachments: attachments.map((row) => ({
      attachmentId: row.attachmentId ? String(row.attachmentId) : null,
      interventionCode: row.interventionCode ? String(row.interventionCode) : null,
      documentType: row.documentType ? String(row.documentType) : null,
      title: row.title ? String(row.title) : null,
    })),
    missingAttachmentInterventionCodes: interventionCodesMissingAttachments(
      interventions.map((row) => ({
        interventionCode: row.intervention_code,
      })),
      attachments
    ),
    totalClaimAmount: data.total_claim_amount,
    raw: data,
  };
}

async function addBillableClaimLine({
  consentToken,
  interventionCode,
  unitPrice,
  quantity,
  serviceName,
  practitioner,
}) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (!interventionCode) return { mode, error: 'interventionCode required' };
  const price = unitPrice != null ? String(unitPrice) : '1';
  const qty = quantity != null ? String(quantity) : '1';
  if (Number(price) <= 0) return { mode, error: 'unit_price must be greater than 0' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      lineId: `SBX-BILL-${Date.now()}`,
      interventionCode: String(interventionCode),
      message: 'Sandbox billing line',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_BILLING_LINE_PATH') || '/claims/lines';
  const body = {
    consent_token: String(consentToken),
    ConsentToken: String(consentToken),
    intervention_code: String(interventionCode),
    unit_price: price,
    quantity: qty,
  };
  if (serviceName) body.service_name = String(serviceName);
  Object.assign(body, practitionerFieldsForBillingLine(practitioner));

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    lineId: data?.id ? String(data.id) : null,
    interventionCode: String(interventionCode),
    message: data?.item_name
      ? `Billing line: ${data.item_name} (${data.line_total_amount} KES)`
      : 'Billable line added',
    raw: data,
  };
}

async function sendDischargeOtp({ consentToken, patientCrId }) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (mode === 'sandbox') {
    return { mode, uatOtpHint: '123456', message: 'Sandbox discharge OTP' };
  }
  const path = trimEnv('AFYACONNECT_CLAIMS_DISCHARGE_OTP_PATH') || '/claims/otp/discharge';
  const body = { consent_token: String(consentToken) };
  if (patientCrId) body.patient_id = String(patientCrId);
  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const message = live.data?.message || 'Discharge OTP sent';
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    message,
    uatOtpHint: parseUatOtpFromMessage(message),
    raw: live.data,
  };
}

async function submitInpatientDischarge({
  consentToken,
  invoiceNumber,
  dischargeReason,
  dischargeOtp,
}) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (!dischargeOtp) {
    return { mode, error: 'discharge OTP required — use Send discharge OTP first' };
  }

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      claimReference: `SBX-IP-DISCH-${Date.now()}`,
      message: 'Sandbox inpatient discharge',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_DISCHARGE_PATH') || '/claims/discharge';
  const body = {
    consent_token: String(consentToken),
    ConsentToken: String(consentToken),
    discharge_reason: String(dischargeReason || 'RECOVERED'),
    otp: String(dischargeOtp),
  };
  if (invoiceNumber) body.invoice_number = String(invoiceNumber);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    claimReference: data?.claim_id || data?.id || data?.reference || null,
    message: data?.message || 'Inpatient discharge submitted',
    dischargePath: path,
    raw: data,
  };
}

async function submitOutpatientClaim({
  consentToken,
  invoiceNumber,
  dischargeReason,
  dischargeOtp,
}) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (!invoiceNumber) return { mode, error: 'invoice_number required — run preview first' };
  if (!dischargeOtp) {
    return { mode, error: 'discharge OTP required — use Send discharge OTP first' };
  }

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      claimReference: `SBX-CLAIM-${Date.now()}`,
      message: 'Sandbox submit',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_SUBMIT_PATH') || '/claims/submit';
  const body = {
    consent_token: String(consentToken),
    ConsentToken: String(consentToken),
    invoice_number: String(invoiceNumber),
    discharge_reason: String(dischargeReason || 'RECOVERED'),
    otp: String(dischargeOtp),
  };
  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    claimReference: data?.claim_id || data?.id || data?.reference || null,
    message: data?.message || 'Claim submitted',
    raw: data,
  };
}

module.exports = {
  previewProviderClaim,
  addBillableClaimLine,
  sendDischargeOtp,
  submitInpatientDischarge,
  submitOutpatientClaim,
  parseUatOtpFromMessage,
};
