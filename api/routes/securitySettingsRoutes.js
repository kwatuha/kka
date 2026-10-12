const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getRequestUserId } = require('../lib/branchContext');
const { auditFromRequest } = require('../lib/auditLog');
const { getMessagingComplianceStatus } = require('../lib/messagingCompliance');
const { sendMail, smtpConfigured } = require('../lib/smtpMailer');

function requireAdmin(req, res, next) {
  const u = req.user;
  if (!u) return res.status(401).json({ message: 'Authentication required' });
  const rn = String(u.roleName || u.role || '').toLowerCase();
  if (rn === 'admin' || rn.includes('admin') || Number(u.roleId) === 1) return next();
  return res.status(403).json({ message: 'Administrator access required' });
}

router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sessionTimeoutMinutes, passwordPolicy, requireAdmin2fa, loginOtpEnabled,
              passwordExpirationDays, passwordExpirationEnabled, updatedAt
       FROM system_security_settings WHERE settingId = 1 LIMIT 1`
    );
    if (!rows.length) {
      return res.json({
        sessionTimeoutMinutes: 30,
        passwordPolicy: 'medium',
        requireAdmin2fa: false,
        loginOtpEnabled: false,
        passwordExpirationDays: 90,
        passwordExpirationEnabled: false,
      });
    }
    const row = rows[0];
    res.json({
      sessionTimeoutMinutes: row.sessionTimeoutMinutes,
      passwordPolicy: row.passwordPolicy,
      requireAdmin2fa: Boolean(row.requireAdmin2fa),
      loginOtpEnabled: Boolean(row.loginOtpEnabled),
      passwordExpirationDays: row.passwordExpirationDays,
      passwordExpirationEnabled: Boolean(row.passwordExpirationEnabled),
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    console.error('security settings get:', err);
    res.status(500).json({ message: 'Failed to load security settings', error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const {
      sessionTimeoutMinutes = 30,
      passwordPolicy = 'medium',
      requireAdmin2fa = false,
      loginOtpEnabled = false,
      passwordExpirationDays = 90,
      passwordExpirationEnabled = false,
    } = req.body || {};

    const timeout = Math.min(480, Math.max(5, Number(sessionTimeoutMinutes) || 30));
    const policy = ['low', 'medium', 'high'].includes(passwordPolicy) ? passwordPolicy : 'medium';
    const expDays = Math.min(365, Math.max(30, Number(passwordExpirationDays) || 90));

    await pool.execute(
      `INSERT INTO system_security_settings (
         settingId, sessionTimeoutMinutes, passwordPolicy, requireAdmin2fa, loginOtpEnabled,
         passwordExpirationDays, passwordExpirationEnabled, updatedBy
       ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         sessionTimeoutMinutes = VALUES(sessionTimeoutMinutes),
         passwordPolicy = VALUES(passwordPolicy),
         requireAdmin2fa = VALUES(requireAdmin2fa),
         loginOtpEnabled = VALUES(loginOtpEnabled),
         passwordExpirationDays = VALUES(passwordExpirationDays),
         passwordExpirationEnabled = VALUES(passwordExpirationEnabled),
         updatedBy = VALUES(updatedBy)`,
      [
        timeout,
        policy,
        requireAdmin2fa ? 1 : 0,
        loginOtpEnabled ? 1 : 0,
        expDays,
        passwordExpirationEnabled ? 1 : 0,
        userId || null,
      ]
    );

    await auditFromRequest(req, {
      action: 'update',
      resourceType: 'security_settings',
      resourceId: '1',
      summary: 'Updated system security settings',
      after: {
        sessionTimeoutMinutes: timeout,
        passwordPolicy: policy,
        requireAdmin2fa: Boolean(requireAdmin2fa),
        loginOtpEnabled: Boolean(loginOtpEnabled),
        passwordExpirationEnabled: Boolean(passwordExpirationEnabled),
      },
    });

    const [rows] = await pool.execute(
      `SELECT sessionTimeoutMinutes, passwordPolicy, requireAdmin2fa, loginOtpEnabled,
              passwordExpirationDays, passwordExpirationEnabled, updatedAt
       FROM system_security_settings WHERE settingId = 1 LIMIT 1`
    );
    const row = rows[0];
    res.json({
      sessionTimeoutMinutes: row.sessionTimeoutMinutes,
      passwordPolicy: row.passwordPolicy,
      requireAdmin2fa: Boolean(row.requireAdmin2fa),
      loginOtpEnabled: Boolean(row.loginOtpEnabled),
      passwordExpirationDays: row.passwordExpirationDays,
      passwordExpirationEnabled: Boolean(row.passwordExpirationEnabled),
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    console.error('security settings put:', err);
    res.status(500).json({ message: 'Failed to save security settings', error: err.message });
  }
});

/** GET /api/security/messaging-status — DHA evidence (SMTP / IDSR email / SMS readiness) */
router.get('/messaging-status', async (_req, res) => {
  try {
    res.json({
      generatedAt: new Date().toISOString(),
      ...getMessagingComplianceStatus(),
      docs: ['docs/DHA_OPS_CRON_RUNBOOK.md', 'docs/DHA_PRE_HIE_COMPLIANCE_REVIEW.md'],
    });
  } catch (err) {
    console.error('messaging-status:', err);
    res.status(500).json({ message: 'Failed to load messaging status', error: err.message });
  }
});

/** POST /api/security/smtp-test — admin sends a test message (DHA REP-IDSR-EMAIL evidence) */
router.post('/smtp-test', requireAdmin, async (req, res) => {
  try {
    if (!smtpConfigured()) {
      return res.status(400).json({ message: 'SMTP is not configured (set SMTP_HOST on the server).' });
    }
    const to = String(req.body?.to || req.body?.email || '').trim();
    if (!to.includes('@')) {
      return res.status(400).json({ message: 'Provide body.to with a valid email address.' });
    }
    const result = await sendMail({
      to,
      subject: 'AZ CarePlus HMIS — SMTP configuration test',
      text: [
        'This message confirms SMTP settings for the AZ CarePlus HMIS API.',
        `Sent at (UTC): ${new Date().toISOString()}`,
        'Use for DHA evidence item REP-IDSR-EMAIL / facility alerting.',
      ].join('\n'),
    });
    await auditFromRequest(req, {
      action: 'SMTP_TEST',
      resourceType: 'security_settings',
      resourceId: 'smtp',
      summary: `SMTP test to ${to.replace(/(.{2}).+(@.*)/, '$1***$2')}`,
    });
    if (!result.ok) {
      return res.status(502).json({ message: 'SMTP send failed', error: result.error });
    }
    res.json({ ok: true, messageId: result.messageId, accepted: result.accepted });
  } catch (err) {
    console.error('smtp-test:', err);
    res.status(500).json({ message: 'SMTP test failed', error: err.message });
  }
});

module.exports = router;
