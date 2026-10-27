/**
 * DHA / AfyaConnect identification_type values for registry and eligibility APIs.
 * @see docs/DHA_CLIENT_REGISTRY_WORKFLOWS.md
 */

function trimOrNull(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

const HMIS_TO_DHA = {
  'national id': 'National ID',
  passport: 'Passport',
  'birth certificate': 'Birth Certificate',
  "driver's license": 'National ID',
  other: 'National ID',
};

/**
 * @param {string|null|undefined} hmisIdType — patients.idType
 * @param {{ fallback?: string }} [opts]
 */
function mapHmisIdTypeToDha(hmisIdType, opts = {}) {
  const fallback = opts.fallback || 'National ID';
  const raw = trimOrNull(hmisIdType);
  if (!raw) return fallback;
  const mapped = HMIS_TO_DHA[raw.toLowerCase()];
  if (mapped) return mapped;
  if (/^client\s*registry/i.test(raw) || /^clientregistry/i.test(raw.replace(/\s/g, ''))) {
    return 'ClientRegistry ID';
  }
  return raw;
}

/** NUPI / CR IDs from national registry (e.g. CR0490482291444-0). */
function looksLikeClientRegistryId(value) {
  const s = trimOrNull(value);
  if (!s) return false;
  return /^CR[\dA-Za-z-]+$/i.test(s);
}

/**
 * Resolve query params for GET /patients, fetch-client, eligibility, etc.
 * Never returns empty identification_type when identification_number is set.
 *
 * @param {{ nupi?: string, crId?: string, idNumber?: string, nationalId?: string, idType?: string, identificationType?: string }} input
 * @param {{ preferClientRegistryIdWhenPresent?: boolean }} [opts]
 */
function resolveDhaPatientIdentification(input = {}, opts = {}) {
  const nupi = trimOrNull(input.nupi || input.crId);
  const nationalId = trimOrNull(input.idNumber || input.nationalId || input.identificationNumber);
  const explicitType = trimOrNull(input.identificationType || input.idType);

  if (
    opts.preferClientRegistryIdWhenPresent &&
    nupi &&
    looksLikeClientRegistryId(nupi)
  ) {
    return {
      identification_number: nupi,
      identification_type: 'ClientRegistry ID',
      crId: nupi,
    };
  }

  if (nationalId) {
    let identification_type = mapHmisIdTypeToDha(explicitType, { fallback: 'National ID' });
    if (
      looksLikeClientRegistryId(nationalId) &&
      (!explicitType || /^national id$/i.test(explicitType) || /^other$/i.test(explicitType))
    ) {
      identification_type = 'ClientRegistry ID';
    }
    return {
      identification_number: nationalId,
      identification_type,
      crId: nupi || (looksLikeClientRegistryId(nationalId) ? nationalId : null),
    };
  }

  if (nupi) {
    return {
      identification_number: nupi,
      identification_type: 'ClientRegistry ID',
      crId: nupi,
    };
  }

  return {
    identification_number: null,
    identification_type: null,
    crId: null,
  };
}

module.exports = {
  trimOrNull,
  mapHmisIdTypeToDha,
  looksLikeClientRegistryId,
  resolveDhaPatientIdentification,
};
