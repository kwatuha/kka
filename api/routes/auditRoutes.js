const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * GET /api/audit/logs?limit=50&patientId=&userId=
 * DHA demo script: "Access the audit log"
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const params = [];
    let where = 'WHERE 1=1';
    if (req.query.patientId) {
      where += ' AND patientId = ?';
      params.push(Number(req.query.patientId));
    }
    if (req.query.userId) {
      where += ' AND userId = ?';
      params.push(Number(req.query.userId));
    }
    if (req.query.resourceType) {
      where += ' AND resourceType = ?';
      params.push(String(req.query.resourceType));
    }
    if (req.query.action) {
      where += ' AND action = ?';
      params.push(String(req.query.action));
    }

    const [rows] = await pool.execute(
      `SELECT auditId, occurredAt, userId, username, action, resourceType, resourceId,
              patientId, httpMethod, requestPath, ipAddress, summary, beforeJson, afterJson
       FROM system_audit_log
       ${where}
       ORDER BY occurredAt DESC
       LIMIT ${limit}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('audit logs:', err);
    res.status(500).json({ message: 'Failed to load audit logs', error: err.message });
  }
});

function csvEscape(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/audit/logs/export.csv — assessor export (DHA SEC-AUDIT-CSV)
 */
router.get('/logs/export.csv', async (req, res) => {
  try {
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const params = [];
    let where = 'WHERE 1=1';
    if (req.query.patientId) {
      where += ' AND patientId = ?';
      params.push(Number(req.query.patientId));
    }
    if (req.query.userId) {
      where += ' AND userId = ?';
      params.push(Number(req.query.userId));
    }
    const [rows] = await pool.execute(
      `SELECT auditId, occurredAt, userId, username, action, resourceType, resourceId,
              patientId, httpMethod, requestPath, ipAddress, summary
       FROM system_audit_log
       ${where}
       ORDER BY occurredAt DESC
       LIMIT ${limit}`,
      params
    );
    const header = [
      'auditId',
      'occurredAt',
      'userId',
      'username',
      'action',
      'resourceType',
      'resourceId',
      'patientId',
      'httpMethod',
      'requestPath',
      'ipAddress',
      'summary',
    ];
    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push(header.map((h) => csvEscape(row[h])).join(','));
    }
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hmis-audit-log-${stamp}.csv"`);
    res.send(`${lines.join('\n')}\n`);
  } catch (err) {
    console.error('audit csv export:', err);
    res.status(500).json({ message: 'Failed to export audit log', error: err.message });
  }
});

/**
 * GET /api/audit/outbox — integration outbox status (Phase 1 RabbitMQ spine)
 */
router.get('/outbox', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const status = req.query.status ? String(req.query.status) : null;
    const params = [];
    let where = 'WHERE 1=1';
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    const [rows] = await pool.execute(
      `SELECT outboxId, eventType, aggregateType, aggregateId, status, attempts, lastError, createdAt, publishedAt
       FROM integration_outbox
       ${where}
       ORDER BY outboxId DESC
       LIMIT ${limit}`,
      params
    );
    const [counts] = await pool.execute(
      `SELECT status, COUNT(*) AS c FROM integration_outbox GROUP BY status`
    );
    res.json({
      counts: Object.fromEntries(counts.map((r) => [r.status, Number(r.c)])),
      events: rows,
      rabbitmqConfigured: Boolean(process.env.RABBITMQ_URL),
    });
  } catch (err) {
    console.error('outbox list:', err);
    res.status(500).json({ message: 'Failed to load outbox', error: err.message });
  }
});

/**
 * POST /api/audit/outbox/replay-failed — reset all failed events
 * (Must be registered before /outbox/:id/replay)
 */
router.post('/outbox/replay-failed', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE integration_outbox
       SET status = 'pending', lastError = NULL, publishedAt = NULL
       WHERE status = 'failed'`
    );
    res.json({ message: 'Failed events requeued', count: result.affectedRows || 0 });
  } catch (err) {
    console.error('outbox replay-failed:', err);
    res.status(500).json({ message: 'Failed to replay outbox events', error: err.message });
  }
});

/**
 * POST /api/audit/outbox/:id/replay — reset one failed/pending event for republish
 */
router.post('/outbox/:id/replay', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await pool.execute(
      `UPDATE integration_outbox
       SET status = 'pending', lastError = NULL, publishedAt = NULL
       WHERE outboxId = ? AND status IN ('failed', 'pending', 'published')`,
      [id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Outbox event not found' });
    }
    res.json({ message: 'Queued for republish', outboxId: id });
  } catch (err) {
    console.error('outbox replay:', err);
    res.status(500).json({ message: 'Failed to replay outbox event', error: err.message });
  }
});

module.exports = router;
