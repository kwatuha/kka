const pool = require('../config/db');

function safeJson(value) {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Write a row to system_audit_log. Never throws to callers (audit must not break clinical flows).
 */
async function writeAuditLog({
  userId = null,
  username = null,
  action,
  resourceType,
  resourceId = null,
  patientId = null,
  httpMethod = null,
  requestPath = null,
  ipAddress = null,
  userAgent = null,
  summary = null,
  before = null,
  after = null,
} = {}) {
  if (!action || !resourceType) return;
  try {
    await pool.execute(
      `INSERT INTO system_audit_log (
        userId, username, action, resourceType, resourceId, patientId,
        httpMethod, requestPath, ipAddress, userAgent, summary, beforeJson, afterJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        username || null,
        String(action).slice(0, 50),
        String(resourceType).slice(0, 100),
        resourceId != null ? String(resourceId).slice(0, 100) : null,
        patientId || null,
        httpMethod || null,
        requestPath ? String(requestPath).slice(0, 500) : null,
        ipAddress || null,
        userAgent ? String(userAgent).slice(0, 500) : null,
        summary ? String(summary).slice(0, 500) : null,
        safeJson(before),
        safeJson(after),
      ]
    );
  } catch (err) {
    console.warn('[auditLog] write failed:', err.message || err);
  }
}

function auditFromRequest(req, fields) {
  const user = req?.user || {};
  return writeAuditLog({
    userId: user.id || user.userId || null,
    username: user.username || user.name || null,
    httpMethod: req?.method || null,
    requestPath: req?.originalUrl || req?.path || null,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    userAgent: req?.headers?.['user-agent'] || null,
    ...fields,
  });
}

module.exports = {
  writeAuditLog,
  auditFromRequest,
};
