const crypto = require('crypto');
const { randomUUID } = require('crypto');
const pool = require('../config/db');
const { sendMail, smtpConfigured } = require('./smtpMailer');
const {
  sendAdvantaSms,
  isAdvantaConfigured,
  normalizeKenyaMobile,
  isValidKenyaMobile,
  maskPhone,
} = require('./advantaSms');
const { getJwtSecret } = require('./jwtSecret');
const { APP_BRAND } = require('./productBrand');

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function otpPepper() {
  return String(process.env.LOGIN_OTP_PEPPER || getJwtSecret() || 'login-otp').slice(0, 128);
}

function hashLoginOtpCode(code) {
  return crypto.createHash('sha256').update(`${code}:${otpPepper()}`).digest('hex');
}

function generateLoginOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function maskEmail(email) {
  const raw = String(email || '').trim();
  const at = raw.indexOf('@');
  if (at <= 0) return '***';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const shown = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}***`;
  return `${shown}@${domain}`;
}

async function isLoginOtpEnabled(poolRef = pool) {
  try {
    const [rows] = await poolRef.execute(
      'SELECT loginOtpEnabled FROM system_security_settings WHERE settingId = 1 LIMIT 1'
    );
    if (rows.length) return Boolean(rows[0].loginOtpEnabled);
  } catch {
    /* column or table missing */
  }
  return String(process.env.LOGIN_OTP_ENABLED || '').toLowerCase() === 'true';
}

async function purgeExpiredChallenges(poolRef = pool) {
  await poolRef.execute('DELETE FROM login_otp_challenges WHERE expiresAt < NOW()').catch(() => {});
}

/**
 * After password (and optional TOTP) succeeds, start SMS + email OTP when enabled.
 * @returns {Promise<null | { challengeId: string, maskedEmail: string|null, maskedPhone: string|null, deliveryWarnings: string[] }>}
 */
async function beginLoginOtpChallenge(user) {
  if (!(await isLoginOtpEnabled())) return null;

  await purgeExpiredChallenges();

  const code = generateLoginOtpCode();
  const challengeId = randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const codeHash = hashLoginOtpCode(code);

  await pool.execute(
    `INSERT INTO login_otp_challenges (challengeId, userId, codeHash, expiresAt)
     VALUES (?, ?, ?, ?)`,
    [challengeId, user.userId, codeHash, expiresAt]
  );

  const brand = APP_BRAND;
  const deliveryWarnings = [];
  const smsText = `${brand} login code: ${code}. Valid 10 minutes. Do not share this code.`;

  let smsOk = false;
  let emailOk = false;

  const phone = user.phone || user.mobile || user.phoneNumber;
  const normalized = normalizeKenyaMobile(phone);
  const email = String(user.email || '').trim();

  const smsTask = async () => {
    if (phone && isValidKenyaMobile(normalized) && isAdvantaConfigured()) {
      try {
        await sendAdvantaSms({ mobile: normalized, message: smsText, useOtpRoute: true });
        smsOk = true;
      } catch (err) {
        console.error('[loginOtp] SMS send failed:', err.message || err);
        deliveryWarnings.push('sms_failed');
      }
      return;
    }
    if (phone && !isValidKenyaMobile(normalized)) deliveryWarnings.push('invalid_phone');
    else if (!phone) deliveryWarnings.push('no_phone');
    else if (!isAdvantaConfigured()) deliveryWarnings.push('sms_not_configured');
  };

  const emailTask = async () => {
    if (email && smtpConfigured()) {
      try {
        const result = await sendMail({
          to: email,
          subject: `${brand} — sign-in verification code`,
          text: [
            `Your sign-in verification code is: ${code}`,
            '',
            'This code expires in 10 minutes.',
            'If you did not try to sign in, contact your system administrator.',
          ].join('\n'),
        });
        if (result.ok) emailOk = true;
        else deliveryWarnings.push('email_failed');
      } catch (err) {
        console.error('[loginOtp] email send failed:', err.message || err);
        deliveryWarnings.push('email_failed');
      }
      return;
    }
    if (!email) deliveryWarnings.push('no_email');
    else if (!smtpConfigured()) deliveryWarnings.push('email_not_configured');
  };

  await Promise.all([smsTask(), emailTask()]);

  const canDeliver = smsOk || emailOk;

  if (!canDeliver) {
    await pool.execute('DELETE FROM login_otp_challenges WHERE challengeId = ?', [challengeId]);
    const err = new Error('login_otp_delivery_failed');
    err.deliveryWarnings = deliveryWarnings;
    throw err;
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
    console.log('[loginOtp] dev hint: code issued for user', user.userId, '(not logged in production)');
  }

  return {
    challengeId,
    maskedEmail: email ? maskEmail(email) : null,
    maskedPhone: phone ? maskPhone(phone) : null,
    deliveryWarnings,
  };
}

async function verifyLoginOtpChallenge(challengeId, code) {
  const id = String(challengeId || '').trim();
  const token = String(code || '').replace(/\D/g, '').slice(0, 6);
  if (!id || token.length !== 6) {
    return { ok: false, error: 'invalid_request' };
  }

  const [rows] = await pool.execute(
    `SELECT c.challengeId, c.userId, c.codeHash, c.expiresAt, c.attempts
     FROM login_otp_challenges c
     WHERE c.challengeId = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) {
    return { ok: false, error: 'challenge_not_found' };
  }

  const row = rows[0];
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await pool.execute('DELETE FROM login_otp_challenges WHERE challengeId = ?', [id]);
    return { ok: false, error: 'expired' };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await pool.execute('DELETE FROM login_otp_challenges WHERE challengeId = ?', [id]);
    return { ok: false, error: 'too_many_attempts' };
  }

  const match = hashLoginOtpCode(token) === row.codeHash;
  if (!match) {
    await pool.execute(
      'UPDATE login_otp_challenges SET attempts = attempts + 1 WHERE challengeId = ?',
      [id]
    );
    return { ok: false, error: 'invalid_code', requiresLoginOtp: true };
  }

  await pool.execute('DELETE FROM login_otp_challenges WHERE challengeId = ?', [id]);
  return { ok: true, userId: row.userId };
}

module.exports = {
  isLoginOtpEnabled,
  beginLoginOtpChallenge,
  verifyLoginOtpChallenge,
  maskEmail,
};
