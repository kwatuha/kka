/**
 * SHR-aligned visit bundle: Patient + Organization + EpisodeOfCare + Encounter.
 * @see docs/DHA_SHR_PRODUCTION_READINESS.md
 */
const {
  buildPatient,
  buildOrganization,
  buildEpisodeOfCare,
  buildEncounter,
} = require('./fhirBuilders');

function buildVisitShrResources(patientRow, recordRow) {
  if (!recordRow?.recordId) {
    throw new Error('medical record row with recordId required for SHR visit bundle');
  }
  const patient = buildPatient({ ...patientRow, ...recordRow });
  const patientFhirId = patient.id;
  const eocId = `episodeofcare-${recordRow.recordId}`;
  const encFhirId = `encounter-${recordRow.recordId}`;

  const org = buildOrganization(recordRow);
  const eoc = buildEpisodeOfCare(recordRow, { id: eocId, patientFhirId });
  const enc = buildEncounter(recordRow, {
    id: encFhirId,
    patientFhirId,
    episodeOfCareId: eocId,
  });

  const resources = [patient];
  if (org) resources.push(org);
  resources.push(eoc, enc);

  return { resources, patientFhirId, eocId, encFhirId };
}

module.exports = { buildVisitShrResources };
