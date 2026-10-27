/**
 * Notify facility ICT duty staff when national/integration submissions fail.
 * SMS via Advanta (same stack as patient/IDSR alerts).
 *
 * Env:
 *   INTEGRATION_ALERT_SMS — comma-separated Kenya mobiles (falls back to IDSR_ALERT_SMS)
 *   INTEGRATION_ALERT_EMAIL — optional (falls back to IDSR_ALERT_EMAIL)
 *   INTEGRATION_ALERT_ENABLED=true|false
 *   INTEGRATION_ALERT_COOLDOWN_MS — default 1 hour per channel+reference dedup
 */
const {
  isAdvantaConfigured,
  normalizeKenyaMobile,
  isValidKenyaMobile,
  sendAdvantaSms,
} = require('./advantaSms');
const { smtpConfigured, sendMail } = require('./smtpMailer');
const { writeAuditLog } = require('./auditLog');

const COOLDOWN_MS = Number(process.env.INTEGRATION_ALERT_COOLDOWN_MS || 3600000);
/** @type {Map<string, number>} */
const cooldownUntil = new Map();

function parsePhones() {
  const raw = String(
    process.env.INTEGRATION_ALERT_SMS || process.env.IDSR_ALERT_SMS || ''
  ).trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((p) => normalizeKenyaMobile(p))
    .filter((p) => isValidKenyaMobile(p));
}

function parseEmails() {
  const raw = String(
    process.env.INTEGRATION_ALERT_EMAIL || process.env.IDSR_ALERT_EMAIL || ''
  ).trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

function isIntegrationAlertEnabled() {
  const flag = String(process.env.INTEGRATION_ALERT_ENABLED || 'true').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  const phones = parsePhones();
  const emails = parseEmails();
  const smsOk = phones.length > 0 && isAdvantaConfigured();
  const emailOk = emails.length > 0 && smtpConfigured();
  return smsOk || emailOk;
}

function getIntegrationAlertStatus() {
  const phones = parsePhones();
  const emails = parseEmails();
  return {
    enabled: isIntegrationAlertEnabled(),
    smsDeliverable: phones.length > 0 && isAdvantaConfigured(),
    emailDeliverable: emails.length > 0 && smtpConfigured(),
    mobileCount: phones.length,
    emailCount: emails.length,
    usesIdsrSmsFallback: !String(process.env.INTEGRATION_ALERT_SMS || '').trim(),
    usesIdsrEmailFallback: !String(process.env.INTEGRATION_ALERT_EMAIL || '').trim(),
    cooldownMinutes: Math.round(COOLDOWN_MS / 60000),
  };
}

function shouldSendAlert(dedupKey) {
  const key = String(dedupKey || 'generic').slice(0, 120);
  const now = Date.now();
  const until = cooldownUntil.get(key);
  if (until && until > now) return false;
  cooldownUntil.set(key, now + COOLDOWN_MS);
  return true;
}

/**
 * @param {{ channel: string, summary: string, detail?: string, referenceId?: string|number }} payload
 */
async function notifyIntegrationFailure(payload) {
  const { channel, summary, detail, referenceId } = payload || {};
  if (!channel || !summary) {
    return { skipped: 'invalid_payload' };
  }
  if (!isIntegrationAlertEnabled()) {
    return { skipped: 'disabled_or_unconfigured' };
  }

  const dedupKey = `${channel}:${referenceId != null ? referenceId : summary.slice(0, 40)}`;
  if (!shouldSendAlert(dedupKey)) {
    return { skipped: 'cooldown' };
  }

  const facility = String(process.env.DHA_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'HMIS')
    .split(',')[0]
    .trim();
  const text = `[HMIS Integration] ${summary}${detail ? `: ${detail}` : ''}`.slice(0, 460);
  const emailBody = [
    text,
    '',
    `Channel: ${channel}`,
    referenceId != null ? `Reference: ${referenceId}` : null,
    `Facility: ${facility}`,
    `Time (UTC): ${new Date().toISOString()}`,
    '',
    'Review Administration → Data exchange / Integration outbox / FHIR export log.',
  ]
    .filter(Boolean)
    .join('\n');

  let smsSent = 0;
  const phones = parsePhones();
  if (phones.length && isAdvantaConfigured()) {
    for (const mobile of phones) {
      try {
        await sendAdvantaSms({ mobile, message: text });
        smsSent += 1;
      } catch (err) {
        console.warn('[integrationFailureAlert] SMS failed:', err.message || err);
      }
    }
  }

  let emailSent = 0;
  const emails = parseEmails();
  if (emails.length && smtpConfigured()) {
    const result = await sendMail({
      to: emails,
      subject: `[HMIS Integration] ${summary}`.slice(0, 120),
      text: emailBody,
    });
    if (result.ok) emailSent = emails.length;
    else console.warn('[integrationFailureAlert] email failed:', result.error);
  }

  await writeAuditLog({
    username: 'system',
    action: 'INTEGRATION_FAILURE_ALERT',
    resourceType: 'integration',
    resourceId: referenceId != null ? String(referenceId) : channel,
    summary: summary.slice(0, 500),
    after: { channel, smsSent, emailSent, detail: detail ? detail.slice(0, 200) : null },
  });

  return { smsSent, emailSent, dedupKey };
}

module.exports = {
  notifyIntegrationFailure,
  isIntegrationAlertEnabled,
  getIntegrationAlertStatus,
  parsePhones,
  parseEmails,
};
