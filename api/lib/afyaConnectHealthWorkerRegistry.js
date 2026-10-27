/**
 * Health Worker Registry (GET /professionals) — resolve PUID → claim doctor fields.
 * @see https://hie-docs.dha.go.ke/registries/health-worker-registry
 */
const { trimEnv, eclaimsRequest } = require('./afyaConnectEclaimsHttp');

function normalizeRegulationBody(raw) {
  const s = String(raw || '')
    .trim()
    .toUpperCase();
  if (!s) return 'KMPDC';
  if (s === 'KMPDC' || s === 'KMPDB' || s.includes('MEDICAL PRACTITIONER')) return 'KMPDC';
  if (s === 'COC' || s.includes('CLINICAL OFFICER')) return 'COC';
  if (s === 'NCK' || s.includes('NURSING')) return 'NCK';
  if (s === 'PPB' || s.includes('PHARMACY')) return 'PPB';
  return String(raw).trim();
}

function practitionerFromLicenseRow(row) {
  if (!row || typeof row !== 'object') return null;
  const identificationNumber =
    row.registration_number ||
    row.license_number ||
    row.identification_number ||
    row.practitioner_registration_number ||
    null;
  if (!identificationNumber) return null;
  const identificationType =
    row.identification_type || row.id_type || 'registration_number';
  const regulationBody = normalizeRegulationBody(
    row.regulator || row.regulation_body || row.regulatory_body
  );
  return {
    identificationType: String(identificationType),
    identificationNumber: String(identificationNumber).trim(),
    regulationBody,
  };
}

function parseProfessionalRecord(data) {
  if (!data) return null;
  const candidates = [];
  if (Array.isArray(data)) candidates.push(...data);
  else {
    candidates.push(
      data.data,
      data.professional,
      data.practitioner,
      data.record,
      data
    );
    if (Array.isArray(data.data)) candidates.push(...data.data);
    if (Array.isArray(data.professionals)) candidates.push(...data.professionals);
  }

  for (const root of candidates) {
    if (!root || typeof root !== 'object') continue;
    const licenseLists = [
      root.licenses,
      root.registrations,
      root.professional_licenses,
      root.license_records,
    ].filter(Array.isArray);
    for (const list of licenseLists) {
      for (const row of list) {
        const p = practitionerFromLicenseRow(row);
        if (p?.identificationNumber) return p;
      }
    }
    const direct = practitionerFromLicenseRow(root);
    if (direct?.identificationNumber) return direct;
    const membership = root.membership;
    if (membership?.external_reference_id) {
      return {
        identificationType: 'registration_number',
        identificationNumber: String(membership.external_reference_id).trim(),
        regulationBody: normalizeRegulationBody(
          membership.licensing_body || root.regulator || root.regulation_body
        ),
      };
    }
    const reg =
      root.registration_number ||
      root.practitioner_registration_number ||
      root.license_number;
    if (reg) {
      return {
        identificationType: 'registration_number',
        identificationNumber: String(reg).trim(),
        regulationBody: normalizeRegulationBody(root.regulator || root.regulation_body),
      };
    }
  }
  return null;
}

function unwrapHwrMessage(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.message && typeof data.message === 'object' && !Array.isArray(data.message)) {
    return data.message;
  }
  return data;
}

function parseProfessionalSummary(data) {
  const root = unwrapHwrMessage(data);
  if (!root) return null;
  const m = root.membership && typeof root.membership === 'object' ? root.membership : {};
  const ids = root.identifiers && typeof root.identifiers === 'object' ? root.identifiers : {};
  const claimDoctor = parseProfessionalRecord(data);
  return {
    fullName: m.full_name || m.fullName || null,
    hwrPuid: m.id != null ? String(m.id) : null,
    kmpdcRegistration:
      m.external_reference_id != null
        ? String(m.external_reference_id)
        : claimDoctor?.identificationNumber || null,
    licensingBody: m.licensing_body || m.licensingBody || null,
    specialty: m.specialty || root.professional_details?.specialty || null,
    isActive: m.is_active ?? m.isActive ?? null,
    identifierType: ids.identification_type || ids.identificationType || null,
    identifierNumber: ids.identification_number || ids.identificationNumber || null,
    claimDoctor,
  };
}

function professionalsPath() {
  return trimEnv('AFYACONNECT_HWR_PROFESSIONALS_PATH') || '/professionals';
}

async function lookupProfessional({ query, label }) {
  const live = await eclaimsRequest('GET', professionalsPath(), { query });
  if (live.error) {
    return { ok: false, label, query, error: live.error, httpStatus: live.httpStatus, body: live.body };
  }
  const summary = parseProfessionalSummary(live.data);
  const practitioner = parseProfessionalRecord(live.data);
  const found = Boolean(summary?.fullName || summary?.hwrPuid || practitioner);
  return {
    ok: found,
    label,
    query,
    practitioner,
    summary,
    httpStatus: live.httpStatus,
    raw: live.data,
    error: found ? null : 'No practitioner record in HWR response',
  };
}

async function lookupProfessionalByRegistration(registrationNumber, regulator = 'KMPDC') {
  const num = String(registrationNumber || '').trim();
  if (!num) return { ok: false, error: 'registrationNumber required' };
  return lookupProfessional({
    label: 'by_registration',
    query: {
      identification_number: num,
      identification_type: 'registration_number',
      regulator: normalizeRegulationBody(regulator),
    },
  });
}

const HWR_ID_TYPES = new Set([
  'registration_number',
  'National ID',
  'Alien ID',
  'Refugee ID',
]);

/**
 * Admin / chart search — DHA GET /professionals (not PUID-as-registration).
 */
async function searchHealthWorker({ identificationNumber, identificationType, regulator }) {
  const num = String(identificationNumber || '').trim();
  if (!num) return { ok: false, error: 'identificationNumber required' };

  if (/^PUID-/i.test(num)) {
    return {
      ok: false,
      error:
        'License / PUID cannot be used as registration_number on HWR GET /professionals. Search by KMPDC registration (e.g. A7000) or National ID.',
      hint:
        'Use returned hwrPuid on the user record for SHR; use kmpdcRegistration for AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER.',
    };
  }

  let idType = String(identificationType || 'registration_number').trim();
  if (!HWR_ID_TYPES.has(idType)) {
    idType = 'registration_number';
  }

  return lookupProfessional({
    label: 'search',
    query: {
      identification_number: num,
      identification_type: idType,
      regulator: normalizeRegulationBody(regulator || 'KMPDC'),
    },
  });
}

async function lookupProfessionalByPuid(puid) {
  const id = String(puid || '').trim();
  if (!id) return { ok: false, error: 'puid required' };

  const attempts = [
    { label: 'by_id', query: { id } },
    { label: 'by_professional_id', query: { professional_id: id } },
    { label: 'by_puid_param', query: { puid: id } },
  ];

  const tried = [];
  for (const att of attempts) {
    const result = await lookupProfessional(att);
    tried.push({
      label: att.label,
      ok: result.ok,
      httpStatus: result.httpStatus,
      error: result.error,
    });
    if (result.ok && result.practitioner) {
      return { ...result, puid: id, attempts: tried };
    }
  }

  return {
    ok: false,
    puid: id,
    error: 'Could not resolve PUID to a registration number via HWR',
    attempts: tried,
  };
}

module.exports = {
  lookupProfessionalByPuid,
  lookupProfessionalByRegistration,
  searchHealthWorker,
  parseProfessionalRecord,
  parseProfessionalSummary,
  normalizeRegulationBody,
};
