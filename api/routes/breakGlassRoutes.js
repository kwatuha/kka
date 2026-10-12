/**
 * DHA Phase 6 — break-glass emergency access (logged, re-authenticated).
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../config/db');
const { getRequestUserId } = require('../lib/branchContext');
const { auditFromRequest } = require('../lib/auditLog');

const VALID_MINUTES = 15;

router.post('/break-glass', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const { patientId, reason, password, authorizerNote } = req.body || {};
    if (!patientId || !String(reason || '').trim()) {
      return res.status(400).json({ message: 'patientId and reason are required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'password is required to confirm break-glass access' });
    }

    const [users] = await pool.execute(
      'SELECT passwordHash FROM users WHERE userId = ? AND isActive = 1 AND voided = 0',
      [userId]
    );
    if (!users.length) return res.status(401).json({ message: 'User not found' });
    const ok = await bcrypt.compare(String(password), users[0].passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid password' });

    const [patients] = await pool.execute(
      'SELECT patientId FROM patients WHERE patientId = ? AND (voided = 0 OR voided IS NULL)',
      [Number(patientId)]
    );
    if (!patients.length) return res.status(404).json({ message: 'Patient not found' });

    const validUntil = new Date(Date.now() + VALID_MINUTES * 60 * 1000);
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const ua = req.headers['user-agent'] || null;

    const [ins] = await pool.execute(
      `INSERT INTO break_glass_access_log
       (userId, patientId, reason, authorizerNote, ipAddress, userAgent, validUntil)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        Number(patientId),
        String(reason).trim().slice(0, 500),
        authorizerNote ? String(authorizerNote).slice(0, 255) : null,
        ip ? String(ip).slice(0, 64) : null,
        ua ? String(ua).slice(0, 500) : null,
        validUntil,
      ]
    );

    await auditFromRequest(req, {
      action: 'BREAK_GLASS',
      resourceType: 'patient',
      resourceId: String(patientId),
      patientId: Number(patientId),
      summary: `Break-glass access: ${String(reason).trim().slice(0, 120)}`,
    });

    res.status(201).json({
      logId: ins.insertId,
      patientId: Number(patientId),
      validUntil: validUntil.toISOString(),
      message: 'Break-glass access recorded. Access is logged for privacy review.',
    });
  } catch (err) {
    console.error('break-glass:', err);
    res.status(500).json({ message: 'Failed to record break-glass access', error: err.message });
  }
});

router.get('/break-glass/logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const patientId = req.query.patientId ? Number(req.query.patientId) : null;
    let sql = `
      SELECT b.logId, b.userId, b.patientId, b.reason, b.authorizerNote,
             b.validUntil, b.createdAt, b.ipAddress,
             u.username, u.firstName, u.lastName,
             p.firstName AS patientFirstName, p.lastName AS patientLastName
      FROM break_glass_access_log b
      INNER JOIN users u ON u.userId = b.userId
      INNER JOIN patients p ON p.patientId = b.patientId
    `;
    const params = [];
    if (patientId) {
      sql += ' WHERE b.patientId = ?';
      params.push(patientId);
    }
    sql += ` ORDER BY b.logId DESC LIMIT ${limit}`;
    const [rows] = await pool.execute(sql, params);
    res.json({ logs: rows });
  } catch (err) {
    console.error('break-glass logs:', err);
    res.status(500).json({ message: 'Failed to load break-glass logs', error: err.message });
  }
});

module.exports = router;
