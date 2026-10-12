/**
 * LOINC mapping helpers for common lab tests (Phase 3 DHA).
 * DB column lab_test_types.loincCode is preferred; this catalog fills gaps.
 */

const PARAMETER_LOINC = {
  // CBC components
  hemoglobin: { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' },
  haemoglobin: { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' },
  'hgb': { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' },
  wbc: { code: '6690-2', display: 'Leukocytes [#/volume] in Blood by Automated count' },
  'white blood cell': { code: '6690-2', display: 'Leukocytes [#/volume] in Blood by Automated count' },
  rbc: { code: '789-8', display: 'Erythrocytes [#/volume] in Blood by Automated count' },
  platelets: { code: '777-3', display: 'Platelets [#/volume] in Blood by Automated count' },
  plt: { code: '777-3', display: 'Platelets [#/volume] in Blood by Automated count' },
  hematocrit: { code: '4544-3', display: 'Hematocrit [Volume Fraction] of Blood by Automated count' },
  // Chemistry
  glucose: { code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
  'fasting blood sugar': { code: '1558-6', display: 'Fasting glucose [Mass/volume] in Serum or Plasma' },
  fbs: { code: '1558-6', display: 'Fasting glucose [Mass/volume] in Serum or Plasma' },
  hba1c: { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  creatinine: { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma' },
  urea: { code: '3094-0', display: 'Urea nitrogen [Mass/volume] in Serum or Plasma' },
  bun: { code: '3094-0', display: 'Urea nitrogen [Mass/volume] in Serum or Plasma' },
  alt: { code: '1742-6', display: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma' },
  ast: { code: '1920-8', display: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma' },
  bilirubin: { code: '1975-2', display: 'Bilirubin.total [Mass/volume] in Serum or Plasma' },
  cholesterol: { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
  'total cholesterol': { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
  hdl: { code: '2085-9', display: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma' },
  ldl: { code: '2089-1', display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma' },
  triglycerides: { code: '2571-8', display: 'Triglyceride [Mass/volume] in Serum or Plasma' },
  // Infectious
  malaria: { code: '75622-1', display: 'Plasmodium sp Ag [Presence] in Blood by Rapid immunoassay' },
  hiv: { code: '7918-6', display: 'HIV 1 and 2 Ab [Interpretation] in Serum or Plasma' },
};

const PANEL_LOINC = {
  'LAB-CBC': { code: '58410-2', display: 'CBC panel - Blood by Automated count' },
  'LAB-FBS': { code: '1558-6', display: 'Fasting glucose [Mass/volume] in Serum or Plasma' },
  'LAB-HBA1C': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  'LAB-LFT': { code: '24325-3', display: 'Hepatic function 2000 panel - Serum or Plasma' },
  'LAB-RFT': { code: '24362-6', display: 'Renal function 2000 panel - Serum or Plasma' },
  'LAB-LIPID': { code: '57698-3', display: 'Lipid panel with direct LDL - Serum or Plasma' },
};

function normalizeKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveParameterLoinc(parameterName) {
  const key = normalizeKey(parameterName);
  if (PARAMETER_LOINC[key]) return { ...PARAMETER_LOINC[key], source: 'catalog' };
  for (const [k, v] of Object.entries(PARAMETER_LOINC)) {
    if (key.includes(k) || k.includes(key)) return { ...v, source: 'catalog-fuzzy' };
  }
  return null;
}

function resolvePanelLoinc(testCode, testName, dbLoinc) {
  if (dbLoinc) {
    return { code: String(dbLoinc), display: testName || testCode || dbLoinc, source: 'database' };
  }
  const code = String(testCode || '').toUpperCase();
  if (PANEL_LOINC[code]) return { ...PANEL_LOINC[code], source: 'catalog' };
  const name = normalizeKey(testName);
  if (name.includes('complete blood') || name.includes('cbc')) return { ...PANEL_LOINC['LAB-CBC'], source: 'catalog-name' };
  if (name.includes('fasting') && name.includes('sugar')) return { ...PANEL_LOINC['LAB-FBS'], source: 'catalog-name' };
  if (name.includes('hba1c') || name.includes('glycated')) return { ...PANEL_LOINC['LAB-HBA1C'], source: 'catalog-name' };
  if (name.includes('liver')) return { ...PANEL_LOINC['LAB-LFT'], source: 'catalog-name' };
  if (name.includes('renal') || name.includes('kidney')) return { ...PANEL_LOINC['LAB-RFT'], source: 'catalog-name' };
  if (name.includes('lipid')) return { ...PANEL_LOINC['LAB-LIPID'], source: 'catalog-name' };
  return null;
}

function codingFromLoinc(loinc, textFallback) {
  if (!loinc) {
    return {
      coding: [
        {
          system: 'http://kakamega.hmis/CodeSystem/lab-test',
          code: textFallback || 'unknown',
          display: textFallback || 'Unknown test',
        },
      ],
      text: textFallback || 'Unknown test',
    };
  }
  return {
    coding: [
      {
        system: 'http://loinc.org',
        code: loinc.code,
        display: loinc.display || textFallback || loinc.code,
      },
    ],
    text: loinc.display || textFallback || loinc.code,
  };
}

module.exports = {
  PARAMETER_LOINC,
  PANEL_LOINC,
  resolveParameterLoinc,
  resolvePanelLoinc,
  codingFromLoinc,
};
