/**
 * Phase 10 — IDSR weekly aggregate package for DHA reporting evidence.
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');
const idsr = require('./idsrPublisher');

function weekBounds(referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

async function exportWeeklyIdsrPackage(executor, options = {}) {
  const db = executor || pool;
  const { start, end } = weekBounds(options.referenceDate ? new Date(options.referenceDate) : new Date());
  const weekLabel = `${formatDate(start)}_to_${formatDate(end)}`;

  const [alerts] = await db.execute(
    `SELECT alertId, diseaseCode, diseaseName, urgency, patientId, sourceType, sourceId,
            facilityMflCode, facilityName, summary, mode, status, createdAt, publishedAt
     FROM idsr_alerts
     WHERE createdAt >= ? AND createdAt <= ?
     ORDER BY alertId ASC`,
    [start, end]
  );

  const byDisease = {};
  for (const row of alerts) {
    const code = row.diseaseCode || 'UNKNOWN';
    byDisease[code] = (byDisease[code] || 0) + 1;
  }

  const settings = await idsr.loadSettings(db);
  const mode = idsr.resolveMode(settings);

  const pkg = {
    reportType: 'IDSR_WEEKLY',
    weekLabel,
    periodStart: formatDate(start),
    periodEnd: formatDate(end),
    generatedAt: new Date().toISOString(),
    mode,
    alertCount: alerts.length,
    byDisease,
    alerts,
  };

  const [ins] = await db.execute(
    `INSERT INTO idsr_weekly_reports
     (weekLabel, periodStart, periodEnd, mode, alertCount, status, packageJson, generatedAt)
     VALUES (?, ?, ?, ?, ?, 'generated', ?, NOW())`,
    [weekLabel, formatDate(start), formatDate(end), mode, alerts.length, JSON.stringify(pkg)]
  );

  await enqueueOutboxEvent(db, {
    eventType: 'idsr.weekly.report',
    aggregateType: 'idsr_weekly_report',
    aggregateId: String(ins.insertId),
    payload: pkg,
  });

  return { reportId: ins.insertId, weekLabel, alertCount: alerts.length, package: pkg };
}

module.exports = { exportWeeklyIdsrPackage, weekBounds };
