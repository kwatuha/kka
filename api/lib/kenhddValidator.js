/**
 * KENHDD alignment report (demographics + problem list) — assessor artefact.
 * See docs/DHA_KENHDD_FIELD_MAPPING.md
 */
const pool = require('../config/db');

const PATIENT_RULES = [
  { field: 'firstName', label: 'Given name', required: true },
  { field: 'lastName', label: 'Family name', required: true },
  { field: 'gender', label: 'Sex', required: true },
  { field: 'dateOfBirth', label: 'Date of birth', required: true },
  { field: 'phoneNumber', label: 'Contact phone', required: true, alt: ['phone', 'mobile'] },
  {
    field: 'residence',
    label: 'Residence (county or sub-county)',
    required: true,
    check: (row) => Boolean(row.county || row.subCounty || row.ward),
  },
  {
    field: 'identifier',
    label: 'National ID / NUPI',
    required: true,
    check: (row) => Boolean(String(row.nupi || '').trim() || (row.idNumber && row.idType)),
  },
];

const PROBLEM_RULES = [
  { field: 'problemText', label: 'Problem description', required: true },
  { field: 'status', label: 'Problem status', required: true },
  { field: 'icd10Code', label: 'ICD-10 code', required: false, recommended: true },
];

function rowValue(row, field, alt = []) {
  if (row[field] != null && String(row[field]).trim()) return row[field];
  for (const a of alt) {
    if (row[a] != null && String(row[a]).trim()) return row[a];
  }
  return null;
}

function evaluatePatientRow(row) {
  const gaps = [];
  const met = [];
  for (const rule of PATIENT_RULES) {
    let ok = false;
    if (rule.check) ok = rule.check(row);
    else ok = Boolean(rowValue(row, rule.field, rule.alt || []));
    if (ok) met.push(rule.label);
    else if (rule.required) gaps.push({ domain: 'demographics', field: rule.field, label: rule.label, severity: 'required' });
  }
  return { gaps, met, score: met.length / PATIENT_RULES.length };
}

function evaluateProblemRow(row) {
  const gaps = [];
  const met = [];
  for (const rule of PROBLEM_RULES) {
    const ok = Boolean(rowValue(row, rule.field));
    if (ok) met.push(rule.label);
    else if (rule.required) gaps.push({ domain: 'problem_list', field: rule.field, label: rule.label, severity: 'required' });
    else if (rule.recommended) gaps.push({ domain: 'problem_list', field: rule.field, label: rule.label, severity: 'recommended' });
  }
  return { gaps, met };
}

async function validatePatient(executor, patientId) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT patientId, patientNumber, firstName, lastName, gender, dateOfBirth,
            phone, county, subcounty AS subCounty, ward, idType, idNumber, nupi
     FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
    [patientId]
  );
  if (!rows[0]) return null;

  const patientEval = evaluatePatientRow(rows[0]);
  const [problems] = await db.execute(
    `SELECT problemId, problemText, icd10Code, snomedCode, status
     FROM patient_problems WHERE patientId = ? AND voided = 0 AND status = 'active'`,
    [patientId]
  );

  const problemResults = (problems || []).map((p) => ({
    problemId: p.problemId,
    ...evaluateProblemRow(p),
  }));

  const problemGaps = problemResults.flatMap((p) => p.gaps);
  const denom = PATIENT_RULES.length + Math.max(1, problems.length) * PROBLEM_RULES.length;
  const numer =
    patientEval.met.length +
    problemResults.reduce((s, p) => s + p.met.length, 0);
  const overallScore = Math.round((numer / denom) * 100);

  return {
    framework: 'KENHDD (mapping v1)',
    patientId: rows[0].patientId,
    patientNumber: rows[0].patientNumber,
    validatedAt: new Date().toISOString(),
    overallScore,
    attestationHint: overallScore >= 85 ? 'partial_met' : 'partial',
    demographics: {
      score: Math.round(patientEval.score * 100),
      gaps: patientEval.gaps,
      met: patientEval.met,
    },
    activeProblems: problems.length,
    problemList: {
      gaps: problemGaps,
      items: problemResults.map(({ problemId, gaps, met }) => ({ problemId, gaps, met })),
    },
    exchangeArtefacts: [
      `/api/integrations/fhir/composition/${patientId}`,
      `/api/integrations/kenhdd/validate/patient/${patientId}`,
    ],
  };
}

async function validateSample(executor, limit = 50) {
  const db = executor || pool;
  const lim = Math.min(Math.max(Number(limit) || 50, 5), 200);
  const [rows] = await db.execute(
    `SELECT patientId FROM patients WHERE voided = 0 ORDER BY patientId DESC LIMIT ${lim}`
  );
  const reports = [];
  for (const r of rows) {
    const report = await validatePatient(db, r.patientId);
    if (report) reports.push(report);
  }
  const avg =
    reports.length > 0
      ? Math.round(reports.reduce((s, x) => s + x.overallScore, 0) / reports.length)
      : 0;
  return {
    framework: 'KENHDD (mapping v1)',
    sampleSize: reports.length,
    averageScore: avg,
    validatedAt: new Date().toISOString(),
    patients: reports,
  };
}

module.exports = { validatePatient, validateSample, evaluatePatientRow };
