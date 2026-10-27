/**
 * Map DHA Client Registry API payloads to HMIS resolveClient shape.
 * Supports AfyaConnect v3 fetch-client and middleware /patients responses.
 */

function pickStr(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function normalizeGender(value) {
  const g = String(value || '').toLowerCase();
  if (g === 'm' || g === 'male') return 'Male';
  if (g === 'f' || g === 'female') return 'Female';
  return value || null;
}

function parseOtherIdentifications(row) {
  const list = row?.other_identifications || row?.otherIdentifications;
  if (!Array.isArray(list)) {
    return { shaNumber: null, householdNumber: null, otherIdentifications: [] };
  }
  const otherIdentifications = list
    .map((item) => ({
      identificationType: pickStr(item, 'identification_type', 'identificationType'),
      identificationNumber: pickStr(item, 'identification_number', 'identificationNumber'),
    }))
    .filter((item) => item.identificationType && item.identificationNumber);
  const shaNumber =
    otherIdentifications.find((i) => /sha number/i.test(String(i.identificationType)))?.identificationNumber ||
    null;
  const householdNumber =
    otherIdentifications.find((i) => /household number/i.test(String(i.identificationType)))
      ?.identificationNumber || null;
  return { shaNumber, householdNumber, otherIdentifications };
}

/** Household id HH6724396934727-8 → parent CR6724396934727-8 (UAT dependant linkage). */
function householdNumberToParentCrId(householdNumber) {
  const hh = pickStr({ v: householdNumber }, 'v');
  if (!hh) return null;
  if (/^HH[\dA-Za-z-]+$/i.test(hh)) return `CR${hh.slice(2)}`;
  return null;
}

function unwrapCrRecords(data) {
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data.result)) return data.result;
  if (data.message && Array.isArray(data.message.result)) return data.message.result;
  if (data.message && data.message.result && typeof data.message.result === 'object') {
    return [data.message.result];
  }
  if (Array.isArray(data.data)) return data.data;
  if (data.resourceType === 'Patient' || data.id || data.identification_number) {
    return [data];
  }
  return [];
}

/**
 * @param {unknown} data
 * @param {{ idNumber?: string, identificationType?: string }} query
 */
function mapCrResponseToResolveResult(data, query = {}) {
  const records = unwrapCrRecords(data);
  if (!records.length) {
    return { found: false, mode: 'live', provider: 'afyaconnect' };
  }

  const row = records[0];
  const nupi =
    pickStr(row, 'id', 'clientRegistryId', 'crId', 'nupi', 'clientNumber') ||
    (row.meta && pickStr(row.meta, 'versionId'));

  const { shaNumber, householdNumber, otherIdentifications } = parseOtherIdentifications(row);
  const linkedParentCrId = householdNumberToParentCrId(householdNumber);
  const idTypeFromCr = pickStr(row, 'identification_type', 'identificationType');
  const isDependantMember =
    /birth certificate/i.test(String(idTypeFromCr || query.identificationType || '')) ||
    Boolean(householdNumber);

  const firstName =
    pickStr(row, 'first_name', 'firstName', 'givenName') ||
    (Array.isArray(row.name) && row.name[0] && pickStr(row.name[0], 'given', 'text'));

  const lastName =
    pickStr(row, 'last_name', 'lastName', 'familyName') ||
    (Array.isArray(row.name) && row.name[0] && pickStr(row.name[0], 'family'));

  return {
    found: true,
    mode: 'live',
    provider: 'afyaconnect',
    nupi: nupi || null,
    crReference: pickStr(row, 'id', 'clientRegistryId') || nupi,
    patient: {
      firstName,
      lastName,
      middleName: pickStr(row, 'middle_name', 'middleName'),
      dateOfBirth: pickStr(row, 'date_of_birth', 'dateOfBirth', 'birthDate'),
      gender: normalizeGender(pickStr(row, 'gender', 'sex')),
      phone: pickStr(row, 'phone', 'phone_number', 'mobile'),
      idNumber:
        pickStr(row, 'identification_number', 'identificationNumber', 'nationalId') ||
        query.idNumber ||
        null,
      identificationType:
        pickStr(row, 'identification_type', 'identificationType') ||
        query.identificationType ||
        null,
      county: pickStr(row, 'county'),
      subCounty: pickStr(row, 'sub_county', 'subCounty'),
      shaNumber,
      householdNumber,
      linkedParentCrId,
      isDependantMember,
      learningInstitutionCode: pickStr(row, 'learning_institution_code', 'learningInstitutionCode'),
      learningInstitutionName: pickStr(row, 'learning_institution_name', 'learningInstitutionName'),
    },
    dependant: isDependantMember
      ? {
          householdNumber,
          linkedParentCrId,
          shaNumber,
          note:
            'National SHA eligibility uses this member’s Client Registry ID (NUPI), not birth certificate alone.',
        }
      : null,
    otherIdentifications,
    raw: row,
  };
}

module.exports = {
  mapCrResponseToResolveResult,
  unwrapCrRecords,
  parseOtherIdentifications,
  householdNumberToParentCrId,
};
