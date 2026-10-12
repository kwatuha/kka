/**
 * Local ICD-10 → SNOMED CT map (sandbox). Replace with national terminology API when available.
 */
const catalog = require('../data/icd10-snomed-map.json');

const byIcd = new Map();
for (const row of catalog.mappings || []) {
  const key = String(row.icd10 || '')
    .trim()
    .toUpperCase();
  if (key) byIcd.set(key, row);
}

function normalizeIcd10(code) {
  return String(code || '')
    .trim()
    .toUpperCase();
}

function lookupSnomedForIcd10(icd10Code) {
  const key = normalizeIcd10(icd10Code);
  if (!key) return null;
  if (byIcd.has(key)) return byIcd.get(key);
  const short = key.split('.')[0];
  if (short && byIcd.has(short)) return byIcd.get(short);
  return null;
}

function listSnomedMappings(limit = 50) {
  return (catalog.mappings || []).slice(0, Math.min(limit, 200));
}

module.exports = { lookupSnomedForIcd10, listSnomedMappings, normalizeIcd10 };
