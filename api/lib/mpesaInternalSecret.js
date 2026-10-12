/**
 * Shared secret for loopback M-Pesa invoice payment posts (no user JWT).
 */
const DEFAULT_DEV = 'dev-mpesa-internal-not-for-production';
const FORBIDDEN_DEFAULT = 'intellinex-mpesa';
const MIN_LENGTH = 16;

function getMpesaInternalSecret() {
  const raw = process.env.MPESA_INTERNAL_SECRET;
  const secret = raw ? String(raw).trim() : '';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.length < MIN_LENGTH) {
      throw new Error(
        `[security] MPESA_INTERNAL_SECRET must be set to at least ${MIN_LENGTH} random characters in production.`
      );
    }
    if (secret === FORBIDDEN_DEFAULT) {
      throw new Error('[security] MPESA_INTERNAL_SECRET must not use the legacy default value in production.');
    }
    return secret;
  }

  if (secret.length >= MIN_LENGTH) return secret;
  if (secret.length > 0) {
    console.warn('[security] MPESA_INTERNAL_SECRET is shorter than recommended 16 characters.');
    return secret;
  }
  console.warn('[security] Using dev-only M-Pesa internal secret — set MPESA_INTERNAL_SECRET before production.');
  return DEFAULT_DEV;
}

function validateMpesaInternalSecretEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    getMpesaInternalSecret();
  }
}

module.exports = { getMpesaInternalSecret, validateMpesaInternalSecretEnvironment, FORBIDDEN_DEFAULT };
