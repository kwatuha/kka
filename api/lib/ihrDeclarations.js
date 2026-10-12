/**
 * IHR-oriented event declarations (facility workflow until national IHR pipe is live).
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');
const { createStaffNotification } = require('./staffNotifications');

let tablesReady = false;

async function ensureIhrDeclarationTables() {
  if (tablesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ihr_event_declarations (
      declarationId INT NOT NULL AUTO_INCREMENT,
      eventCode VARCHAR(64) NOT NULL,
      idsrAlertId INT NULL,
      title VARCHAR(200) NOT NULL,
      summary TEXT NULL,
      status ENUM('open','under_review','closed') NOT NULL DEFAULT 'open',
      declaredBy INT NULL,
      declaredAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closedAt TIMESTAMP NULL,
      PRIMARY KEY (declarationId),
      INDEX idx_ihr_decl_status (status, declaredAt),
      INDEX idx_ihr_decl_alert (idsrAlertId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tablesReady = true;
}

async function declareIhrEvent({
  eventCode,
  idsrAlertId,
  title,
  summary,
  declaredBy,
}) {
  await ensureIhrDeclarationTables();
  const code = String(eventCode || '').trim();
  if (!code) {
    const err = new Error('eventCode is required');
    err.status = 400;
    throw err;
  }

  const [cat] = await pool.execute(
    'SELECT eventCode, title, ihrCategory FROM ihr_event_catalog WHERE eventCode = ? AND active = 1 LIMIT 1',
    [code]
  );
  if (!cat.length) {
    const err = new Error('Unknown IHR event code');
    err.status = 404;
    throw err;
  }

  const alertId = idsrAlertId != null && Number(idsrAlertId) > 0 ? Number(idsrAlertId) : null;
  const displayTitle =
    String(title || '').trim() || cat[0].title || code;

  const [ins] = await pool.execute(
    `INSERT INTO ihr_event_declarations
     (eventCode, idsrAlertId, title, summary, declaredBy, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    [code, alertId, displayTitle.slice(0, 200), summary ? String(summary).slice(0, 2000) : null, declaredBy || null]
  );

  const declarationId = ins.insertId;

  if (alertId) {
    try {
      await pool.execute(
        `INSERT INTO ihr_idsr_links (idsrAlertId, eventCode, notes)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE notes = VALUES(notes), createdAt = CURRENT_TIMESTAMP`,
        [alertId, code, `IHR declaration #${declarationId}`]
      );
    } catch (linkErr) {
      console.warn('[ihrDeclarations] link skipped:', linkErr.message || linkErr);
    }
  }

  await createStaffNotification(pool, {
    category: 'public_health',
    severity: 'critical',
    title: `IHR event declared: ${displayTitle}`,
    message: summary || `Declaration #${declarationId} · ${code}`,
    referenceType: 'ihr_declaration',
    referenceId: declarationId,
    targetRoles: 'admin,doctor,nurse,registration',
  });

  try {
    await enqueueOutboxEvent(pool, {
      eventType: 'ihr.event.declared',
      aggregateType: 'ihr_declaration',
      aggregateId: declarationId,
      payload: { declarationId, eventCode: code, idsrAlertId: alertId, title: displayTitle },
    });
  } catch (outErr) {
    console.warn('[ihrDeclarations] outbox skipped:', outErr.message || outErr);
  }

  return {
    declarationId,
    eventCode: code,
    idsrAlertId: alertId,
    title: displayTitle,
    status: 'open',
    ihrCategory: cat[0].ihrCategory || null,
  };
}

async function listIhrDeclarations(limit = 30) {
  await ensureIhrDeclarationTables();
  const lim = Math.min(Number(limit) || 30, 100);
  const [rows] = await pool.execute(
    `SELECT d.declarationId, d.eventCode, d.idsrAlertId, d.title, d.summary, d.status,
            d.declaredBy, d.declaredAt, d.closedAt,
            c.title AS catalogTitle, c.ihrCategory
     FROM ihr_event_declarations d
     LEFT JOIN ihr_event_catalog c ON c.eventCode = d.eventCode
     ORDER BY d.declarationId DESC
     LIMIT ${lim}`
  );
  return rows;
}

module.exports = {
  ensureIhrDeclarationTables,
  declareIhrEvent,
  listIhrDeclarations,
};
