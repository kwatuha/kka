/**
 * POST /claims/attachments — supporting documents required before submit.
 * @see https://hie-docs.dha.go.ke/docs/claims/guides/adding-attachments
 */
const path = require('path');
const fs = require('fs');
const { trimEnv, resolveEclaimsMode, eclaimsMultipartRequest } = require('./afyaConnectEclaimsHttp');

/** Common claim attachment types (claim-level endpoint). */
const CLAIM_ATTACHMENT_DOCUMENT_TYPES = [
  'CASE_NOTE',
  'TREATMENT_PLAN',
  'REFERRAL_LETTER',
  'LAB_RESULTS',
  'IMAGING_RESULT',
  'INVOICE',
  'FINAL_BILL',
  'DISCHARGE_SUMMARY',
  'CARE_PLAN',
];

function suggestDocumentType(interventionCode, applicableTypes) {
  const allowed = Array.isArray(applicableTypes)
    ? applicableTypes.map((t) => String(t).toUpperCase())
    : [];
  if (allowed.length) return allowed[0];
  const code = String(interventionCode || '').toUpperCase();
  if (code.includes('003') || code.includes('RAD') || code.includes('IMG')) {
    return 'IMAGING_RESULT';
  }
  if (code.includes('LAB')) return 'LAB_RESULTS';
  return trimEnv('AFYACONNECT_CLAIMS_DEFAULT_DOCUMENT_TYPE') || 'CASE_NOTE';
}

function normalizeAttachmentRow(row, interventionCodeFallback) {
  if (!row || typeof row !== 'object') return null;
  return {
    attachmentId: row.id || row.attachment_id || row.attachmentId || null,
    interventionCode:
      row.intervention_code ||
      row.interventionCode ||
      interventionCodeFallback ||
      null,
    documentType: row.document_type || row.documentType || null,
    title: row.document_title || row.title || row.name || null,
  };
}

function extractAttachmentsFromClaimData(data) {
  const out = [];
  if (!data || typeof data !== 'object') return out;
  const top = data.attachments || data.claim_attachments;
  if (Array.isArray(top)) {
    for (const row of top) {
      const n = normalizeAttachmentRow(row);
      if (n) out.push(n);
    }
  }
  for (const inv of data.interventions || []) {
    const code = inv.intervention_code || inv.interventionCode;
    for (const row of inv.attachments || []) {
      const n = normalizeAttachmentRow(row, code);
      if (n) out.push(n);
    }
  }
  return out;
}

function interventionCodesMissingAttachments(interventions, attachments) {
  const codesOnVisit = (interventions || [])
    .map((r) => r.interventionCode || r.intervention_code)
    .filter(Boolean)
    .map(String);
  if (!codesOnVisit.length) return [];
  const covered = new Set(
    (attachments || [])
      .map((a) => a.interventionCode)
      .filter(Boolean)
      .map(String)
  );
  return codesOnVisit.filter((c) => !covered.has(c));
}

async function addClaimAttachment({
  consentToken,
  interventionCode,
  documentType,
  fileBuffer,
  fileName,
  mimeType,
}) {
  const mode = resolveEclaimsMode();
  if (!consentToken) return { mode, error: 'consentToken required' };
  if (!interventionCode) return { mode, error: 'interventionCode required' };
  if (!documentType) return { mode, error: 'documentType required' };
  if (!fileBuffer || !fileBuffer.length) return { mode, error: 'file required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      attachmentId: `SBX-ATT-${Date.now()}`,
      interventionCode: String(interventionCode),
      documentType: String(documentType),
      message: 'Sandbox attachment recorded',
    };
  }

  const apiPath = trimEnv('AFYACONNECT_CLAIMS_ATTACHMENTS_PATH') || '/claims/attachments';
  const live = await eclaimsMultipartRequest(apiPath, {
    fields: {
      consent_token: String(consentToken),
      ConsentToken: String(consentToken),
      intervention_code: String(interventionCode),
      document_type: String(documentType).toUpperCase(),
    },
    file: {
      buffer: fileBuffer,
      fileName: fileName || 'clinical-document.pdf',
      mimeType: mimeType || 'application/pdf',
    },
  });
  if (live.error) return live;
  const data = live.data?.data || live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    attachmentId: data?.id || data?.attachment_id || null,
    interventionCode: String(interventionCode),
    documentType: String(documentType),
    message: live.data?.message || 'Attachment added to claim',
    raw: live.data,
  };
}

async function readPatientDocumentFile(pool, patientId, documentId) {
  const [rows] = await pool.execute(
    `SELECT documentId, documentName, filePath, mimeType
     FROM patient_documents
     WHERE documentId = ? AND patientId = ?
     LIMIT 1`,
    [documentId, patientId]
  );
  const row = rows[0];
  if (!row?.filePath) {
    return { error: 'Patient document not found' };
  }
  const filePath = String(row.filePath);
  if (!fs.existsSync(filePath)) {
    return { error: 'Document file missing on server' };
  }
  const ext = path.extname(filePath) || '.pdf';
  const safeName = `${String(row.documentName || 'document').replace(/[^\w.-]+/g, '_')}${ext}`;
  return {
    buffer: fs.readFileSync(filePath),
    fileName: safeName,
    mimeType: row.mimeType || 'application/pdf',
    documentName: row.documentName,
  };
}

module.exports = {
  CLAIM_ATTACHMENT_DOCUMENT_TYPES,
  suggestDocumentType,
  extractAttachmentsFromClaimData,
  interventionCodesMissingAttachments,
  addClaimAttachment,
  readPatientDocumentFile,
};
