/**
 * Record live HIE / AfyaConnect smoke tests for DHA evidence (pre/post credential flip).
 */
const pool = require('../config/db');
const { getHieLiveReadiness } = require('./hieLiveReadiness');

async function listHieSmokeLogs(limit = 25) {
  const lim = Math.min(Math.max(1, Number(limit) || 25), 100);
  const [rows] = await pool.execute(
    `SELECT l.logId, l.recordedAt, l.recordedBy, l.passed, l.fhirMode, l.clientRegistryMode,
            l.notes, l.evidenceSummary, u.username AS recordedByUsername
     FROM hie_live_smoke_log l
     LEFT JOIN users u ON u.userId = l.recordedBy
     ORDER BY l.logId DESC
     LIMIT ${lim}`
  );
  return rows;
}

async function createHieSmokeLog(db, { userId, passed, notes, testLabel, stepsPerformed }) {
  const readiness = await getHieLiveReadiness();
  const fhirMode = readiness.modes?.fhir || 'sandbox';
  const crMode = readiness.modes?.clientRegistry || 'sandbox';
  const summary =
    testLabel ||
    (passed
      ? `Live HIE smoke PASS (${fhirMode}/${crMode}) ${new Date().toISOString().slice(0, 10)}`
      : `Live HIE smoke FAIL or partial (${fhirMode}/${crMode})`);

  const [ins] = await db.execute(
    `INSERT INTO hie_live_smoke_log
     (recordedBy, passed, fhirMode, clientRegistryMode, notes, readinessJson, evidenceSummary, stepsPerformed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId || null,
      passed ? 1 : 0,
      String(fhirMode).slice(0, 20),
      String(crMode).slice(0, 20),
      notes ? String(notes).slice(0, 4000) : null,
      JSON.stringify(readiness),
      String(summary).slice(0, 500),
      stepsPerformed ? String(stepsPerformed).slice(0, 2000) : null,
    ]
  );

  return {
    logId: ins.insertId,
    passed: Boolean(passed),
    fhirMode,
    clientRegistryMode: crMode,
    evidenceSummary: summary,
    readiness,
  };
}

module.exports = { listHieSmokeLogs, createHieSmokeLog };
