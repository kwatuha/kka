/**
 * National claim submit checklist for chart / preview API.
 */
const { trimEnv } = require('./afyaConnectEclaimsHttp');
const { claimHasDiagnoses } = require('./afyaConnectClaimsDiagnosis');
const { resolveClaimPractitionerForRequest } = require('./afyaConnectClaimPractitioner');
const { describeEncounterForClaims } = require('./claimDiagnosisFromEncounter');

async function buildClaimsSubmitReadiness({ pool, req, session, preview }) {
  const doctorResolved = await resolveClaimPractitionerForRequest(pool, req, {});
  const patientId = session?.patientId != null ? Number(session.patientId) : null;
  let encounterDiagnosis = null;
  if (pool && patientId && session?.medicalRecordId) {
    encounterDiagnosis = await describeEncounterForClaims(pool, {
      patientId,
      medicalRecordId: session.medicalRecordId,
    });
  }

  const hasBillingLines = Boolean((preview?.invoiceLines || []).length);
  const hasInterventions = Boolean((preview?.interventions || []).length);
  const hasDiagnosisOnClaim = claimHasDiagnoses(preview);
  const defaultIcd11 = trimEnv('AFYACONNECT_CLAIM_DEFAULT_ICD11') || null;
  const encounterIcd11 = encounterDiagnosis?.icd11Code || null;
  const canResolveDiagnosisOnSubmit = Boolean(hasDiagnosisOnClaim || encounterIcd11 || defaultIcd11);
  const missingAttachments = preview?.missingAttachmentInterventionCodes || [];

  const blockers = [];
  if (!doctorResolved.practitioner) {
    blockers.push(
      doctorResolved.hwrError ||
        'Claim doctor not set — user KMPDC reg, env AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER, or HWR lookup.'
    );
  }
  if (!hasInterventions) blockers.push('No intervention on national visit');
  if (!hasBillingLines) blockers.push('No billing invoice line (unit price > 0)');
  if (!canResolveDiagnosisOnSubmit) {
    blockers.push('Link HMIS encounter with ICD-10→ICD-11 or set AFYACONNECT_CLAIM_DEFAULT_ICD11');
  }
  if (missingAttachments.length) {
    blockers.push(`Missing attachments: ${missingAttachments.join(', ')}`);
  }

  return {
    claimDoctorOk: Boolean(doctorResolved.practitioner),
    claimDoctorSource: doctorResolved.source || null,
    claimDoctorIdentificationNumber: doctorResolved.practitioner?.identificationNumber || null,
    hasBillingLines,
    hasInterventions,
    attachmentsOk: missingAttachments.length === 0,
    hasDiagnosisOnClaim,
    encounterIcd11,
    canResolveDiagnosisOnSubmit,
    missingAttachments,
    requiresDischargeOtp: true,
    readyToSubmit: blockers.length === 0,
    blockers,
  };
}

module.exports = {
  buildClaimsSubmitReadiness,
};
