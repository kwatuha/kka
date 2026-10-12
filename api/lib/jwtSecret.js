/**
 * Central JWT secret — refuse weak/missing secrets in production.
 */
const INSECURE_DEV_FALLBACK = 'your_fallback_secret_for_dev_only_change_this_asap';
const MIN_LENGTH = 32;

let cached;

function getJwtSecret() {
  if (cached) return cached;
  const raw = process.env.JWT_SECRET;
  const secret = raw ? String(raw).trim() : '';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.length < MIN_LENGTH) {
      throw new Error(
        `[security] JWT_SECRET must be set to at least ${MIN_LENGTH} random characters in production.`
      );
    }
    if (secret === INSECURE_DEV_FALLBACK) {
      throw new Error('[security] JWT_SECRET must not use the default development placeholder in production.');
    }
    cached = secret;
    return cached;
  }

  if (secret.length >= MIN_LENGTH) {
    cached = secret;
    return cached;
  }
  if (secret.length > 0) {
    console.warn('[security] JWT_SECRET is shorter than recommended 32 characters.');
    cached = secret;
    return cached;
  }
  console.warn('[security] Using insecure JWT fallback — set JWT_SECRET before production.');
  cached = INSECURE_DEV_FALLBACK;
  return cached;
}

function validateSecurityEnvironment() {
  getJwtSecret();
  const { validateMpesaInternalSecretEnvironment } = require('./mpesaInternalSecret');
  validateMpesaInternalSecretEnvironment();

  if (process.env.NODE_ENV === 'production') {
    if (String(process.env.DISABLE_API_AUTH || '') === '1') {
      throw new Error(
        '[security] DISABLE_API_AUTH=1 is not allowed when NODE_ENV=production.'
      );
    }
    if (String(process.env.SERVE_UPLOADS_PUBLIC || '') === '1') {
      console.warn(
        '[security] SERVE_UPLOADS_PUBLIC=1 — uploaded files are reachable without authentication.'
      );
    }
  }
}

module.exports = { getJwtSecret, validateSecurityEnvironment, INSECURE_DEV_FALLBACK, MIN_LENGTH };
