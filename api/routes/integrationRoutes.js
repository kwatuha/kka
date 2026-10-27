/**
 * Phase 2 DHA integration routes: Client Registry (NUPI) + Facility Registry (MFL)
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const pool = require('../config/db');
const {
  resolveClient,
  registerClient,
  loadSettings: loadCrSettings,
} = require('../lib/clientRegistry');
const {
  lookupFacility,
  syncBranches,
  loadSettings: loadFrSettings,
} = require('../lib/facilityRegistry');
const { enqueueOutboxEvent } = require('../lib/integrationOutbox');
const {
  getAfyaConnectPublicStatus,
  testAfyaConnectAuth,
  isAfyaConnectConfigured,
} = require('../lib/afyaConnectAuth');
const { listUatCrTestCases } = require('../lib/afyaConnectUatTestIds');
const { runUatCrSmokeTests } = require('../lib/afyaConnectCrSmokeTest');
const { listUatFrTestCases } = require('../lib/afyaConnectUatTestFacilities');
const { runUatFrSmokeTests } = require('../lib/afyaConnectFrSmokeTest');
const { runUatFhirSmokeTest } = require('../lib/afyaConnectFhirSmokeTest');
const { runUatShrSmokeTest } = require('../lib/afyaConnectShrSmokeTest');
const {
  checkShaEligibility,
  resolveEligibilityMode,
  runPreflightEligibilitySmoke,
} = require('../lib/afyaConnectEligibility');
const {
  listShaParentBenefits,
  listShaSubBenefits,
  listShaInterventions,
} = require('../lib/afyaConnectEclaims');
const { runPreflightEclaimsReadSmoke } = require('../lib/afyaConnectEclaimsPreflight');
const { runPreflightContactsSmoke } = require('../lib/afyaConnectContactsPreflight');
const { runPreflightBiometricsSmoke } = require('../lib/afyaConnectBiometricsPreflight');
const { getEclaimsConfigHints } = require('../lib/afyaConnectEclaimsConfigHints');
const { cancelShaPreauth } = require('../lib/afyaConnectClaimsPreauth');
const { listPatientContacts, sendClaimsOtp } = require('../lib/afyaConnectClaimsConsent');
const {
  createBiometricsAuthorization,
  rejectPendingAuthorization,
} = require('../lib/afyaConnectClaimsAuthorize');
const { startShaClaimsVisit } = require('../lib/afyaConnectClaimsVisit');
const { requestShaPreauth } = require('../lib/afyaConnectClaimsPreauth');
const {
  addInterventionToVisit,
  retireInterventionFromVisit,
  switchInterventionOnVisit,
} = require('../lib/afyaConnectClaimsLines');
const { closeNationalVisit } = require('../lib/afyaConnectClaimsClose');
const {
  previewProviderClaim,
  addBillableClaimLine,
  sendDischargeOtp,
  submitInpatientDischarge,
  submitOutpatientClaim,
} = require('../lib/afyaConnectClaimsBilling');
const {
  addClaimAttachment,
  readPatientDocumentFile,
  suggestDocumentType,
  CLAIM_ATTACHMENT_DOCUMENT_TYPES,
} = require('../lib/afyaConnectClaimsAttachments');
const {
  resolveClaimPractitionerForRequest,
  addClaimDoctor,
} = require('../lib/afyaConnectClaimPractitioner');
const {
  addClaimDiagnosis,
  ensureClaimDiagnosesForSubmit,
} = require('../lib/afyaConnectClaimsDiagnosis');
const { describeEncounterForClaims } = require('../lib/claimDiagnosisFromEncounter');
const { searchHealthWorker } = require('../lib/afyaConnectHealthWorkerRegistry');
const {
  runPreflightHwrSmoke,
  runPreflightClaimDoctorSmoke,
} = require('../lib/afyaConnectHwrPreflight');
const { buildClaimsSubmitReadiness } = require('../lib/shaClaimsReadiness');
const {
  setSessionMedicalRecordId,
  syncNationalClaimDiagnosisFromEncounter,
} = require('../lib/shaEclaimsEncounterLink');
const { runUatClaimDoctorSmokeTest } = require('../lib/afyaConnectClaimDoctorSmokeTest');
const shaEclaimsSessions = require('../lib/shaEclaimsSessions');

const claimsAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const { getShrConfig, listOpenVisits } = require('../lib/shrConsent');
const {
  getActiveSessionForPatient,
  startShrVisit,
  verifyShrVisitOtp,
  readShrRecordsForSession,
  startCloseShrVisitSession,
  verifyCloseShrVisitSession,
  refreshShrVisitSession,
  resendShrVisitOtp,
} = require('../lib/shrVisitSessions');

/**
 * GET /api/integrations/afyaconnect/status
 */
