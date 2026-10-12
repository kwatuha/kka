const pool = require('../config/db');

const DEFAULT_IDSR_ROLES = 'admin,doctor,nurse,registration';

function roleMatchesTarget(userRole, targetRoles) {
  if (!targetRoles || !String(targetRoles).trim()) return true;
  const role = String(userRole || '').toLowerCase();
  return String(targetRoles)
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
    .some((t) => role.includes(t));
}

async function createStaffNotification(executor, {
  category = 'system',
  severity = 'warning',
  title,
  message,
  referenceType = null,
  referenceId = null,
  targetRoles = null,
}) {
  const db = executor || pool;
  const [ins] = await db.execute(
    `INSERT INTO staff_in_app_notifications
     (category, severity, title, message, referenceType, referenceId, targetRoles, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      category,
      severity,
      String(title).slice(0, 200),
      String(message).slice(0, 1000),
      referenceType,
      referenceId != null ? String(referenceId) : null,
      targetRoles,
    ]
  );
  return ins.insertId;
}

async function notifyIdsrAlert(executor, alert) {
  const sev = alert.urgency === 'immediate' ? 'critical' : 'warning';
  return createStaffNotification(executor, {
    category: 'idsr',
    severity: sev,
    title: `IDSR: ${alert.diseaseName || alert.diseaseCode}`,
    message: `${alert.summary || 'Notifiable condition detected'} (alert #${alert.alertId})`,
    referenceType: 'idsr_alert',
    referenceId: alert.alertId,
    targetRoles: DEFAULT_IDSR_ROLES,
  });
}

async function listStaffNotifications(executor, { status = 'pending', limit = 30, userRole = '' }) {
  const db = executor || pool;
  const lim = Math.min(Number(limit) || 30, 100);
  const [rows] = await db.execute(
    `SELECT notificationId, category, severity, title, message, referenceType, referenceId,
            targetRoles, status, acknowledgedBy, acknowledgedAt, createdAt
     FROM staff_in_app_notifications
     WHERE status = ?
     ORDER BY notificationId DESC
     LIMIT ${lim}`,
    [status]
  );
  return rows.filter((r) => roleMatchesTarget(userRole, r.targetRoles));
}

async function acknowledgeStaffNotification(executor, notificationId, userId) {
  const db = executor || pool;
  const [result] = await db.execute(
    `UPDATE staff_in_app_notifications
     SET status = 'acknowledged', acknowledgedBy = ?, acknowledgedAt = NOW()
     WHERE notificationId = ? AND status = 'pending'`,
    [userId, notificationId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createStaffNotification,
  notifyIdsrAlert,
  listStaffNotifications,
  acknowledgeStaffNotification,
  roleMatchesTarget,
};
