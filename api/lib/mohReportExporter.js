const crypto = require('crypto');
const pool = require('../config/db');
const { getReport } = require('./mohReportService');
const { enqueueOutboxEvent } = require('./integrationOutbox');

function monthBounds(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x) => x.toISOString().slice(0, 10);
  const periodLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end), periodLabel };
}

function sha256Json(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

async function exportMohReportPackage(executor, { reportCode, startDate, endDate, periodLabel }) {
  const db = executor || pool;
  const code = String(reportCode || '717').trim();
  const report = await getReport(code, startDate, endDate);
  const pkg = {
    reportType: 'MOH_FACILITY',
    reportCode: code,
    periodLabel,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    report,
  };
  const checksum = sha256Json(pkg);

  const [ins] = await db.execute(
    `INSERT INTO moh_report_exports
     (reportCode, periodLabel, startDate, endDate, sha256, status, packageJson)
     VALUES (?, ?, ?, ?, ?, 'generated', ?)
     ON DUPLICATE KEY UPDATE
       startDate = VALUES(startDate),
       endDate = VALUES(endDate),
       sha256 = VALUES(sha256),
       status = 'generated',
       packageJson = VALUES(packageJson),
       generatedAt = CURRENT_TIMESTAMP`,
    [code, periodLabel, startDate, endDate, checksum, JSON.stringify(pkg)]
  );

  const exportId = ins.insertId || null;
  let resolvedId = exportId;
  if (!resolvedId) {
    const [rows] = await db.execute(
      `SELECT exportId FROM moh_report_exports WHERE reportCode = ? AND periodLabel = ? LIMIT 1`,
      [code, periodLabel]
    );
    resolvedId = rows[0]?.exportId;
  }

  await enqueueOutboxEvent(db, {
    eventType: 'moh.report.export',
    aggregateType: 'moh_report_export',
    aggregateId: String(resolvedId || code),
    payload: { reportCode: code, periodLabel, sha256: checksum },
  });

  return { exportId: resolvedId, reportCode: code, periodLabel, sha256: checksum, package: pkg };
}

async function exportMohRoutineBundle(executor, options = {}) {
  const { start, end, periodLabel } = monthBounds(options.referenceDate ? new Date(options.referenceDate) : new Date());
  const codes = options.reportCodes || ['717', '705', '710'];
  const results = [];
  for (const code of codes) {
    results.push(
      await exportMohReportPackage(executor, {
        reportCode: code,
        startDate: options.startDate || start,
        endDate: options.endDate || end,
        periodLabel: options.periodLabel || periodLabel,
      })
    );
  }
  return { periodLabel: options.periodLabel || periodLabel, exports: results };
}

module.exports = {
  exportMohReportPackage,
  exportMohRoutineBundle,
  monthBounds,
  sha256Json,
};
