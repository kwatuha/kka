/**
 * Outbound messaging readiness (SMS/email) for DHA evidence — no live HIE required.
 */
const { smtpConfigured, defaultFrom } = require('./smtpMailer');
const { parseAlertEmails, isIdsrEmailEnabled } = require('./idsrAlertEmail');
const { isAdvantaConfigured } = require('./advantaSms');
const { getIntegrationAlertStatus } = require('./integrationFailureAlert');

function getMessagingComplianceStatus() {
  const smtp = smtpConfigured();
  const idsrRecipients = parseAlertEmails();
  const idsrEmail = isIdsrEmailEnabled() && smtp;
  const idsrSms = isAdvantaConfigured() && String(process.env.IDSR_ALERT_SMS || '').trim().length > 0;
  const pharmacyAlertEmail = String(process.env.PHARMACY_ALERT_EMAIL || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'));

  return {
    smtpConfigured: smtp,
    smtpFrom: smtp ? defaultFrom() : null,
    idsrAlertEmail: {
      enabled: isIdsrEmailEnabled(),
      recipientCount: idsrRecipients.length,
      deliverable: idsrEmail,
    },
    idsrAlertSms: {
      advantaConfigured: isAdvantaConfigured(),
      mobilesConfigured: Boolean(String(process.env.IDSR_ALERT_SMS || '').trim()),
      deliverable: idsrSms,
    },
    pharmacyAlertEmail: {
      configured: pharmacyAlertEmail.length > 0 && smtp,
      recipientCount: pharmacyAlertEmail.length,
    },
    publicBookingSms: {
      advantaConfigured: isAdvantaConfigured(),
      smsEnabled: String(process.env.SMS_ENABLED || 'true').toLowerCase() !== 'false',
    },
    integrationFailureAlert: getIntegrationAlertStatus(),
  };
}

module.exports = { getMessagingComplianceStatus };
