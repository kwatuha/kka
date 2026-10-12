/**
 * Phase 8 (DHA) — CDS rules: allergy, duplicate therapy, IDSR text hints.
 */
const { matchDiseases, loadCatalog } = require('./idsrPublisher');
const { loadCatalog: loadHptCatalog, resolveHptByName } = require('./hptSandbox');

const THERAPEUTIC_CLASSES = [
  { key: 'paracetamol', terms: ['paracetamol', 'acetaminophen', 'panadol', 'calpol'] },
  { key: 'ibuprofen', terms: ['ibuprofen', 'brufen', 'nurofen', 'diclofenac'] },
  { key: 'amoxicillin', terms: ['amoxicillin', 'amoxil', 'amox'] },
  { key: 'metformin', terms: ['metformin', 'glucophage'] },
  { key: 'artemether', terms: ['artemether', 'lumefantrine', 'coartem', 'al'] },
];

function normalizeMedName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9+\/\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function therapeuticClassKey(name) {
  const n = normalizeMedName(name);
  for (const cls of THERAPEUTIC_CLASSES) {
    if (cls.terms.some((t) => n.includes(t))) return cls.key;
  }
  return null;
}

function evaluateDuplicateTherapy(medicationNames = []) {
  const alerts = [];
  const names = medicationNames.map((n) => String(n).trim()).filter(Boolean);
  const seenNormalized = new Set();
  const byClass = {};

  for (const med of names) {
    const norm = normalizeMedName(med);
    if (seenNormalized.has(norm)) {
      alerts.push({
        severity: 'medium',
        type: 'duplicate_therapy',
        message: `Duplicate line item: ${med}`,
        medication: med,
      });
    }
    seenNormalized.add(norm);

    const cls = therapeuticClassKey(med);
    if (cls) {
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(med);
    }
  }

  for (const [cls, meds] of Object.entries(byClass)) {
    const unique = [...new Set(meds.map(normalizeMedName))];
    if (unique.length > 1) {
      alerts.push({
        severity: 'high',
        type: 'duplicate_class',
        message: `Possible duplicate therapy (${cls}): ${meds.join(', ')}`,
        therapeuticClass: cls,
        medications: meds,
      });
    }
  }

  return alerts;
}

async function evaluateAllergyConflicts(pool, { patientId, medicationNames = [] }) {
  const names = medicationNames.map((n) => String(n).trim()).filter(Boolean);
  if (!patientId || Number(patientId) <= 0 || !names.length) return [];

  const [allergies] = await pool.execute(
    `SELECT allergen, allergyType, severity, reaction
     FROM patient_allergies
     WHERE patientId = ? AND status = 'active'`,
    [patientId]
  );

  const alerts = [];
  for (const med of names) {
    const medLower = med.toLowerCase();
    for (const a of allergies) {
      const allergen = String(a.allergen || '').toLowerCase();
      if (!allergen) continue;
      if (
        medLower.includes(allergen) ||
        allergen.includes(medLower) ||
        (a.allergyType === 'drug' && medLower.split(/\s+/).some((w) => allergen.includes(w)))
      ) {
        alerts.push({
          severity: a.severity || 'high',
          type: 'allergy_conflict',
          message: `Possible allergy conflict: ${med} vs documented allergen "${a.allergen}"`,
          allergen: a.allergen,
          medication: med,
        });
      }
    }
  }
  return alerts;
}

function hptRowForMedication(med) {
  const code = med?.hptCode != null ? String(med.hptCode).trim() : '';
  if (code) {
    const row = loadHptCatalog().find((r) => r.hptCode === code);
    if (row) return row;
  }
  return resolveHptByName(med?.name || med?.medicationName || '');
}

/**
 * Cross-check documented drug allergies against HPT product names (sandbox catalogue).
 */
async function evaluateHptAllergyHints(pool, { patientId, medications = [] }) {
  if (!patientId || !medications.length) return [];
  const [allergies] = await pool.execute(
    `SELECT allergen, allergyType, severity FROM patient_allergies
     WHERE patientId = ? AND status = 'active' AND (allergyType = 'drug' OR allergyType IS NULL OR allergyType = '')`,
    [patientId]
  );
  if (!allergies.length) return [];

  const alerts = [];
  for (const med of medications) {
    const displayName = String(med.name || med.medicationName || '').trim();
    if (!displayName) continue;
    const hpt = hptRowForMedication(med);
    const hptName = (hpt?.name || displayName).toLowerCase();
    for (const a of allergies) {
      const allergen = String(a.allergen || '').toLowerCase();
      if (!allergen) continue;
      if (
        hptName.includes(allergen) ||
        allergen.includes(hptName.slice(0, 8)) ||
        displayName.toLowerCase().includes(allergen)
      ) {
        alerts.push({
          severity: a.severity || 'high',
          type: 'hpt_allergy_conflict',
          message: `HPT/allergy check: ${displayName}${hpt?.hptCode ? ` (${hpt.hptCode})` : ''} vs allergen "${a.allergen}"`,
          allergen: a.allergen,
          medication: displayName,
          hptCode: hpt?.hptCode || null,
        });
      }
    }
  }
  return alerts;
}

async function evaluateIdsrClinicalHints(pool, clinicalText) {
  const text = String(clinicalText || '').trim();
  if (!text) return [];
  const catalog = await loadCatalog(pool);
  const matches = matchDiseases(text, catalog);
  return matches.map((d) => ({
    severity: d.urgency === 'immediate' ? 'critical' : 'warning',
    type: 'idsr_notifiable',
    message: `Notifiable disease keyword: ${d.diseaseName} (${d.diseaseCode}) — consider IDSR reporting`,
    diseaseCode: d.diseaseCode,
    diseaseName: d.diseaseName,
  }));
}

async function evaluateClinicalContext(
  pool,
  { patientId, medicationNames = [], medications = [], clinicalText = null }
) {
  const names =
    medicationNames.length > 0
      ? medicationNames
      : medications.map((m) => m.name || m.medicationName).filter(Boolean);
  const alerts = [];
  alerts.push(...(await evaluateAllergyConflicts(pool, { patientId, medicationNames: names })));
  alerts.push(...(await evaluateHptAllergyHints(pool, { patientId, medications })));
  alerts.push(...evaluateDuplicateTherapy(names));
  if (clinicalText) {
    alerts.push(...(await evaluateIdsrClinicalHints(pool, clinicalText)));
  }

  return {
    alerts,
    status: alerts.length ? 'warning' : 'ok',
    evidenceBased: true,
    ruleSet: 'cds-v3-allergy-hpt-dup-idsr',
  };
}

/** @deprecated name kept for callers */
async function evaluatePrescriptionSafety(pool, opts) {
  return evaluateClinicalContext(pool, opts);
}

module.exports = {
  evaluatePrescriptionSafety,
  evaluateClinicalContext,
  evaluateDuplicateTherapy,
  evaluateAllergyConflicts,
  evaluateIdsrClinicalHints,
  evaluateHptAllergyHints,
};
