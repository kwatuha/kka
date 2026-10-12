/**
 * CQM submission register — facility-ready export bundle + audit trail.
 * National e-submission API is not available; this records each hand-off package.
 */
const crypto = require('crypto');
const pool = require('../config/db');
const { computeCqmPackage } = require('./cqmIndicators');
const { enqueueOutboxEvent } = require('./integrationOutbox');

let tablesReady = false;

async function ensureCqmSubmissionTables() {
  if (tablesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cqm_submissions (
      submissionId INT NOT NULL AUTO_INCREMENT,
      submissionRef VARCHAR(64) NOT NULL,
      periodStart DATE NOT NULL,
      periodEnd DATE NOT NULL,
      status ENUM('draft','submitted','acknowledged','failed') NOT NULL DEFAULT 'submitted',
      payloadJson LONGTEXT NOT NULL,
      payloadSha256 CHAR(64) NOT NULL,
      submittedBy INT NULL,
      submittedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes VARCHAR(500) NULL,
      PRIMARY KEY (submissionId),
      UNIQUE KEY uq_cqm_submission_ref (submissionRef),
      INDEX idx_cqm_sub_period (periodStart, periodEnd)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tablesReady = true;
}

function makeSubmissionRef(periodStart, periodEnd) {
  const stamp = String(periodStart).replace(/-/g, '') + String(periodEnd).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CQM-${stamp}-${suffix}`;
}

async function createCqmSubmission({ startDate, endDate, submittedBy, notes }) {
  await ensureCqmSubmissionTables();
  const pkg = await computeCqmPackage(null, { startDate, endDate });
  const payload = {
    ...pkg,
    submissionMeta: {
      generatedAt: new Date().toISOString(),
      channel: 'hmis_export_bundle',
      nationalRegistry: 'pending_api',
      instructions:
        'Download bundle for county/national quality office until live CQM API is connected.',
    },
  };
  const json = JSON.stringify(payload);
  const payloadSha256 = crypto.createHash('sha256').update(json).digest('hex');
  const submissionRef = makeSubmissionRef(pkg.period.startDate, pkg.period.endDate);

  const [ins] = await pool.execute(
    `INSERT INTO cqm_submissions
     (submissionRef, periodStart, periodEnd, status, payloadJson, payloadSha256, submittedBy, notes)
     VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?)`,
    [
      submissionRef,
      pkg.period.startDate,
      pkg.period.endDate,
      json,
      payloadSha256,
      submittedBy || null,
      notes ? String(notes).slice(0, 500) : null,
    ]
  );

  try {
    await enqueueOutboxEvent(pool, {
      eventType: 'cqm.submission',
      aggregateType: 'cqm_submission',
      aggregateId: ins.insertId,
      payload: {
        submissionId: ins.insertId,
        submissionRef,
        periodStart: pkg.period.startDate,
        periodEnd: pkg.period.endDate,
        payloadSha256,
        indicatorCount: (pkg.indicators || []).length,
      },
    });
  } catch (err) {
    console.warn('[cqmSubmission] outbox skipped:', err.message || err);
  }

  return {
    submissionId: ins.insertId,
    submissionRef,
    period: pkg.period,
    status: 'submitted',
    payloadSha256,
    indicatorCount: (pkg.indicators || []).length,
    payload,
  };
}

async function listCqmSubmissions(limit = 20) {
  await ensureCqmSubmissionTables();
  const lim = Math.min(Number(limit) || 20, 100);
  const [rows] = await pool.execute(
    `SELECT submissionId, submissionRef, periodStart, periodEnd, status, payloadSha256,
            submittedBy, submittedAt, notes
     FROM cqm_submissions ORDER BY submissionId DESC LIMIT ${lim}`
  );
  return rows;
}

async function getCqmSubmissionById(submissionId) {
  await ensureCqmSubmissionTables();
  const [rows] = await pool.execute(
    `SELECT * FROM cqm_submissions WHERE submissionId = ? LIMIT 1`,
    [submissionId]
  );
  return rows[0] || null;
}

module.exports = {
  ensureCqmSubmissionTables,
  createCqmSubmission,
  listCqmSubmissions,
  getCqmSubmissionById,
};
