/**
 * Kenya FHIR IG profile URLs for SHR / HIE export.
 * @see https://fhir.dha.go.ke/ig/core/
 * @see https://fhir.dha.go.ke/ig/kps/
 */
const CORE_BASE = 'https://fhir.dha.go.ke/core/StructureDefinition';
const KPS_BASE = 'https://fhir.dha.go.ke/kps/StructureDefinition';

function profileSet() {
  const v = (process.env.FHIR_PROFILE_SET || 'kenya-core').toLowerCase();
  return v === 'kps' ? 'kps' : 'kenya-core';
}

const CORE_PROFILES = {
  Patient: `${CORE_BASE}/kenya-core-patient`,
  Encounter: `${CORE_BASE}/kenya-core-encounter`,
  EpisodeOfCare: `${CORE_BASE}/kenya-core-episode-of-care`,
  Observation: `${CORE_BASE}/kenya-core-observation`,
  Organization: `${CORE_BASE}/kenya-core-organization`,
  Condition: `${CORE_BASE}/kenya-core-condition`,
  Composition: `${CORE_BASE}/kenya-core-composition`,
};

const KPS_PROFILES = {
  Patient: `${KPS_BASE}/ke-kps-patient`,
  Encounter: `${KPS_BASE}/ke-kps-encounter`,
  EpisodeOfCare: `${KPS_BASE}/ke-kps-episode-of-care`,
  Observation: `${KPS_BASE}/ke-kps-observation`,
  Organization: `${KPS_BASE}/ke-kps-organization`,
  Condition: `${KPS_BASE}/ke-kps-condition`,
  Composition: `${KPS_BASE}/ke-kps-composition`,
};

function fhirProfile(resourceType) {
  const customKey = `FHIR_PROFILE_${String(resourceType || '').toUpperCase()}`;
  const custom = process.env[customKey];
  if (custom && String(custom).trim()) return String(custom).trim();
  const set = profileSet() === 'kps' ? KPS_PROFILES : CORE_PROFILES;
  return set[resourceType] || `http://hl7.org/fhir/StructureDefinition/${resourceType}`;
}

function crIdentifierSystem() {
  return (
    process.env.FHIR_CR_IDENTIFIER_SYSTEM || 'https://fhir.dha.go.ke/cr/nupi'
  );
}

function nationalIdIdentifierSystem() {
  return (
    process.env.FHIR_NATIONAL_ID_SYSTEM ||
    'https://fhir.dha.go.ke/fhir/identifier/nationalid'
  );
}

function facilityOrganizationId(frCodeOrMfl) {
  const code = String(frCodeOrMfl || '').trim();
  if (!code) return null;
  if (/^FID-/i.test(code)) return code;
  return `mfl-${code}`;
}

module.exports = {
  fhirProfile,
  profileSet,
  crIdentifierSystem,
  nationalIdIdentifierSystem,
  facilityOrganizationId,
};