router.get('/afyaconnect/status', async (_req, res) => {
  try {
    res.json(getAfyaConnectPublicStatus());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-auth
 * Acquire OAuth token (result never includes the token string).
 */
router.post('/afyaconnect/test-auth', async (_req, res) => {
  try {
    const result = await testAfyaConnectAuth();
    res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error('afyaconnect test-auth:', err);
    res.status(500).json({ message: 'AfyaConnect auth test failed', error: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-cr
 * Body: { idNumber, identificationType? } — requires CLIENT_REGISTRY_MODE=live
 */
/**
 * GET /api/integrations/afyaconnect/uat-test-ids
 * Documented UAT Client Registry cases for manual / automated testing.
 */
router.get('/afyaconnect/uat-test-ids', async (_req, res) => {
  try {
    res.json({
      doc: 'docs/DHA_UAT_CR_TEST_IDS.md',
      cases: listUatCrTestCases(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-cr-smoke
 * Runs all documented UAT CR cases (requires CLIENT_REGISTRY_MODE=live).
 */
router.post('/afyaconnect/test-cr-smoke', async (_req, res) => {
  try {
    const report = await runUatCrSmokeTests({ pool });
    res.status(report.ok ? 200 : 502).json(report);
  } catch (err) {
    console.error('afyaconnect test-cr-smoke:', err);
    res.status(500).json({ message: 'Client Registry smoke test failed', error: err.message });
  }
});

/**
 * GET /api/integrations/afyaconnect/uat-test-facilities
 */
router.get('/afyaconnect/uat-test-facilities', async (_req, res) => {
  try {
    res.json({
      doc: 'docs/DHA_UAT_FR_TEST_IDS.md',
      cases: listUatFrTestCases(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-fr-smoke
 */
router.post('/afyaconnect/test-fr-smoke', async (_req, res) => {
  try {
    const report = await runUatFrSmokeTests({ pool });
    res.status(report.ok ? 200 : 502).json(report);
  } catch (err) {
    console.error('afyaconnect test-fr-smoke:', err);
    res.status(500).json({ message: 'Facility Registry smoke test failed', error: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-fr
 * Body: { identifier, identifierType? }
 */
/**
 * POST /api/integrations/afyaconnect/test-fhir-smoke
 * POST minimal Patient collection Bundle to SHR (requires FHIR_MODE=live).
 */
/**
 * GET /api/integrations/shr/status
 */
router.get('/shr/status', async (_req, res) => {
  try {
    res.json(getShrConfig());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/shr/open-visits
 * Body: { crId } — Client Registry ID (NUPI)
 */
router.post('/shr/open-visits', async (req, res) => {
  try {
    const crId = req.body?.crId || req.body?.cr_id || req.body?.nupi;
    if (!crId) return res.status(400).json({ message: 'crId is required' });
    const result = await listOpenVisits({ crId });
    res.json(result);
  } catch (err) {
    console.error('shr open-visits:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

/**
 * GET /api/integrations/shr/sessions/active/:patientId
 */
router.get('/shr/sessions/active/:patientId', async (req, res) => {
  try {
    const session = await getActiveSessionForPatient(Number(req.params.patientId));
    res.json({ session: session || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/shr/visits/start
 * Body: { patientId, visitType?, medicalRecordId?, emergency?, incapacityReason? }
 */
router.post('/shr/visits/start', async (req, res) => {
  try {
    const body = req.body || {};
    const patientId = Number(body.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let practitionerPuid =
      body.practitionerPuid ||
      body.practitioner_id ||
      req.user?.hwrPuid ||
      req.user?.practitionerPuid ||
      null;
    const actorId = req.user?.userId || req.user?.id;
    if (!practitionerPuid && actorId) {
      try {
        const [rows] = await pool.execute(
          'SELECT hwrPuid FROM users WHERE userId = ? AND voided = 0 LIMIT 1',
          [actorId]
        );
        practitionerPuid = rows[0]?.hwrPuid || null;
      } catch {
        /* column may be missing until migration 143 */
      }
    }
    const result = await startShrVisit({
      patientId,
      visitType: body.visitType || 'OP',
      medicalRecordId: body.medicalRecordId ? Number(body.medicalRecordId) : null,
      createdBy: actorId || null,
      practitionerPuid,
      emergency: Boolean(body.emergency),
      incapacityReason: body.incapacityReason,
      representativeCrId: body.representativeCrId || body.representative_cr_id,
      representativeRelationship:
        body.representativeRelationship || body.representative_relationship,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('shr visits/start:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

/**
 * POST /api/integrations/shr/visits/verify
 * Body: { sessionId, otp, consentDecision?, rejectionReason? }
 */
router.post('/shr/visits/verify', async (req, res) => {
  try {
    const { sessionId, otp, consentDecision, rejectionReason } = req.body || {};
    if (!sessionId || !otp) {
      return res.status(400).json({ message: 'sessionId and otp are required' });
    }
    const result = await verifyShrVisitOtp({
      sessionId: Number(sessionId),
      otp: String(otp),
      consentDecision: consentDecision || 'Approve',
      rejectionReason,
    });
    res.json(result);
  } catch (err) {
    console.error('shr visits/verify:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

/**
 * POST /api/integrations/shr/patient-records
 * Body: { sessionId, resources? }
 */
router.post('/shr/patient-records', async (req, res) => {
  try {
    const sessionId = Number(req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
    const result = await readShrRecordsForSession(sessionId, {
      resources: req.body?.resources,
    });
    res.json(result);
  } catch (err) {
    console.error('shr patient-records:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

router.post('/shr/visits/close', async (req, res) => {
  try {
    const sessionId = Number(req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
    const result = await startCloseShrVisitSession(sessionId, {
      patientIncapable: Boolean(req.body?.patientIncapable),
      incapacityReason: req.body?.incapacityReason,
    });
    res.json(result);
  } catch (err) {
    console.error('shr visits/close:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

router.post('/shr/visits/close/verify', async (req, res) => {
  try {
    const { sessionId, otp, otpRecord } = req.body || {};
    if (!sessionId || !otp || !otpRecord) {
      return res.status(400).json({ message: 'sessionId, otp, and otpRecord are required' });
    }
    const result = await verifyCloseShrVisitSession(Number(sessionId), {
      otp: String(otp),
      otpRecord: String(otpRecord),
    });
    res.json(result);
  } catch (err) {
    console.error('shr visits/close/verify:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

router.post('/shr/visits/refresh', async (req, res) => {
  try {
    const sessionId = Number(req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
    res.json(await refreshShrVisitSession(sessionId));
  } catch (err) {
    console.error('shr visits/refresh:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

router.post('/shr/visits/resend-otp', async (req, res) => {
  try {
    const sessionId = Number(req.body?.sessionId);
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
    res.json(await resendShrVisitOtp(sessionId));
  } catch (err) {
    console.error('shr visits/resend-otp:', err);
    res.status(err.status || 502).json({ message: err.message, detail: err.body || null });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-shr-smoke
 * SHR open-visits + config (requires SHR_FACILITY_FR_CODE + practitioner PUID).
 */
router.post('/afyaconnect/test-shr-smoke', async (_req, res) => {
  try {
    const report = await runUatShrSmokeTest({ settings: null });
    res.status(report.ok ? 200 : 502).json(report);
  } catch (err) {
    console.error('afyaconnect test-shr-smoke:', err);
    res.status(500).json({ message: 'SHR smoke test failed', error: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/test-claim-doctor-smoke
 * HWR lookup for env doctor + user hwrPuid; optional attach when consent token env set.
 */
router.post('/afyaconnect/test-claim-doctor-smoke', async (req, res) => {
  try {
    const report = await runUatClaimDoctorSmokeTest({ pool, req });
    res.status(report.ok ? 200 : 502).json(report);
  } catch (err) {
    console.error('afyaconnect test-claim-doctor-smoke:', err);
    res.status(500).json({ message: 'Claim doctor smoke test failed', error: err.message });
  }
});

/**
 * POST /api/integrations/afyaconnect/hwr/search
 * Body: { identificationNumber, identificationType?, regulator? }
 * DHA Health Worker Registry GET /professionals (live middleware + OAuth).
 */
router.post('/afyaconnect/hwr/search', async (req, res) => {
  try {
    const authProbe = await testAfyaConnectAuth();
    if (!authProbe.ok) {
      return res.status(502).json({
        message: 'Fix OAuth before Health Worker Registry search',
        auth: authProbe,
      });
    }
    const mode = resolveEligibilityMode();
    if (mode === 'disabled') {
      return res.status(400).json({
        message: 'Set ELIGIBILITY_MODE=live (or sandbox) to search HWR',
        currentMode: mode,
      });
    }
    const body = req.body || {};
    const identificationNumber =
      body.identificationNumber || body.identification_number || body.idNumber;
    if (!identificationNumber) {
      return res.status(400).json({ message: 'identificationNumber is required' });
    }
    const result = await searchHealthWorker({
      identificationNumber: String(identificationNumber),
      identificationType: body.identificationType || body.identification_type,
      regulator: body.regulator || body.regulationBody || body.regulation_body,
    });
    if (!result.ok) {
      return res.status(result.httpStatus === 400 ? 404 : 502).json({
        found: false,
        auth: { ok: true, tokenUrlHost: authProbe.tokenUrlHost },
        ...result,
      });
    }
    res.json({
      found: true,
      auth: { ok: true, tokenUrlHost: authProbe.tokenUrlHost },
      ...result,
    });
  } catch (err) {
    console.error('afyaconnect hwr/search:', err);
    res.status(502).json({ message: 'Health Worker Registry search failed', error: err.message });
  }
});

router.post('/afyaconnect/test-fhir-smoke', async (_req, res) => {
  try {
    const report = await runUatFhirSmokeTest({ settings: null });
    res.status(report.ok ? 200 : 502).json(report);
  } catch (err) {
    console.error('afyaconnect test-fhir-smoke:', err);
    res.status(500).json({ message: 'FHIR smoke test failed', error: err.message });
  }
});

/**
 * GET /api/integrations/sha/eligibility/status
 */
router.get('/sha/eligibility/status', async (_req, res) => {
  try {
    res.json({
      mode: resolveEligibilityMode(),
      doc: 'docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md',
      configured: resolveEligibilityMode() === 'live' ? isAfyaConnectConfigured() : true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/sha/eligibility/check
 * Body: { patientId, serviceType? }
 */
router.post('/sha/eligibility/check', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }
    const [rows] = await pool.execute(
      `SELECT patientId, nupi, idNumber, idType, firstName, lastName FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
      [patientId]
    );
    const patient = rows[0];
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const { resolveShaMemberCrForPatient } = require('../lib/shaPatientMemberCr');
    const memberCr = await resolveShaMemberCrForPatient(pool, patient);

    let nupiPersisted = false;
    if (memberCr.resolvedNupiFromCrLookup && !patient.nupi && memberCr.memberCrNumber) {
      await pool.execute(
        `UPDATE patients
         SET nupi = ?, nupiStatus = 'resolved', nupiResolvedAt = NOW(),
             linkedParentCrId = COALESCE(?, linkedParentCrId)
         WHERE patientId = ? AND voided = 0`,
        [memberCr.memberCrNumber, memberCr.linkedParentCrId || null, patientId]
      );
      nupiPersisted = true;
    } else if (memberCr.linkedParentCrId) {
      await pool
        .execute(
          `UPDATE patients SET linkedParentCrId = ? WHERE patientId = ? AND voided = 0 AND linkedParentCrId IS NULL`,
          [memberCr.linkedParentCrId, patientId]
        )
        .catch(() => {});
    }

    const result = await checkShaEligibility({
      crId: memberCr.memberCrNumber,
      nationalId: patient.idNumber,
      idType: patient.idType,
      serviceType: req.body?.serviceType || 'OUTPATIENT',
    });
    res.status(result.error && result.mode === 'live' ? 502 : 200).json({
      patientId,
      patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      linkedParentCrId: memberCr.linkedParentCrId,
      householdNumber: memberCr.householdNumber,
      isDependantMember: memberCr.isDependantMember,
      dependantNote: memberCr.dependantNote,
      nupiPersisted,
      suggestPersistNupi:
        !nupiPersisted && memberCr.resolvedNupiFromCrLookup && !patient.nupi
          ? memberCr.memberCrNumber
          : null,
      ...result,
      memberCrNumber: result.memberCrNumber || memberCr.memberCrNumber || null,
    });
  } catch (err) {
    console.error('sha eligibility/check:', err);
    res.status(err.status || 500).json({ message: err.message || 'Eligibility check failed' });
  }
});

async function loadPatientForSha(patientId) {
  const [rows] = await pool.execute(
    `SELECT patientId, nupi, idNumber, idType, firstName, lastName FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
    [patientId]
  );
  return rows[0] || null;
}

/** NUPI for national SHA APIs (dependants need CR id, not birth certificate alone). */
async function resolveMemberCrForPatient(patient, override) {
  const explicit =
    override != null && String(override).trim() !== '' ? String(override).trim() : null;
  if (explicit) return explicit;
  const { resolveShaMemberCrForPatient } = require('../lib/shaPatientMemberCr');
  const member = await resolveShaMemberCrForPatient(pool, patient);
  return member.memberCrNumber || null;
}

async function resolveShaClaimsSession(patientId, sessionId) {
  let session =
    sessionId != null
      ? await shaEclaimsSessions.getSessionById(Number(sessionId))
      : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
  if (!session?.nationalVisitId) {
    return { error: 'Active national visit required', httpStatus: 400 };
  }
  session = await shaEclaimsSessions.backfillConsentToken(session);
  const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
  if (!consentToken) {
    return { error: 'Missing consent token on session', httpStatus: 400 };
  }
  return { session, consentToken };
}

/**
 * POST /api/integrations/sha/benefits/parent-benefits
 * Body: { patientId, memberCrNumber? }
 */
router.post('/sha/benefits/parent-benefits', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const result = await listShaParentBenefits({ patientCrId });
    res.status(result.error && result.mode === 'live' ? 502 : 200).json({
      patientId,
      patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      ...result,
    });
  } catch (err) {
    console.error('sha parent-benefits:', err);
    res.status(500).json({ message: err.message || 'Parent benefits request failed' });
  }
});

/**
 * POST /api/integrations/sha/benefits/sub-benefits
 * Body: { patientId, memberCrNumber?, serviceType?, parentBenefitCode? }
 */
router.post('/sha/benefits/sub-benefits', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const result = await listShaSubBenefits({
      patientCrId,
      serviceType: req.body?.serviceType || 'OUTPATIENT',
      parentBenefitCode: req.body?.parentBenefitCode || req.body?.parent_benefit_code,
    });
    res.status(result.error && result.mode === 'live' ? 502 : 200).json({
      patientId,
      patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      ...result,
    });
  } catch (err) {
    console.error('sha sub-benefits:', err);
    res.status(500).json({ message: err.message || 'Sub-benefits request failed' });
  }
});

/**
 * POST /api/integrations/sha/benefits/member-coverage
 * UAT witness planning: OP vs IP sub-benefits for member + facility FR.
 * Body: { patientId, memberCrNumber? }
 */
router.post('/sha/benefits/member-coverage', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    if (!patientCrId) {
      return res.status(400).json({ message: 'memberCrNumber or patient NUPI required' });
    }
    const { analyzeMemberCoverage } = require('../lib/afyaConnectMemberCoverage');
    const result = await analyzeMemberCoverage({ patientCrId });
    res.status(result.error && result.mode === 'live' ? 502 : 200).json({
      patientId,
      patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      ...result,
    });
  } catch (err) {
    console.error('sha benefits/member-coverage:', err);
    res.status(500).json({ message: err.message || 'Member coverage analysis failed' });
  }
});

/**
 * POST /api/integrations/sha/benefits/interventions
 * Body: { patientId, subBenefitCode, memberCrNumber? }
 */
router.post('/sha/benefits/interventions', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    const subBenefitCode = req.body?.subBenefitCode || req.body?.sub_benefit_code;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!subBenefitCode) return res.status(400).json({ message: 'subBenefitCode is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const result = await listShaInterventions({ patientCrId, subBenefitCode });
    res.status(result.error && result.mode === 'live' ? 502 : 200).json({
      patientId,
      patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      ...result,
    });
  } catch (err) {
    console.error('sha interventions:', err);
    res.status(500).json({ message: err.message || 'Interventions request failed' });
  }
});

/**
 * GET /api/integrations/sha/claims/session/active/:patientId
 */
router.get('/sha/claims/session/active/:patientId', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    let session = await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (session) session = await shaEclaimsSessions.backfillConsentToken(session);
    let encounterDiagnosis = null;
    if (session?.medicalRecordId || patientId) {
      encounterDiagnosis = await describeEncounterForClaims(pool, {
        patientId,
        medicalRecordId: session?.medicalRecordId,
      });
    }
    res.json({ patientId, session, encounterDiagnosis });
  } catch (err) {
    if (String(err.message || '').includes("sha_eclaims_sessions")) {
      return res.status(503).json({
        message: 'Apply migration 145_sha_eclaims_sessions.sql',
        error: err.message,
      });
    }
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/integrations/sha/claims/session/history/:patientId?limit=15
 * Submitted / closed / failed national visits (audit on HMIS; claim lives on national HIE).
 */
router.get('/sha/claims/session/history/:patientId', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const limit = req.query?.limit != null ? Number(req.query.limit) : 15;
    const history = await shaEclaimsSessions.listClaimHistoryForPatient(patientId, { limit });
    res.json({ patientId, history });
  } catch (err) {
    if (String(err.message || '').includes("sha_eclaims_sessions")) {
      return res.status(503).json({
        message: 'Apply migration 145_sha_eclaims_sessions.sql',
        error: err.message,
      });
    }
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/integrations/sha/claims/contacts
 * Body: { patientId, memberCrNumber? }
 */
router.post('/sha/claims/contacts', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const result = await listPatientContacts({ patientCrId });
    const contacts = result.contacts || [];
    let dependantContactsHint = null;
    if (!result.error && contacts.length === 0) {
      const { resolveShaMemberCrForPatient } = require('../lib/shaPatientMemberCr');
      const memberCr = await resolveShaMemberCrForPatient(pool, patient);
      const isDependantLike =
        memberCr.isDependantMember ||
        /birth certificate/i.test(String(patient.idType || '')) ||
        Boolean(memberCr.linkedParentCrId);
      if (isDependantLike) {
        const parentCr =
          memberCr.linkedParentCrId ||
          (patient.linkedParentCrId ? String(patient.linkedParentCrId) : null);
        let parentContacts = [];
        if (parentCr) {
          const parentList = await listPatientContacts({ patientCrId: parentCr });
          parentContacts = parentList.contacts || [];
        }
        dependantContactsHint = {
          memberCrNumber: patientCrId,
          linkedParentCrId: parentCr,
          parentContactCount: parentContacts.length,
          parentContactSample: parentContacts[0]?.contactValue || null,
          note:
            'National GET /patients/contacts returned no rows for this dependant NUPI. DHA’s Get Beneficiary Valid Contact workflow should return parent/guardian phones here (same patient_id). Do not pass the parent’s contact_id from a separate parent contacts call — use contacts returned on the dependant query, omit contact_id to use the default contact, or ask DHA UAT to link guardian contacts on the dependant CR / OTP-whitelist the NUPI.',
          docUrl: 'https://hie-docs.dha.go.ke/docs/consent/process/getBeneficiaryValidContact',
        };
      }
    }
    res.status(result.error && result.mode === 'live' ? 502 : 200).json({
      patientId,
      ...result,
      contacts,
      dependantContactsHint,
    });
  } catch (err) {
    console.error('sha claims/contacts:', err);
    res.status(500).json({ message: err.message || 'Contacts request failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/authorize/biometrics
 * Body: { patientId, sessionId?, serviceType?, interventionCode?, interventionCodes?, memberCrNumber? }
 */
router.post('/sha/claims/authorize/biometrics', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const serviceType = req.body?.serviceType || 'OUTPATIENT';
    const interventionCode =
      req.body?.interventionCode || req.body?.intervention_code || null;

    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session) {
      session = await shaEclaimsSessions.createOrUpdateDraft({
        patientId,
        crId: patientCrId,
        serviceType,
        subBenefitCode: req.body?.subBenefitCode,
        interventionCode,
        medicalRecordId: req.body?.medicalRecordId,
        createdBy: req.user?.id || null,
      });
    }

    const result = await createBiometricsAuthorization({
      patientCrId,
      serviceType: session.serviceType || serviceType,
      interventionCode: interventionCode || session.interventionCode,
      interventionCodes: req.body?.interventionCodes,
      agentId: req.body?.agentId,
      workstationId: req.body?.workstationId,
    });
    if (result.error) {
      return res.status(result.mode === 'live' ? 502 : 400).json({
        sessionId: session.sessionId,
        ...result,
      });
    }
    const updated = await shaEclaimsSessions.markBiometricsPending(session.sessionId, {
      authGuid: result.authGuid,
      authorizationToken: result.authorizationToken,
      iframeUrl: result.iframeUrl,
      rawResponse: result.raw || result,
    });
    res.json({ patientId, session: updated, ...result });
  } catch (err) {
    console.error('sha claims/authorize/biometrics:', err);
    res.status(500).json({ message: err.message || 'Biometrics authorization failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/authorize/reject
 * Body: { authorizationToken } — reject stuck PENDING biometrics (iframe expired)
 */
router.post('/sha/claims/authorize/reject', async (req, res) => {
  try {
    const authorizationToken =
      req.body?.authorizationToken ||
      req.body?.consentToken ||
      req.body?.consent_token;
    if (!authorizationToken) {
      return res.status(400).json({ message: 'authorizationToken required' });
    }
    const result = await rejectPendingAuthorization(authorizationToken);
    if (result.error) return res.status(502).json(result);
    res.json(result);
  } catch (err) {
    console.error('sha claims/authorize/reject:', err);
    res.status(500).json({ message: err.message || 'Reject authorization failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/otp/send
 * Body: { patientId, contactId, serviceType?, subBenefitCode?, interventionCode?, memberCrNumber? }
 */
router.post('/sha/claims/otp/send', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    const contactIdRaw = req.body?.contactId;
    const contactId =
      contactIdRaw != null && String(contactIdRaw).trim() !== '' ? contactIdRaw : null;
    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const serviceType = req.body?.serviceType || 'OUTPATIENT';
    const session = await shaEclaimsSessions.createOrUpdateDraft({
      patientId,
      crId: patientCrId,
      serviceType,
      subBenefitCode: req.body?.subBenefitCode,
      interventionCode: req.body?.interventionCode,
      medicalRecordId: req.body?.medicalRecordId,
      createdBy: req.user?.id || null,
    });
    const interventionCode = req.body?.interventionCode || session.interventionCode;
    const interventionCodes = Array.isArray(req.body?.interventionCodes)
      ? req.body.interventionCodes
      : undefined;
    const otpResult = await sendClaimsOtp({
      patientCrId,
      contactId,
      serviceType,
      interventionCode,
      interventionCodes,
    });
    if (otpResult.error) {
      await shaEclaimsSessions.markFailed(session.sessionId, otpResult.error);
      return res.status(502).json({ sessionId: session.sessionId, ...otpResult });
    }
    const [openVisitRows] = await pool.execute(
      `SELECT sessionId, nationalVisitId FROM sha_eclaims_sessions
       WHERE patientId = ? AND sessionStatus = 'visit_active' AND nationalVisitId IS NOT NULL
       ORDER BY sessionId DESC LIMIT 1`,
      [patientId]
    );
    const openVisit = openVisitRows[0] || null;
    const updated = await shaEclaimsSessions.markOtpSent(session.sessionId, {
      contactId: contactId != null ? String(contactId) : 'default',
      otpRecord: otpResult.otpRecord,
      rawOtpResponse: otpResult.raw || otpResult,
    });
    res.json({
      patientId,
      session: updated,
      ...(openVisit
        ? {
            warning:
              'This patient already has an open national visit. Reload the page to continue it, or Close visit before starting a new one.',
            openNationalVisitId: openVisit.nationalVisitId,
            openSessionId: openVisit.sessionId,
          }
        : {}),
      ...otpResult,
    });
  } catch (err) {
    console.error('sha claims/otp/send:', err);
    if (String(err.message || '').includes("sha_eclaims_sessions")) {
      return res.status(503).json({
        message: 'Apply migration 145_sha_eclaims_sessions.sql',
        error: err.message,
      });
    }
    res.status(500).json({ message: err.message || 'Claims OTP send failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/visit/start
 * Body: { patientId, otp, sessionId?, serviceType?, subBenefitCode?, interventionCode?, memberCrNumber? }
 */
router.post('/sha/claims/visit/start', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    const otp = req.body?.otp != null ? String(req.body.otp).trim() : '';
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await loadPatientForSha(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientCrId = await resolveMemberCrForPatient(patient, req.body?.memberCrNumber);
    const serviceType = req.body?.serviceType || 'OUTPATIENT';

    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);

    const authGuidForVisit =
      req.body?.authGuid || (session?.authGuid ? String(session.authGuid) : null);
    if (!otp && !authGuidForVisit) {
      return res.status(400).json({
        message: 'otp or authGuid required — OTP path or completed biometrics authorization',
      });
    }

    if (!session) {
      session = await shaEclaimsSessions.createOrUpdateDraft({
        patientId,
        crId: patientCrId,
        serviceType,
        subBenefitCode: req.body?.subBenefitCode,
        interventionCode: req.body?.interventionCode,
        medicalRecordId: req.body?.medicalRecordId,
        createdBy: req.user?.id || null,
      });
    } else if (req.body?.medicalRecordId != null) {
      session = await setSessionMedicalRecordId(session.sessionId, Number(req.body.medicalRecordId));
    }

    if (session.sessionStatus === 'visit_active' && session.nationalVisitId) {
      return res.status(400).json({
        message:
          'National visit is already open for this session — continue the claim below or Close visit before starting again.',
        sessionId: session.sessionId,
        nationalVisitId: session.nationalVisitId,
        session,
      });
    }
    if (session.sessionStatus === 'failed') {
      return res.status(400).json({
        message: 'Previous attempt failed — Send claims OTP again, then Start SHA visit.',
        sessionId: session.sessionId,
        lastError: session.lastError,
        session,
      });
    }

    let otpRecord = session.otpRecord || undefined;
    if (!otpRecord && session.rawResponseJson) {
      try {
        const raw =
          typeof session.rawResponseJson === 'string'
            ? JSON.parse(session.rawResponseJson)
            : session.rawResponseJson;
        const inner = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
        otpRecord =
          inner?.otp_record ||
          inner?.otpRecord ||
          inner?.consent_request_id ||
          raw?.otp_record ||
          raw?.otpRecord ||
          undefined;
      } catch {
        /* ignore */
      }
    }

    const visitResult = await startShaClaimsVisit({
      patientCrId,
      serviceType: session.serviceType || serviceType,
      subBenefitCode: req.body?.subBenefitCode || session.subBenefitCode,
      interventionCode: req.body?.interventionCode || session.interventionCode,
      otp: otp || undefined,
      otpRecord: otpRecord || undefined,
      authGuid: authGuidForVisit || undefined,
      consentToken: req.body?.consentToken,
    });

    if (visitResult.error) {
      await shaEclaimsSessions.markFailed(session.sessionId, visitResult.error);
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: 'start_visit',
        message: visitResult.error,
        serviceType: session.serviceType || serviceType,
        ...visitResult,
      });
    }

    const updated = await shaEclaimsSessions.markVisitStarted(session.sessionId, {
      nationalVisitId: visitResult.nationalVisitId,
      consentToken: visitResult.consentToken,
      authGuid: visitResult.raw?.authorization_guid || visitResult.raw?.auth_guid,
      rawResponse: visitResult.raw || visitResult,
    });

    let nationalDiagnosisSync = null;
    if (updated?.medicalRecordId && visitResult.consentToken) {
      nationalDiagnosisSync = await syncNationalClaimDiagnosisFromEncounter(pool, {
        patientId,
        medicalRecordId: updated.medicalRecordId,
        req,
      });
    }

    res.json({
      patientId,
      session: updated,
      nationalDiagnosisSync,
      ...visitResult,
    });
  } catch (err) {
    console.error('sha claims/visit/start:', err);
    if (String(err.message || '').includes("sha_eclaims_sessions")) {
      return res.status(503).json({
        message: 'Apply migration 145_sha_eclaims_sessions.sql',
        error: err.message,
      });
    }
    res.status(500).json({ message: err.message || 'Start SHA visit failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/preauth/request
 * Body: { sessionId?, patientId, interventionCode?, notes? }
 */
router.post('/sha/claims/preauth/request', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required — start SHA visit first' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    const patient = await loadPatientForSha(patientId);
    const result = await requestShaPreauth({
      nationalVisitId: session.nationalVisitId,
      consentToken,
      interventionCode: req.body?.interventionCode || session.interventionCode,
      patientCrId: session.crId || patient?.nupi,
      notes: req.body?.notes,
      preauthType: req.body?.preauthType || req.body?.preauth_type || 'normal',
      preauthReason: req.body?.preauthReason || req.body?.reason,
    });
    if (result.error) {
      const updatedOnError = await shaEclaimsSessions.markStepError(
        session.sessionId,
        result.error
      );
      return res.status(502).json({
        sessionId: session.sessionId,
        session: updatedOnError,
        nationalStep: 'preauth',
        message: result.error,
        ...result,
      });
    }
    const updated = await shaEclaimsSessions.markPreauth(
      session.sessionId,
      result.preauthReference,
      result.raw || result
    );
    res.json({ patientId, session: updated, ...result });
  } catch (err) {
    console.error('sha claims/preauth:', err);
    const msg = err.message || 'Preauth request failed';
    if (String(msg).includes('preauthReference')) {
      return res.status(503).json({ message: 'Apply migration 146_sha_eclaims_refs.sql', detail: msg });
    }
    res.status(500).json({ message: msg });
  }
});

/**
 * POST /api/integrations/sha/claims/preview
 * Body: { sessionId?, patientId }
 */
router.post('/sha/claims/preview', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    if (!consentToken) {
      return res.status(400).json({ message: 'Missing consent token on session' });
    }
    const result = await previewProviderClaim({ consentToken });
    if (result.error) return res.status(502).json({ sessionId: session.sessionId, ...result });
    const submitReadiness = await buildClaimsSubmitReadiness({
      pool,
      req,
      session,
      preview: result,
    });
    res.json({ patientId, sessionId: session.sessionId, submitReadiness, ...result });
  } catch (err) {
    console.error('sha claims/preview:', err);
    res.status(500).json({ message: err.message || 'Preview failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/billing/lines/add
 * Body: { sessionId?, patientId, interventionCode, unitPrice?, quantity? }
 */
router.post('/sha/claims/billing/lines/add', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const interventionCode = req.body?.interventionCode;
    if (!interventionCode) return res.status(400).json({ message: 'interventionCode is required' });
    const resolved = await resolveShaClaimsSession(patientId, req.body?.sessionId);
    if (resolved.error) {
      return res.status(resolved.httpStatus || 400).json({ message: resolved.error });
    }
    const { session, consentToken } = resolved;
    const visitPreview = await previewProviderClaim({ consentToken });
    if (visitPreview.error) {
      return res.status(502).json({ sessionId: session.sessionId, ...visitPreview });
    }
    const onVisit = (visitPreview.interventions || []).map((r) =>
      String(r.interventionCode)
    );
    if (!onVisit.includes(String(interventionCode))) {
      return res.status(400).json({
        sessionId: session.sessionId,
        message: `Intervention ${interventionCode} is not on the national visit — use Add intervention first.`,
        visitInterventionCodes: onVisit,
      });
    }
    const doctorResolved = await resolveClaimPractitionerForRequest(pool, req, req.body);
    const result = await addBillableClaimLine({
      consentToken,
      interventionCode,
      unitPrice: req.body?.unitPrice,
      quantity: req.body?.quantity,
      practitioner: doctorResolved.practitioner,
    });
    if (result.error) return res.status(502).json({ sessionId: session.sessionId, ...result });
    const preview = await previewProviderClaim({ consentToken });
    res.json({ patientId, sessionId: session.sessionId, preview, ...result });
  } catch (err) {
    console.error('sha claims/billing/lines/add:', err);
    res.status(500).json({ message: err.message || 'Billing line failed' });
  }
});

/**
 * GET /api/integrations/sha/claims/attachments/document-types
 */
router.get('/sha/claims/attachments/document-types', (_req, res) => {
  res.json({ documentTypes: CLAIM_ATTACHMENT_DOCUMENT_TYPES });
});

/**
 * POST /api/integrations/sha/claims/attachments/upload
 * multipart: file, patientId, sessionId?, interventionCode, documentType?
 */
router.post(
  '/sha/claims/attachments/upload',
  claimsAttachmentUpload.single('file'),
  async (req, res) => {
    try {
      const patientId = Number(req.body?.patientId);
      if (!patientId) return res.status(400).json({ message: 'patientId is required' });
      const interventionCode = req.body?.interventionCode;
      if (!interventionCode) {
        return res.status(400).json({ message: 'interventionCode is required' });
      }
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ message: 'file is required' });
      }
      const resolved = await resolveShaClaimsSession(patientId, req.body?.sessionId);
      if (resolved.error) {
        return res.status(resolved.httpStatus || 400).json({ message: resolved.error });
      }
      const { session, consentToken } = resolved;
      const documentType =
        req.body?.documentType ||
        suggestDocumentType(interventionCode, req.body?.applicableDocumentTypes);
      const result = await addClaimAttachment({
        consentToken,
        interventionCode,
        documentType,
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname || 'attachment.pdf',
        mimeType: req.file.mimetype,
      });
      if (result.error) {
        return res.status(502).json({ sessionId: session.sessionId, ...result });
      }
      const preview = await previewProviderClaim({ consentToken });
      res.json({ patientId, sessionId: session.sessionId, preview, ...result });
    } catch (err) {
      console.error('sha claims/attachments/upload:', err);
      res.status(500).json({ message: err.message || 'Attachment upload failed' });
    }
  }
);

/**
 * POST /api/integrations/sha/claims/attachments/from-document
 * Body: { patientId, sessionId?, documentId, interventionCode?, documentType?, attachAllMissing? }
 */
router.post('/sha/claims/attachments/from-document', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const documentId = Number(req.body?.documentId);
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });

    const resolved = await resolveShaClaimsSession(patientId, req.body?.sessionId);
    if (resolved.error) {
      return res.status(resolved.httpStatus || 400).json({ message: resolved.error });
    }
    const { session, consentToken } = resolved;
    const file = await readPatientDocumentFile(pool, patientId, documentId);
    if (file.error) return res.status(404).json({ message: file.error });

    const previewBefore = await previewProviderClaim({ consentToken });
    if (previewBefore.error) {
      return res.status(502).json({ sessionId: session.sessionId, ...previewBefore });
    }

    let targets = [];
    if (req.body?.attachAllMissing) {
      targets = previewBefore.missingAttachmentInterventionCodes || [];
    } else if (req.body?.interventionCode) {
      targets = [String(req.body.interventionCode)];
    } else {
      return res.status(400).json({
        message: 'interventionCode or attachAllMissing=true is required',
      });
    }

    const results = [];
    for (const code of targets) {
      const documentType =
        req.body?.documentType || suggestDocumentType(code, req.body?.applicableDocumentTypes);
      const result = await addClaimAttachment({
        consentToken,
        interventionCode: code,
        documentType,
        fileBuffer: file.buffer,
        fileName: file.fileName,
        mimeType: file.mimeType,
      });
      results.push({ interventionCode: code, ...result });
      if (result.error) {
        return res.status(502).json({
          sessionId: session.sessionId,
          partial: results,
          ...result,
        });
      }
    }

    const preview = await previewProviderClaim({ consentToken });
    res.json({
      patientId,
      sessionId: session.sessionId,
      documentName: file.documentName,
      attached: results,
      preview,
    });
  } catch (err) {
    console.error('sha claims/attachments/from-document:', err);
    res.status(500).json({ message: err.message || 'Attach from document failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/discharge/otp/send
 */
router.post('/sha/claims/discharge/otp/send', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    if (!consentToken) {
      return res.status(400).json({ message: 'Missing consent token on session' });
    }
    const patient = await loadPatientForSha(patientId);
    const result = await sendDischargeOtp({
      consentToken,
      patientCrId: session.crId || patient?.nupi,
    });
    if (result.error) return res.status(502).json({ sessionId: session.sessionId, ...result });
    res.json({ patientId, sessionId: session.sessionId, ...result });
  } catch (err) {
    console.error('sha claims/discharge/otp:', err);
    res.status(500).json({ message: err.message || 'Discharge OTP failed' });
  }
});

/**
 * GET /api/integrations/sha/claims/encounter-diagnosis?patientId=&medicalRecordId=
 */
router.get('/sha/claims/encounter-diagnosis', async (req, res) => {
  try {
    const patientId = Number(req.query?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const medicalRecordId =
      req.query?.medicalRecordId != null ? Number(req.query.medicalRecordId) : null;
    const encounterDiagnosis = await describeEncounterForClaims(pool, {
      patientId,
      medicalRecordId,
    });
    res.json({ patientId, encounterDiagnosis });
  } catch (err) {
    console.error('sha claims/encounter-diagnosis:', err);
    res.status(500).json({ message: err.message || 'Encounter diagnosis resolve failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/session/link-encounter
 * Body: { patientId, sessionId?, medicalRecordId, pushToNational? }
 */
router.post('/sha/claims/session/link-encounter', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    const medicalRecordId = Number(req.body?.medicalRecordId);
    if (!patientId || !medicalRecordId) {
      return res.status(400).json({ message: 'patientId and medicalRecordId are required' });
    }
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session) {
      return res.status(400).json({ message: 'No active SHA claims session for this patient' });
    }
    session = await setSessionMedicalRecordId(session.sessionId, medicalRecordId);
    const encounterDiagnosis = await describeEncounterForClaims(pool, {
      patientId,
      medicalRecordId,
    });
    let nationalSync = null;
    if (req.body?.pushToNational !== false && session.nationalVisitId) {
      nationalSync = await syncNationalClaimDiagnosisFromEncounter(pool, {
        patientId,
        medicalRecordId,
        req,
      });
    }
    res.json({ patientId, session, encounterDiagnosis, nationalSync });
  } catch (err) {
    console.error('sha claims/session/link-encounter:', err);
    res.status(500).json({ message: err.message || 'Link encounter failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/diagnoses/add
 * Body: { sessionId?, patientId, icdCode, interventionCode }
 */
router.post('/sha/claims/diagnoses/add', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const icdCode = req.body?.icdCode || req.body?.icd_code;
    const interventionCode = req.body?.interventionCode || req.body?.intervention_code;
    if (!icdCode || !interventionCode) {
      return res.status(400).json({ message: 'icdCode and interventionCode are required' });
    }
    const resolved = await resolveShaClaimsSession(patientId, req.body?.sessionId);
    if (resolved.error) {
      return res.status(resolved.httpStatus || 400).json({ message: resolved.error });
    }
    const { session, consentToken } = resolved;
    const doctorResolved = await resolveClaimPractitionerForRequest(pool, req, req.body);
    const result = await addClaimDiagnosis({
      consentToken,
      icdCode,
      interventionCode,
      practitioner: doctorResolved.practitioner,
    });
    if (result.error) return res.status(502).json({ sessionId: session.sessionId, ...result });
    const preview = await previewProviderClaim({ consentToken });
    res.json({ patientId, sessionId: session.sessionId, preview, ...result });
  } catch (err) {
    console.error('sha claims/diagnoses/add:', err);
    res.status(500).json({ message: err.message || 'Add claim diagnosis failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/submit
 * Body: { sessionId?, patientId, dischargeOtp, dischargeReason?, icdCode?, interventionCode? }
 */
router.post('/sha/claims/submit', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    if (!consentToken) {
      return res.status(400).json({ message: 'Missing consent token on session' });
    }
    const preview = await previewProviderClaim({ consentToken });
    if (preview.error) {
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: 'preview',
        message: preview.error,
        ...preview,
      });
    }
    if (!preview.invoiceLines?.length) {
      return res.status(400).json({
        sessionId: session.sessionId,
        message:
          'No billable invoice lines — use Add billing line (not only Add intervention). Preview required before submit.',
        preview,
      });
    }
    if (preview.missingAttachmentInterventionCodes?.length) {
      return res.status(400).json({
        sessionId: session.sessionId,
        message: `Claim is missing attachments for: ${preview.missingAttachmentInterventionCodes.join(', ')}`,
        missingAttachmentInterventionCodes: preview.missingAttachmentInterventionCodes,
        preview,
      });
    }
    const doctorResolved = await resolveClaimPractitionerForRequest(pool, req, req.body);
    if (!doctorResolved.practitioner) {
      return res.status(400).json({
        sessionId: session.sessionId,
        preview,
        message:
          doctorResolved.hwrError ||
          'Claim doctor not configured — set user hwrRegistrationNumber (KMPDC), AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER, or user hwrPuid with HWR membership.',
        doctorResolve: {
          source: doctorResolved.source,
          puid: doctorResolved.puid || null,
        },
      });
    }
    const doctorResult = await addClaimDoctor({
      consentToken,
      practitioner: doctorResolved.practitioner,
    });
    if (doctorResult.error) {
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: 'claim_doctor',
        preview,
        message: doctorResult.error,
        doctorResolve: {
          source: doctorResolved.source,
          puid: doctorResolved.puid || null,
          attemptedIdentificationNumber: doctorResolved.practitioner?.identificationNumber,
        },
        ...doctorResult,
      });
    }
    const diagnosisEnsure = await ensureClaimDiagnosesForSubmit({
      pool,
      patientId,
      medicalRecordId: session.medicalRecordId,
      consentToken,
      preview,
      practitioner: doctorResolved.practitioner,
      icdCode: req.body?.icdCode || req.body?.icd_code,
      interventionCodes: req.body?.interventionCode
        ? [String(req.body.interventionCode)]
        : undefined,
    });
    if (!diagnosisEnsure.ok) {
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: 'claim_diagnosis',
        preview,
        message: diagnosisEnsure.error || 'Claim diagnosis required before submit',
        diagnosisEnsure,
      });
    }
    const visitServiceType = String(session.serviceType || 'OUTPATIENT').toUpperCase();
    const submitFn =
      visitServiceType === 'INPATIENT' ? submitInpatientDischarge : submitOutpatientClaim;
    const result = await submitFn({
      consentToken,
      invoiceNumber: preview.invoiceNumber,
      dischargeReason: req.body?.dischargeReason || 'RECOVERED',
      dischargeOtp: req.body?.dischargeOtp,
    });
    if (result.error) {
      await shaEclaimsSessions.markFailed(session.sessionId, result.error);
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: visitServiceType === 'INPATIENT' ? 'inpatient_discharge' : 'submit',
        message: result.error,
        preview,
        ...result,
      });
    }
    const updated = await shaEclaimsSessions.markClaimSubmitted(
      session.sessionId,
      result.claimReference,
      result.raw || result
    );
    res.json({
      patientId,
      session: updated,
      preview,
      claimDoctor: {
        source: doctorResolved.source,
        identificationNumber: doctorResolved.practitioner?.identificationNumber,
        regulationBody: doctorResolved.practitioner?.regulationBody,
      },
      claimDiagnosis: diagnosisEnsure.skipped ? null : diagnosisEnsure,
      ...result,
    });
  } catch (err) {
    console.error('sha claims/submit:', err);
    const msg = err.message || 'Claim submit failed';
    if (String(msg).includes('claimReference') || String(msg).includes('preauthReference')) {
      return res.status(503).json({ message: 'Apply migration 146_sha_eclaims_refs.sql', detail: msg });
    }
    res.status(500).json({ message: msg });
  }
});

/**
 * POST /api/integrations/sha/claims/visit/lines/add
 * Body: { sessionId?, patientId, interventionCode, quantity? }
 */
router.post('/sha/claims/visit/lines/add', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const interventionCode = req.body?.interventionCode;
    if (!interventionCode) return res.status(400).json({ message: 'interventionCode is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken =
      shaEclaimsSessions.consentTokenFromSession(session) || req.body?.consentToken;
    if (!consentToken) {
      return res.status(400).json({
        message:
          'Missing consent token — restart visit or re-open patient after deploy (authorization_code from start visit)',
      });
    }
    const patient = await loadPatientForSha(patientId);
    const result = await addInterventionToVisit({
      nationalVisitId: session.nationalVisitId,
      interventionCode,
      quantity: req.body?.quantity,
      patientCrId: session.crId || patient?.nupi,
      consentToken,
    });
    if (result.error) {
      return res.status(502).json({ sessionId: session.sessionId, ...result });
    }
    const preview = consentToken
      ? await previewProviderClaim({ consentToken })
      : null;
    res.json({ patientId, sessionId: session.sessionId, preview, ...result });
  } catch (err) {
    console.error('sha claims/visit/lines/add:', err);
    res.status(500).json({ message: err.message || 'Add line failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/visit/lines/switch
 * Body: { sessionId?, patientId, existingInterventionCode?, newInterventionCode, retainBillItems? }
 */
router.post('/sha/claims/visit/lines/switch', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const newInterventionCode =
      req.body?.newInterventionCode || req.body?.new_intervention_code;
    if (!newInterventionCode) {
      return res.status(400).json({ message: 'newInterventionCode is required' });
    }
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    if (!consentToken) {
      return res.status(400).json({ message: 'Missing consent token on session' });
    }
    const existingInterventionCode =
      req.body?.existingInterventionCode ||
      req.body?.existing_intervention_code ||
      session.interventionCode ||
      req.body?.interventionCode;
    if (!existingInterventionCode) {
      return res.status(400).json({
        message: 'existingInterventionCode required (or set on session from start visit)',
      });
    }
    const result = await switchInterventionOnVisit({
      consentToken,
      existingInterventionCode,
      newInterventionCode,
      retainBillItems: req.body?.retainBillItems ?? req.body?.retain_bill_items,
      billFrom: req.body?.billFrom || req.body?.bill_from,
      billTo: req.body?.billTo || req.body?.bill_to,
    });
    if (result.error) {
      return res.status(502).json({ sessionId: session.sessionId, ...result });
    }
    await shaEclaimsSessions.updateSessionIntervention(
      session.sessionId,
      String(newInterventionCode)
    );
    const preview = await previewProviderClaim({ consentToken });
    let submitReadiness = null;
    if (!preview.error) {
      submitReadiness = await buildClaimsSubmitReadiness({
        pool,
        req,
        session,
        preview,
      });
    }
    res.json({ patientId, sessionId: session.sessionId, preview, submitReadiness, ...result });
  } catch (err) {
    console.error('sha claims/visit/lines/switch:', err);
    res.status(500).json({ message: err.message || 'Switch intervention failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/visit/lines/retire
 * Body: { sessionId?, patientId, lineId?, interventionCode? }
 */
router.post('/sha/claims/visit/lines/retire', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    const result = await retireInterventionFromVisit({
      nationalVisitId: session.nationalVisitId,
      consentToken,
      lineId: req.body?.lineId,
      interventionCode: req.body?.interventionCode || session.interventionCode,
    });
    if (result.error) {
      return res.status(502).json({ sessionId: session.sessionId, ...result });
    }
    let preview = null;
    let submitReadiness = null;
    if (consentToken) {
      preview = await previewProviderClaim({ consentToken });
      if (!preview.error) {
        submitReadiness = await buildClaimsSubmitReadiness({
          pool,
          req,
          session,
          preview,
        });
      }
    }
    res.json({ patientId, sessionId: session.sessionId, preview, submitReadiness, ...result });
  } catch (err) {
    console.error('sha claims/visit/lines/retire:', err);
    res.status(500).json({ message: err.message || 'Retire line failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/visit/close
 * Body: { sessionId?, patientId, reason? }
 */
router.post('/sha/claims/visit/close', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    const result = await closeNationalVisit({
      nationalVisitId: session.nationalVisitId,
      consentToken,
      reason: req.body?.reason,
    });
    if (result.error) {
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: 'close_visit',
        message: result.error,
        ...result,
      });
    }
    const updated = await shaEclaimsSessions.markVisitClosed(
      session.sessionId,
      result.raw || result
    );
    res.json({ patientId, session: updated, ...result });
  } catch (err) {
    console.error('sha claims/visit/close:', err);
    res.status(500).json({ message: err.message || 'Close visit failed' });
  }
});

/**
 * POST /api/integrations/sha/claims/preauth/cancel
 * Body: { sessionId?, patientId, preauthReference?, reason? }
 */
router.post('/sha/claims/preauth/cancel', async (req, res) => {
  try {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    let session =
      req.body?.sessionId != null
        ? await shaEclaimsSessions.getSessionById(Number(req.body.sessionId))
        : await shaEclaimsSessions.getActiveSessionForPatient(patientId);
    if (!session?.nationalVisitId) {
      return res.status(400).json({ message: 'Active national visit required' });
    }
    session = await shaEclaimsSessions.backfillConsentToken(session);
    const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
    const preauthReference =
      req.body?.preauthReference || req.body?.preauthId || session.preauthReference;
    const { cancelShaPreauth } = require('../lib/afyaConnectClaimsPreauth');
    const result = await cancelShaPreauth({
      preauthReference,
      consentToken,
      interventionCode:
        req.body?.interventionCode || req.body?.intervention_code || session.interventionCode,
      reason: req.body?.reason,
    });
    if (result.error) {
      return res.status(502).json({
        sessionId: session.sessionId,
        nationalStep: 'preauth_cancel',
        message: result.error,
        ...result,
      });
    }
    res.json({ patientId, session, ...result });
  } catch (err) {
    console.error('sha claims/preauth/cancel:', err);
    res.status(500).json({ message: err.message || 'Preauth cancel failed' });
  }
});

/**
 * GET /api/integrations/afyaconnect/eclaims-config-hints
 * Resolved middleware paths for UAT / Postman alignment (no secrets).
 */
router.get('/afyaconnect/eclaims-config-hints', (_req, res) => {
  const { getEclaimsConfigHints } = require('../lib/afyaConnectEclaimsConfigHints');
  res.json(getEclaimsConfigHints());
});

/**
 * GET /api/integrations/afyaconnect/coverage-doc
 * Download assessor Word copy of integration coverage (when built on server).
 */
function downloadAssessorDocx(res, { fileName, buildScript, markdown }) {
  const candidates = [
    path.join(__dirname, '..', 'assets', fileName),
    path.join(__dirname, '..', '..', 'docs', fileName),
  ];
  const docPath = candidates.find((p) => fs.existsSync(p));
  if (!docPath) {
    return res.status(404).json({
      message: `Word doc not on server — run ${buildScript} (copies into api/assets for Docker)`,
      markdown,
    });
  }
  return res.download(docPath, fileName);
}

router.get('/afyaconnect/coverage-doc', (_req, res) => {
  downloadAssessorDocx(res, {
    fileName: 'DHA_AFYACONNECT_INTEGRATION_COVERAGE.docx',
    buildScript: 'docs/build-coverage-docx.sh',
    markdown: 'docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md',
  });
});

/**
 * GET /api/integrations/afyaconnect/outstanding-doc
 * Download Word copy of outstanding integration work / effort estimate.
 */
router.get('/afyaconnect/outstanding-doc', (_req, res) => {
  downloadAssessorDocx(res, {
    fileName: 'DHA_INTEGRATION_OUTSTANDING.docx',
    buildScript: 'docs/build-outstanding-docx.sh',
    markdown: 'docs/DHA_INTEGRATION_OUTSTANDING.md',
  });
});

/**
 * POST /api/integrations/afyaconnect/preflight
 * One-shot admin preflight (auth + CR/FR/SHR/FHIR smokes).
 */
router.post('/afyaconnect/preflight', async (_req, res) => {
  const started = Date.now();
  try {
    const auth = await testAfyaConnectAuth();
    const [cr, fr, hwr, claimDoctor, shr, fhir, eligibility, eclaimsRead, contacts, biometrics] =
      await Promise.all([
      runUatCrSmokeTests({ pool }).catch((e) => ({ ok: false, error: e.message })),
      runUatFrSmokeTests({ pool }).catch((e) => ({ ok: false, error: e.message })),
      runPreflightHwrSmoke().catch((e) => ({ ok: false, error: e.message })),
      runPreflightClaimDoctorSmoke(pool).catch((e) => ({ ok: false, error: e.message })),
      runUatShrSmokeTest({ settings: null }).catch((e) => ({ ok: false, error: e.message })),
      runUatFhirSmokeTest({ settings: null }).catch((e) => ({ ok: false, error: e.message })),
      runPreflightEligibilitySmoke().catch((e) => ({ ok: false, error: e.message })),
      runPreflightEclaimsReadSmoke().catch((e) => ({ ok: false, error: e.message })),
      runPreflightContactsSmoke().catch((e) => ({ ok: false, error: e.message })),
      Promise.resolve(runPreflightBiometricsSmoke()).catch((e) => ({ ok: false, error: e.message })),
    ]);
    const ok = Boolean(
      auth.ok &&
        cr.ok &&
        fr.ok &&
        hwr.ok &&
        claimDoctor.ok &&
        shr.ok &&
        fhir.ok &&
        eligibility.ok !== false &&
        eclaimsRead.ok !== false &&
        contacts.ok !== false
    );
    const { getEclaimsConfigHints } = require('../lib/afyaConnectEclaimsConfigHints');
    res.status(ok ? 200 : 502).json({
      ok,
      latencyMs: Date.now() - started,
      doc: 'docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md',
      eclaimsConfig: getEclaimsConfigHints(),
      nextSteps: [
        'Clinical: registration CR → SHR consent → encounter/lab (TaifaCare journey doc)',
        'Staff: Users → HWR PUID + KMPDC reg (National integrations → Search HWR)',
        'Witness SHIF OP now: CR6724396934727-8 / 12345678 → Outpatient visit fund → submit (see witnessTracks)',
        'Witness SHIF IP: email afyaconnect.dha@gmail.com for UAT CR with SHA-07 / IP sub-benefits at your FR',
        'PHC / ECCIF: Capitation or Emergency visit fund on chart (separate checklist items)',
        'Evidence: HIE smoke recorder PASS + national claim ref from chart history',
        'Local only: Billing → insurance claim → Reporting SHA sandbox (not national visit submit)',
      ],
      witnessChartSteps: [
        'Check eligibility → review UAT witness tracks on SHA card (OP ready vs IP awaiting DHA)',
        'Set National visit fund (not eligibility context alone) → sub-benefits → Send claims OTP → Start SHA visit',
        'Add intervention + billing line → attachments → Refresh preview (submit readiness green)',
        'OP: discharge OTP → Submit claim · IP: discharge OTP → Submit IP discharge when IP packages exist',
      ],
      auth,
      cr: {
        ok: cr.ok,
        error: cr.error || cr.nationalCrUnavailableReason || null,
        nationalCrUnavailable: cr.nationalCrUnavailable === true,
        hmisConfiguredOk: cr.hmisConfiguredOk === true,
      },
      fr: { ok: fr.ok, error: fr.error || null },
      hwr: {
        ok: hwr.ok,
        error: hwr.error || null,
        sampleRegistration: hwr.sampleRegistration || null,
        practitionerName: hwr.practitionerName || null,
      },
      claimDoctor: {
        ok: claimDoctor.ok,
        error: claimDoctor.error || null,
        source: claimDoctor.source || null,
        identificationNumber: claimDoctor.identificationNumber || null,
      },
      shr: { ok: shr.ok, error: shr.error || null, warnings: shr.warnings || null },
      fhir: { ok: fhir.ok, error: fhir.error || null },
      eligibility: {
        ok: eligibility.ok !== false,
        error: eligibility.error || null,
        mode: eligibility.mode || resolveEligibilityMode(),
        sampleId: eligibility.sampleId || null,
        memberCrNumber: eligibility.memberCrNumber || null,
        statusDesc: eligibility.statusDesc || null,
      },
      eclaimsRead: {
        ok: eclaimsRead.ok !== false,
        error: eclaimsRead.error || null,
        mode: eclaimsRead.mode || resolveEligibilityMode(),
        patientCrId: eclaimsRead.patientCrId || null,
        parentBenefitsCount: eclaimsRead.parentBenefitsCount ?? null,
        subBenefitsCount: eclaimsRead.subBenefitsCount ?? null,
        outpatientSubBenefitsCount: eclaimsRead.outpatientSubBenefitsCount ?? null,
        inpatientSubBenefitsCount: eclaimsRead.inpatientSubBenefitsCount ?? null,
        inpatientPackagesAvailable: eclaimsRead.inpatientPackagesAvailable ?? null,
        parentBenefitCodes: eclaimsRead.parentBenefitCodes ?? null,
        witnessTracks: eclaimsRead.witnessTracks ?? null,
        uatSmokeNote: eclaimsRead.uatSmokeNote ?? null,
      },
      contacts: {
        ok: contacts.ok !== false,
        error: contacts.error || null,
        mode: contacts.mode || resolveEligibilityMode(),
        patientCrId: contacts.patientCrId || null,
        contactsCount: contacts.contactsCount ?? null,
      },
      biometrics: {
        ok: biometrics.ok !== false,
        skipped: biometrics.skipped === true,
        configured: biometrics.configured === true,
        reason: biometrics.reason || null,
      },
    });
  } catch (err) {
    console.error('afyaconnect preflight:', err);
    res.status(500).json({ message: 'Preflight failed', error: err.message });
  }
});

router.post('/afyaconnect/test-fr', async (req, res) => {
  try {
    const authProbe = await testAfyaConnectAuth();
    if (!authProbe.ok) {
      return res.status(502).json({
        message: 'Fix OAuth before Facility Registry test',
        auth: authProbe,
      });
    }
    const mode = (process.env.FACILITY_REGISTRY_MODE || '').toLowerCase();
    if (mode !== 'live') {
      return res.status(400).json({
        message: 'Set FACILITY_REGISTRY_MODE=live on the server to run a facility lookup test',
        currentMode: mode || 'sandbox',
      });
    }
    const body = req.body || {};
    const identifier = body.identifier || body.mflCode || body.code;
    if (!identifier) {
      return res.status(400).json({ message: 'identifier is required' });
    }
    const result = await lookupFacility(pool, String(identifier), {
      identifierType: body.identifierType || body.identifier_type,
    });
    res.json({ auth: { ok: true, tokenUrlHost: authProbe.tokenUrlHost }, result });
  } catch (err) {
    console.error('afyaconnect test-fr:', err);
    res.status(502).json({ message: 'Facility Registry test failed', error: err.message });
  }
});

router.post('/afyaconnect/test-cr', async (req, res) => {
  try {
    const authProbe = await testAfyaConnectAuth();
    if (!authProbe.ok) {
      return res.status(502).json({
        message: 'Fix OAuth before Client Registry test',
        auth: authProbe,
      });
    }
    const mode = (process.env.CLIENT_REGISTRY_MODE || '').toLowerCase();
    if (mode !== 'live') {
      return res.status(400).json({
        message: 'Set CLIENT_REGISTRY_MODE=live on the server to run a national CR lookup test',
        currentMode: mode || 'sandbox',
      });
    }
    const body = req.body || {};
    const idNumber = body.idNumber || body.identificationNumber;
    if (!idNumber) {
      return res.status(400).json({ message: 'idNumber is required' });
    }
    const result = await resolveClient(pool, {
      idNumber: String(idNumber),
      identificationType: body.identificationType || body.idType || 'National ID',
    });
    res.json({ auth: { ok: true, tokenUrlHost: authProbe.tokenUrlHost }, result });
  } catch (err) {
    console.error('afyaconnect test-cr:', err);
    res.status(502).json({ message: 'Client Registry test failed', error: err.message });
  }
});

/**
 * GET /api/integrations/registry/settings
 */
router.get('/registry/settings', async (req, res) => {
  try {
    const cr = await loadCrSettings(pool);
    const fr = await loadFrSettings(pool);
    const [counts] = await pool.execute(
      `SELECT
         SUM(CASE WHEN mflCode IS NOT NULL AND mflCode != '' THEN 1 ELSE 0 END) AS withMfl,
         COUNT(*) AS branches
       FROM branches WHERE isActive = 1`
    );
    const [nupiCounts] = await pool.execute(
      `SELECT nupiStatus, COUNT(*) AS c FROM patients WHERE voided = 0 GROUP BY nupiStatus`
    );
    res.json({
      afyaConnect: getAfyaConnectPublicStatus(),
      clientRegistry: {
        mode: cr?.clientRegistryMode || 'sandbox',
        baseUrlConfigured: Boolean(
          process.env.CLIENT_REGISTRY_BASE_URL || cr?.clientRegistryBaseUrl
        ),
        autoResolveNupiOnRegister: cr?.autoResolveNupiOnRegister !== 0,
      },
      facilityRegistry: {
        mode: fr?.facilityRegistryMode || 'sandbox',
        baseUrlConfigured: Boolean(
          process.env.FACILITY_REGISTRY_BASE_URL || fr?.facilityRegistryBaseUrl
        ),
      },
      facilities: {
        activeBranches: Number(counts[0]?.branches || 0),
        withMflCode: Number(counts[0]?.withMfl || 0),
      },
      nupiByStatus: Object.fromEntries(
        (nupiCounts || []).map((r) => [r.nupiStatus, Number(r.c)])
      ),
    });
  } catch (err) {
    console.error('registry settings:', err);
    res.status(500).json({ message: 'Failed to load registry settings', error: err.message });
  }
});

/**
 * PUT /api/integrations/registry/settings
 */
router.put('/registry/settings', async (req, res) => {
  try {
    const {
      clientRegistryMode,
      clientRegistryBaseUrl,
      facilityRegistryMode,
      facilityRegistryBaseUrl,
      autoResolveNupiOnRegister,
    } = req.body || {};

    const updates = [];
    const values = [];
    if (clientRegistryMode !== undefined) {
      updates.push('clientRegistryMode = ?');
      values.push(clientRegistryMode);
    }
    if (clientRegistryBaseUrl !== undefined) {
      updates.push('clientRegistryBaseUrl = ?');
      values.push(clientRegistryBaseUrl || null);
    }
    if (facilityRegistryMode !== undefined) {
      updates.push('facilityRegistryMode = ?');
      values.push(facilityRegistryMode);
    }
    if (facilityRegistryBaseUrl !== undefined) {
      updates.push('facilityRegistryBaseUrl = ?');
      values.push(facilityRegistryBaseUrl || null);
    }
    if (autoResolveNupiOnRegister !== undefined) {
      updates.push('autoResolveNupiOnRegister = ?');
      values.push(autoResolveNupiOnRegister ? 1 : 0);
    }
    if (!updates.length) {
      return res.status(400).json({ message: 'No settings to update' });
    }
    updates.push('updatedBy = ?');
    values.push(req.user?.id || null);
    await pool.execute(
      `UPDATE integration_registry_settings SET ${updates.join(', ')} WHERE settingId = 1`,
      values
    );
    const refreshed = await pool.execute(
      `SELECT settingId, clientRegistryMode, clientRegistryBaseUrl, facilityRegistryMode,
              facilityRegistryBaseUrl, autoResolveNupiOnRegister, updatedAt
       FROM integration_registry_settings WHERE settingId = 1`
    );
    res.json(refreshed[0][0]);
  } catch (err) {
    console.error('registry settings update:', err);
    res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
});

/**
 * POST /api/integrations/cr/resolve
 * Body: { idNumber?, phone?, nupi?, firstName?, lastName?, dateOfBirth?, gender? }
 */
router.post('/cr/resolve', async (req, res) => {
  try {
    const result = await resolveClient(pool, req.body || {});
    res.json(result);
  } catch (err) {
    console.error('CR resolve:', err);
    res.status(502).json({ message: 'Client Registry resolve failed', error: err.message });
  }
});

/**
 * POST /api/integrations/cr/register
 * Body: patient demographics (+ optional patientId to persist)
 */
router.post('/cr/register', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await registerClient(pool, body);
    if (result.skipped) {
      return res.json(result);
    }

    if (body.patientId && result.nupi) {
      await pool.execute(
        `UPDATE patients
         SET nupi = ?, nupiStatus = 'registered', crReference = ?, nupiResolvedAt = NOW()
         WHERE patientId = ? AND voided = 0`,
        [result.nupi, result.crReference || null, Number(body.patientId)]
      );
      try {
        await enqueueOutboxEvent(pool, {
          eventType: 'patient.nupi.registered',
          aggregateType: 'patient',
          aggregateId: String(body.patientId),
          payload: {
            patientId: Number(body.patientId),
            nupi: result.nupi,
            crReference: result.crReference,
            mode: result.mode,
          },
        });
      } catch (outboxErr) {
        console.warn('[integrations] nupi outbox skipped:', outboxErr.message);
      }
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('CR register:', err);
    res.status(502).json({ message: 'Client Registry register failed', error: err.message });
  }
});

/**
 * POST /api/integrations/cr/resolve-patient/:id
 * Resolve/register NUPI for an existing patient and persist.
 */
router.post('/cr/resolve-patient/:id', async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    const [rows] = await pool.execute(
      `SELECT patientId, firstName, lastName, middleName, dateOfBirth, gender,
              phone, idNumber, idType, nupi, nupiStatus
       FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
      [patientId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const patient = rows[0];
    let result = await resolveClient(pool, {
      idNumber: patient.idNumber,
      idType: patient.idType,
      phone: patient.phone,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      nupi: patient.nupi,
    });

    let status = 'resolved';
    if (!result.found || !result.nupi) {
      result = await registerClient(pool, patient);
      status = result.skipped ? 'skipped' : 'registered';
    }
    if (!result.nupi && !result.skipped) {
      await pool.execute(
        `UPDATE patients SET nupiStatus = 'failed' WHERE patientId = ?`,
        [patientId]
      );
      return res.status(502).json({ message: 'Could not obtain NUPI', result });
    }
    if (result.skipped) {
      return res.json({ patientId, ...result });
    }

    await pool.execute(
      `UPDATE patients
       SET nupi = ?, nupiStatus = ?, crReference = ?, nupiResolvedAt = NOW()
       WHERE patientId = ?`,
      [result.nupi, status, result.crReference || null, patientId]
    );

    try {
      await enqueueOutboxEvent(pool, {
        eventType: status === 'registered' ? 'patient.nupi.registered' : 'patient.nupi.resolved',
        aggregateType: 'patient',
        aggregateId: String(patientId),
        payload: {
          patientId,
          nupi: result.nupi,
          crReference: result.crReference,
          mode: result.mode,
          status,
        },
      });
    } catch (outboxErr) {
      console.warn('[integrations] nupi outbox skipped:', outboxErr.message);
    }

    res.json({
      patientId,
      nupi: result.nupi,
      nupiStatus: status,
      crReference: result.crReference,
      mode: result.mode,
    });
  } catch (err) {
    console.error('CR resolve-patient:', err);
    res.status(502).json({ message: 'NUPI resolve failed', error: err.message });
  }
});

/**
 * GET /api/integrations/mfl/branches — branches with MFL status
 * (Must be registered before /mfl/:code)
 */
router.get('/mfl/branches', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT branchId, branchCode, branchName, mflCode, kephLevel, facilityRegistrySyncedAt, isMainBranch, isActive
       FROM branches
       ORDER BY isMainBranch DESC, branchName ASC`
    );
    res.json({ branches: rows });
  } catch (err) {
    console.error('MFL branches:', err);
    res.status(500).json({ message: 'Failed to list facilities', error: err.message });
  }
});

/**
 * POST /api/integrations/mfl/sync
 */
router.post('/mfl/sync', async (req, res) => {
  try {
    const result = await syncBranches(pool);
    try {
      await enqueueOutboxEvent(pool, {
        eventType: 'facility.mfl.synced',
        aggregateType: 'facility_registry',
        aggregateId: 'bulk',
        payload: {
          mode: result.mode,
          synced: result.synced,
          total: result.total,
        },
      });
    } catch (outboxErr) {
      console.warn('[integrations] mfl sync outbox skipped:', outboxErr.message);
    }
    res.json(result);
  } catch (err) {
    console.error('MFL sync:', err);
    res.status(502).json({ message: 'Facility Registry sync failed', error: err.message });
  }
});

/**
 * GET /api/integrations/mfl/:code
 */
router.get('/mfl/:code', async (req, res) => {
  try {
    const result = await lookupFacility(pool, req.params.code, {
      identifierType: req.query.identifierType || req.query.identifier_type,
    });
    if (!result.found) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('MFL lookup:', err);
    res.status(502).json({ message: 'Facility Registry lookup failed', error: err.message });
  }
});

const { searchHptCatalog, loadCatalog: loadHptCatalog } = require('../lib/hptSandbox');

router.get('/hpt/search', async (req, res) => {
  try {
    const q = req.query.q || req.query.search || '';
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json({ mode: 'sandbox', results: searchHptCatalog(q, limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/hpt/catalog', async (_req, res) => {
  try {
    res.json({ mode: 'sandbox', catalog: loadHptCatalog() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/hpt/map-medication/:medicationId', async (req, res) => {
  try {
    const { hptCode } = req.body || {};
    if (!hptCode) return res.status(400).json({ message: 'hptCode is required' });
    const valid = loadHptCatalog().some((r) => r.hptCode === hptCode);
    if (!valid) return res.status(400).json({ message: 'Unknown sandbox HPT code' });
    await pool.execute(`UPDATE medications SET hptCode = ? WHERE medicationId = ?`, [
      hptCode,
      Number(req.params.medicationId),
    ]);
    const [rows] = await pool.execute(
      `SELECT medicationId, name, medicationCode, hptCode FROM medications WHERE medicationId = ?`,
      [Number(req.params.medicationId)]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
