/**
 * Patient data portability bundle (privacy / DHA assessor export).
 */
const pool = require('../config/db');
const { PRODUCT_NAME } = require('./productBrand');

async function buildPatientDataExport(executor, patientId) {
  const db = executor || pool;
  const [patients] = await db.execute(
    `SELECT patientId, patientNumber, firstName, middleName, lastName, gender, dateOfBirth,
            phone, email, county, subcounty, ward, idType, idNumber, nupi, nupiStatus,
            registeredBranchId, createdAt
     FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
    [patientId]
  );
  if (!patients[0]) return null;

  const [consents] = await db
    .execute(
      `SELECT consentType, granted, signatureName, grantedAt AS capturedAt FROM patient_consents WHERE patientId = ? ORDER BY grantedAt DESC`,
      [patientId]
    )
    .catch(() => [[]]);

  const [problems] = await db.execute(
    `SELECT problemId, problemText, icd10Code, snomedCode, status, onsetDate, carePlanNotes
     FROM patient_problems WHERE patientId = ? AND voided = 0 ORDER BY problemId DESC LIMIT 50`,
    [patientId]
  );

  const [allergies] = await db.execute(
    `SELECT allergen, allergyType, severity, reaction, status FROM patient_allergies WHERE patientId = ? ORDER BY allergyId DESC LIMIT 30`,
    [patientId]
  );

  const [encounters] = await db.execute(
    `SELECT recordId, visitDate, visitType, department, diagnosis, outcome
     FROM medical_records WHERE patientId = ? ORDER BY visitDate DESC LIMIT 25`,
    [patientId]
  );

  return {
    exportedAt: new Date().toISOString(),
    product: PRODUCT_NAME,
    purpose: 'Patient data portability / assessor demo (not legal record certified copy)',
    patient: patients[0],
    consents: consents || [],
    problemList: problems || [],
    allergies: allergies || [],
    recentEncounters: encounters || [],
  };
}

module.exports = { buildPatientDataExport };
