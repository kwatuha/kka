/**
 * Resolve ICD-11 for national claim from HMIS encounter (medical_records + patient_problems).
 */
const { trimEnv } = require('./afyaConnectEclaimsHttp');

const ICD10_PATTERN = /\b([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\b/gi;

/** Curated fallbacks when diagnoses.icd11Code is not seeded (extend in DB). */
const STATIC_ICD10_TO_ICD11 = {
  J069: 'ca07.0',
  J06: 'ca07.0',
  J00: 'ca07.0',
  R509: 'MD11.0',
  I10: 'BA00',
  E119: '5A11',
};

function normalizeIcd10(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function looksLikeIcd11(code) {
  return /^[0-9a-zA-Z]+(\.[0-9a-zA-Z]+)?$/.test(String(code || '').trim()) && String(code).includes('.');
}

async function lookupIcd11ForIcd10(pool, icd10) {
  const key = normalizeIcd10(icd10);
  if (!key) return null;
  const staticHit =
    STATIC_ICD10_TO_ICD11[key] ||
    STATIC_ICD10_TO_ICD11[key.replace(/\./g, '')];
  if (staticHit) return { icd11Code: staticHit, source: 'static_map', icd10Code: key };

  try {
    const [rows] = await pool.execute(
      `SELECT icd11Code, diagnosisName FROM diagnoses
       WHERE icd10Code = ? AND icd11Code IS NOT NULL AND TRIM(icd11Code) != '' AND isActive = 1
       LIMIT 1`,
      [key]
    );
    if (rows[0]?.icd11Code) {
      return {
        icd11Code: String(rows[0].icd11Code).trim(),
        source: 'diagnoses_catalog',
        icd10Code: key,
        diagnosisName: rows[0].diagnosisName,
      };
    }
  } catch (err) {
    if (!/Unknown column 'icd11Code'/.test(String(err.message))) throw err;
  }
  return null;
}

function extractIcd10FromText(text) {
  const found = [];
  const s = String(text || '');
  let m;
  ICD10_PATTERN.lastIndex = 0;
  while ((m = ICD10_PATTERN.exec(s)) !== null) {
    const c = normalizeIcd10(m[1]);
    if (c && !found.includes(c)) found.push(c);
  }
  return found;
}

async function loadMedicalRecord(pool, medicalRecordId, patientId) {
  const [rows] = await pool.execute(
    `SELECT recordId, patientId, visitDate, diagnosis, chiefComplaint, department
     FROM medical_records WHERE recordId = ? LIMIT 1`,
    [Number(medicalRecordId)]
  );
  const row = rows[0];
  if (!row) return null;
  if (patientId != null && Number(row.patientId) !== Number(patientId)) return null;
  return row;
}

async function loadProblemsForRecord(pool, medicalRecordId, patientId) {
  try {
    const [rows] = await pool.execute(
      `SELECT problemId, icd10Code, problemText, status
       FROM patient_problems
       WHERE voided = 0 AND patientId = ?
         AND (medicalRecordId = ? OR medicalRecordId IS NULL)
       ORDER BY
         CASE WHEN medicalRecordId = ? THEN 0 ELSE 1 END,
         CASE WHEN status = 'active' THEN 0 ELSE 1 END,
         problemId DESC
       LIMIT 10`,
      [Number(patientId), Number(medicalRecordId), Number(medicalRecordId)]
    );
    return rows;
  } catch {
    return [];
  }
}

async function resolveLatestEncounterRecordId(pool, patientId) {
  const [rows] = await pool.execute(
    `SELECT recordId FROM medical_records
     WHERE patientId = ?
     ORDER BY visitDate DESC, recordId DESC LIMIT 1`,
    [Number(patientId)]
  );
  return rows[0]?.recordId ? Number(rows[0].recordId) : null;
}

/**
 * @returns {Promise<{
 *   icd11Code: string|null,
 *   icd10Code: string|null,
 *   source: string|null,
 *   medicalRecordId: number|null,
 *   diagnosisText: string|null,
 *   warnings: string[],
 * }>}
 */
async function resolveClaimIcd11FromMedicalRecord(pool, { medicalRecordId, patientId }) {
  const warnings = [];
  let recordId = medicalRecordId != null ? Number(medicalRecordId) : null;
  if (!recordId && patientId) {
    recordId = await resolveLatestEncounterRecordId(pool, patientId);
    if (recordId) warnings.push('Using latest HMIS encounter for this patient.');
  }
  if (!recordId) {
    return {
      icd11Code: null,
      icd10Code: null,
      source: null,
      medicalRecordId: null,
      diagnosisText: null,
      warnings: ['No linked HMIS encounter — set medicalRecordId or document an encounter first.'],
    };
  }

  const record = await loadMedicalRecord(pool, recordId, patientId);
  if (!record) {
    return {
      icd11Code: null,
      icd10Code: null,
      source: null,
      medicalRecordId: recordId,
      diagnosisText: null,
      warnings: ['Encounter not found for patient.'],
    };
  }

  const problems = await loadProblemsForRecord(pool, recordId, record.patientId);
  for (const p of problems) {
    if (p.icd10Code) {
      const mapped = await lookupIcd11ForIcd10(pool, p.icd10Code);
      if (mapped?.icd11Code) {
        return {
          icd11Code: mapped.icd11Code,
          icd10Code: mapped.icd10Code,
          source: mapped.source,
          medicalRecordId: recordId,
          diagnosisText: p.problemText || record.diagnosis,
          diagnosisName: mapped.diagnosisName || null,
          warnings,
        };
      }
    }
  }

  const fromText = extractIcd10FromText(record.diagnosis);
  for (const icd10 of fromText) {
    const mapped = await lookupIcd11ForIcd10(pool, icd10);
    if (mapped?.icd11Code) {
      return {
        icd11Code: mapped.icd11Code,
        icd10Code: mapped.icd10Code,
        source: mapped.source,
        medicalRecordId: recordId,
        diagnosisText: record.diagnosis,
        diagnosisName: mapped.diagnosisName || null,
        warnings,
      };
    }
  }

  const envDefault = trimEnv('AFYACONNECT_CLAIM_DEFAULT_ICD11');
  if (envDefault) {
    warnings.push('No ICD-10→ICD-11 map for this encounter — using AFYACONNECT_CLAIM_DEFAULT_ICD11.');
    return {
      icd11Code: envDefault,
      icd10Code: fromText[0] || null,
      source: 'env_default',
      medicalRecordId: recordId,
      diagnosisText: record.diagnosis,
      warnings,
    };
  }

  warnings.push(
    'Add ICD-11 on the diagnoses catalog (icd11Code) or set AFYACONNECT_CLAIM_DEFAULT_ICD11.'
  );
  return {
    icd11Code: null,
    icd10Code: fromText[0] || null,
    source: null,
    medicalRecordId: recordId,
    diagnosisText: record.diagnosis,
    warnings,
  };
}

async function describeEncounterForClaims(pool, { medicalRecordId, patientId }) {
  const resolved = await resolveClaimIcd11FromMedicalRecord(pool, { medicalRecordId, patientId });
  let record = null;
  if (resolved.medicalRecordId) {
    record = await loadMedicalRecord(pool, resolved.medicalRecordId, patientId);
  }
  return {
    ...resolved,
    visitDate: record?.visitDate || null,
    chiefComplaint: record?.chiefComplaint || null,
  };
}

module.exports = {
  resolveClaimIcd11FromMedicalRecord,
  describeEncounterForClaims,
  lookupIcd11ForIcd10,
  extractIcd10FromText,
};
