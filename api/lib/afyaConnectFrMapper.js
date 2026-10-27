/**
 * Map DHA middleware Facility Search payloads → HMIS lookupFacility shape.
 * @see https://hie-docs.dha.go.ke/docs/registries/process/facilitySearch
 */

function pickStr(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/**
 * @param {unknown} data — array element or single object from /facilities/search
 * @param {{ identifier?: string, identifierType?: string }} [ctx]
 */
function mapFrResponseToLookupResult(data, ctx = {}) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    return { found: false, mode: 'live', provider: 'afyaconnect' };
  }

  const addr = row.address || {};
  const regOp = row.regulatoryOperationalStatus || row.SHAOperationStatus || {};

  return {
    found: true,
    mode: 'live',
    provider: 'afyaconnect',
    facility: {
      mflCode:
        pickStr(row, 'registrationNumber', 'fidCode', 'frCode') ||
        ctx.identifier ||
        null,
      frCode: pickStr(row, 'frCode') || null,
      officialName: pickStr(row, 'officialName', 'name') || null,
      kephLevel: pickStr(row, 'kephLevel', 'facilityLevel', 'level') || null,
      county: pickStr(addr, 'county') || pickStr(row, 'county') || null,
      subCounty: pickStr(addr, 'subCounty', 'sub_county') || pickStr(row, 'subCounty') || null,
      owner: pickStr(row, 'facilityOwnership', 'owner') || null,
      status:
        pickStr(regOp, 'operationalStatus') ||
        pickStr(row, 'facilityLicenseStatus') ||
        pickStr(row, 'operationalStatus') ||
        null,
      facilityType: pickStr(row, 'facilityType') || null,
      licenseNumber: pickStr(row, 'licenseNumber') || null,
      phone: pickStr(row, 'facilityPhoneNumber') || null,
      email: pickStr(row, 'facilityEmail') || null,
    },
    raw: row,
  };
}

module.exports = { mapFrResponseToLookupResult };
