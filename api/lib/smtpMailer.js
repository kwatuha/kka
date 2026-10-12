/**
 * Optional SMTP send for facility alerts (IDSR email, etc.).
 * Env: SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_SECURE (true/false), SMTP_FROM
 */
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && nodemailer);
}

function createTransport() {
  if (!nodemailer || !process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const auth =
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth,
  });
}

function defaultFrom() {
  const user = String(process.env.SMTP_USER || '').trim();
  const rawFrom = String(process.env.SMTP_FROM || '').trim();
  // Prefer authenticated mailbox — many hosts reject unverified addresses (e.g. noreply@).
  if (user) {
    if (rawFrom && rawFrom.includes('<') && rawFrom.includes('>')) {
      const display = rawFrom.replace(/<[^>]+>/, '').trim();
      if (display) return `${display} <${user}>`;
    }
    if (rawFrom && !rawFrom.includes('@')) {
      return `${rawFrom} <${user}>`;
    }
    if (rawFrom.toLowerCase() === user.toLowerCase()) return rawFrom;
    if (rawFrom.includes(user)) return rawFrom;
    return user;
  }
  if (rawFrom) return rawFrom;
  return `noreply@${String(process.env.SMTP_HOST || 'localhost').replace(/^smtp\./, '')}`;
}

/**
 * @param {{ to: string | string[], subject: string, text: string, html?: string }} opts
 */
async function sendMail(opts) {
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured' };
  }
  const transport = createTransport();
  if (!transport) {
    return { ok: false, error: 'transport_unavailable' };
  }
  const to = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  try {
    const info = await transport.sendMail({
      from: defaultFrom(),
      to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || undefined,
      attachments: opts.attachments || undefined,
    });
    return { ok: true, messageId: info.messageId, accepted: info.accepted };
  } catch (err) {
    console.error('[smtpMailer] send failed:', err.message || err);
    return { ok: false, error: err.message || 'send_failed' };
  }
}

module.exports = { sendMail, smtpConfigured, defaultFrom };
