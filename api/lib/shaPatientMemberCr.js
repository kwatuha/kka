/**
 * Resolve national SHA member CR (NUPI) for HMIS patients — especially dependants
 * registered with birth certificate where eligibility API requires ClientRegistry ID.
 */
const { trimOrNull } = require('./dhaIdentification');
const { resolveClient } = require('./clientRegistry');
const { householdNumberToParentCrId } = require('./afyaConnectCrMapper');

/**
 * @param {import('mysql2/promise').Pool|null} pool
 * @param {{ nupi?: string|null, idNumber?: string|null, idType?: string|null }} patient
 */
async function resolveShaMemberCrForPatient(pool, patient) {
  const out = {
    memberCrNumber: trimOrNull(patient?.nupi),
    linkedParentCrId: null,
    householdNumber: null,
    isDependantMember: false,
    resolvedNupiFromCrLookup: false,
    dependantNote: null,
  };

  if (out.memberCrNumber) {
    if (/birth certificate/i.test(String(patient?.idType || ''))) {
      out.isDependantMember = true;
      out.dependantNote =
        'Dependant: national SHA uses NUPI on file (birth certificate is for CR search only).';
    }
    return out;
  }

  if (!trimOrNull(patient?.idNumber)) return out;

  const cr = await resolveClient(pool, {
    idNumber: patient.idNumber,
    idType: patient.idType,
    identificationType: patient.idType,
  });
  if (!cr.found || !cr.nupi) return out;

  out.memberCrNumber = cr.nupi;
  out.resolvedNupiFromCrLookup = true;
  out.householdNumber =
    cr.patient?.householdNumber || cr.dependant?.householdNumber || null;
  out.linkedParentCrId =
    cr.patient?.linkedParentCrId ||
    cr.dependant?.linkedParentCrId ||
    householdNumberToParentCrId(out.householdNumber);
  out.isDependantMember =
    cr.patient?.isDependantMember || Boolean(out.householdNumber || cr.dependant);
  out.dependantNote =
    cr.dependant?.note ||
    (out.isDependantMember
      ? 'Dependant linked to household on national CR — eligibility uses this member NUPI, not birth certificate alone.'
      : null);
  return out;
}

module.exports = { resolveShaMemberCrForPatient };
