/**
 * Admin preflight: CR contacts for claims OTP (UAT member).
 */
const { resolveEligibilityMode } = require('./afyaConnectEligibility');
const { listPatientContacts } = require('./afyaConnectClaimsConsent');
const { resolvePreflightMemberCrId } = require('./afyaConnectEclaimsPreflight');

async function runPreflightContactsSmoke() {
  const mode = resolveEligibilityMode();
  if (mode === 'disabled') {
    return { ok: true, mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  }

  const crResolve = await resolvePreflightMemberCrId();
  if (crResolve.error) {
    return { ok: false, mode, error: crResolve.error };
  }

  const result = await listPatientContacts({ patientCrId: crResolve.memberCrNumber });
  if (result.error && result.mode === 'live') {
    return {
      ok: false,
      mode,
      patientCrId: crResolve.memberCrNumber,
      error: result.error,
    };
  }

  const count = result.contacts?.length ?? 0;
  return {
    ok: mode === 'sandbox' || count > 0,
    mode,
    patientCrId: crResolve.memberCrNumber,
    contactsCount: count,
    error:
      count > 0 || mode === 'sandbox'
        ? null
        : 'No CR contacts returned — claims OTP needs a contact_id',
  };
}

module.exports = { runPreflightContactsSmoke };
