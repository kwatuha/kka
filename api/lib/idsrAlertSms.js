/**
 * Optional facility SMS when IDSR alerts fire (DHA 10.2 partial — not patient SMS).
 * Set IDSR_ALERT_SMS=2547XXXXXXXX,2547YYYYYYYY (Kenya mobiles).
 */
const { isAdvantaConfigured, normalizeKenyaMobile, isValidKenyaMobile, sendAdvantaSms } = require('./advantaSms');

function parseAlertPhones() {
  const raw = String(process.env.IDSR_ALERT_SMS || '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((p) => normalizeKenyaMobile(p))
    .filter((p) => isValidKenyaMobile(p));
}

function isIdsrSmsEnabled() {
  const flag = String(process.env.IDSR_ALERT_SMS_ENABLED || 'true').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  return isAdvantaConfigured() && parseAlertPhones().length > 0;
}

async function notifyIdsrAlertSms(alert) {
  if (!isIdsrSmsEnabled()) return { sent: 0, skipped: 'disabled_or_unconfigured' };
  const immediateOnly = String(process.env.IDSR_ALERT_SMS_IMMEDIATE_ONLY || 'true').toLowerCase() !== 'false';
  if (immediateOnly && alert.urgency !== 'immediate') {
    return { sent: 0, skipped: 'non_immediate' };
  }
  const phones = parseAlertPhones();
  const text = `[IDSR] ${alert.diseaseName || alert.diseaseCode}: ${(alert.summary || 'Notifiable condition').slice(0, 120)} (#${alert.alertId})`;
  let sent = 0;
  for (const mobile of phones) {
    try {
      await sendAdvantaSms({ mobile, message: text.slice(0, 480) });
      sent += 1;
    } catch (err) {
      console.warn('[idsrAlertSms] send failed:', err.message || err);
    }
  }
  return { sent, phones: phones.length };
}

module.exports = { notifyIdsrAlertSms, isIdsrSmsEnabled, parseAlertPhones };
