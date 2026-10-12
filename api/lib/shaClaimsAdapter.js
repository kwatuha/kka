/**
 * SHA (Social Health Authority) claims adapter (Phase 4 DHA).
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');
const { FHIR_META_SOURCE } = require('./productBrand');

async function loadSettings(executor) {
  const db = executor || pool;
  try {
    const [rows] = await db.execute(
      `SELECT shaMode, shaBaseUrl, autoSubmitShaClaims
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveMode(settings) {
  const fromEnv = (process.env.SHA_MODE || '').toLowerCase();
  if (['sandbox', 'live', 'disabled'].includes(fromEnv)) return fromEnv;
  return String(settings?.shaMode || 'sandbox').toLowerCase();
}

function isShaProvider(row) {
  const code = String(row.providerCode || '').toUpperCase();
  const name = String(row.providerName || '').toUpperCase();
  return code === 'SHA' || name.includes('SHA') || name.includes('SOCIAL HEALTH') || name.includes('NHIF');
}

async function loadClaim(executor, claimId) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT ic.*,
            i.invoiceNumber, i.totalAmount AS invoiceAmount, i.invoiceDate,
            pi.policyNumber, pi.memberId,
            p.patientId, p.patientNumber, p.firstName, p.lastName, p.dateOfBirth, p.gender, p.idNumber, p.nupi, p.phone,
            ip.providerName, ip.providerCode,
            b.mflCode, b.branchName
     FROM insurance_claims ic
     LEFT JOIN invoices i ON ic.invoiceId = i.invoiceId
     LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
     LEFT JOIN patients p ON pi.patientId = p.patientId
     LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
     LEFT JOIN branches b ON b.branchId = COALESCE(i.branchId, p.registeredBranchId)
     WHERE ic.claimId = ?
     LIMIT 1`,
    [claimId]
  );
  return rows[0] || null;
}

function buildShaPayload(claim) {
  return {
    schemaVersion: '1.0',
    source: FHIR_META_SOURCE,
    claim: {
      externalClaimId: String(claim.claimId),
      claimNumber: claim.claimNumber,
      claimAmount: Number(claim.claimAmount || claim.invoiceAmount || 0),
      claimDate: claim.claimDate || claim.invoiceDate || new Date().toISOString().slice(0, 10),
      invoiceNumber: claim.invoiceNumber || null,
      diagnosis: claim.diagnosis || claim.primaryDiagnosis || null,
      status: claim.status,
    },
    member: {
      memberId: claim.memberId || claim.policyNumber || null,
      policyNumber: claim.policyNumber || null,
      nupi: claim.nupi || null,
      nationalId: claim.idNumber || null,
      firstName: claim.firstName || null,
      lastName: claim.lastName || null,
      dateOfBirth: claim.dateOfBirth || null,
      gender: claim.gender || null,
      phone: claim.phone || null,
      patientNumber: claim.patientNumber || null,
    },
    facility: {
      mflCode: claim.mflCode || null,
      name: claim.branchName || null,
    },
    provider: {
      code: claim.providerCode || 'SHA',
      name: claim.providerName || 'Social Health Authority',
    },
  };
}

async function postLive(settings, payload) {
  const base = process.env.SHA_BASE_URL || settings?.shaBaseUrl || '';
  if (!base) throw new Error('SHA_BASE_URL not configured for live mode');
  const url = new URL('claims', base.endsWith('/') ? base : `${base}/`);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(process.env.SHA_API_KEY ? { Authorization: `Bearer ${process.env.SHA_API_KEY}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => '');
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    /* ignore */
  }
  return {
    ok: res.ok,
    status: res.status,
    body: body.slice(0, 400),
    externalReference: parsed?.claimReference || parsed?.id || parsed?.reference || null,
  };
}

async function submitClaim(executor, claimId, { force = false } = {}) {
  const settings = await loadSettings(executor);
  const mode = resolveMode(settings);
  if (mode === 'disabled') return { skipped: true, mode };

  const claim = await loadClaim(executor, claimId);
  if (!claim) throw new Error('Claim not found');
  if (!force && !isShaProvider(claim)) {
    return { skipped: true, mode, reason: 'Not an SHA/NHIF provider claim' };
  }

  const payload = buildShaPayload(claim);
  let status = 'queued';
  let httpStatus = null;
  let responseSummary = null;
  let externalReference = null;

  if (mode === 'live') {
    try {
      const result = await postLive(settings, payload);
      status = result.ok ? 'submitted' : 'failed';
      httpStatus = result.status;
      responseSummary = result.body;
      externalReference = result.externalReference;
      if (result.ok) status = 'accepted';
    } catch (err) {
      status = 'failed';
      responseSummary = err.message || String(err);
    }
  } else {
    status = 'accepted';
    httpStatus = 200;
    externalReference = `SHA-SBX-${claim.claimId}-${Date.now().toString(36).toUpperCase()}`;
    responseSummary = 'sandbox SHA acceptance';
  }

  const db = executor || pool;
  const [ins] = await db.execute(
    `INSERT INTO sha_claim_submissions
      (claimId, claimNumber, patientId, mode, status, externalReference, httpStatus, responseSummary, payloadJson, submittedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${['submitted', 'accepted'].includes(status) ? 'NOW()' : 'NULL'})`,
    [
      claim.claimId,
      claim.claimNumber || null,
      claim.patientId || null,
      mode,
      status,
      externalReference,
      httpStatus,
      responseSummary,
      JSON.stringify(payload),
    ]
  );

  try {
    await enqueueOutboxEvent(db, {
      eventType: 'sha.claim.submitted',
      aggregateType: 'insurance_claim',
      aggregateId: claim.claimId,
      payload: {
        submissionId: ins.insertId,
        claimId: claim.claimId,
        claimNumber: claim.claimNumber,
        mode,
        status,
        externalReference,
      },
    });
  } catch (err) {
    console.warn('[sha] outbox skipped:', err.message || err);
  }

  return {
    mode,
    status,
    submissionId: ins.insertId,
    externalReference,
    payload,
  };
}

async function shouldAutoSubmit(executor) {
  const settings = await loadSettings(executor);
  if (!settings) return true;
  return Boolean(settings.autoSubmitShaClaims);
}

module.exports = {
  loadSettings,
  resolveMode,
  submitClaim,
  buildShaPayload,
  isShaProvider,
  shouldAutoSubmit,
  loadClaim,
};
