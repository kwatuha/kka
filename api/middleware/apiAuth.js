const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/jwtSecret');

const PUBLIC_PATH_PREFIXES = [
  '/api/auth',
  '/api/public',
  '/api/billing/mpesa/callback',
];

function isPublicApiPath(path = '') {
  const p = path.split('?')[0];
  return PUBLIC_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** STK callback handler posts invoice payments loopback with shared secret (no user JWT). */
function isInternalMpesaInvoicePayment(req) {
  const { getMpesaInternalSecret } = require('../lib/mpesaInternalSecret');
  const secret = getMpesaInternalSecret();
  const hdr = req.header('X-Internal-Mpesa') || req.headers?.['x-internal-mpesa'];
  if (!hdr || hdr !== secret) return false;
  const p = (req.originalUrl || req.path || '').split('?')[0];
  return (
    req.method === 'POST' &&
    /\/api\/billing\/invoices\/\d+\/payment$/.test(p)
  );
}

function attachUserFromToken(req) {
  const authHeader = req.header('Authorization') || req.headers?.authorization;
  if (!authHeader) return false;
  const token = authHeader.split(' ')[1];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.user) req.user = decoded.user;
    else if (decoded.userId) req.user = decoded;
    else return false;
    return true;
  } catch {
    return false;
  }
}

/** Always attach req.user when a valid JWT is present (does not reject). */
function attachUserIfPresent(req, res, next) {
  attachUserFromToken(req);
  next();
}

/**
 * Enforce JWT auth unless path is public or auth is disabled via env.
 * DISABLE_API_AUTH=1 → never enforce (emergency escape hatch)
 * REQUIRE_API_AUTH=0 → do not enforce
 * Otherwise enforce in production, or when REQUIRE_API_AUTH=1
 */
function shouldEnforceAuth() {
  if (String(process.env.DISABLE_API_AUTH || '') === '1') return false;
  if (String(process.env.REQUIRE_API_AUTH || '') === '0') return false;
  if (String(process.env.REQUIRE_API_AUTH || '') === '1') return true;
  return process.env.NODE_ENV === 'production';
}

function requireAuthUnlessPublic(req, res, next) {
  if (!shouldEnforceAuth()) return next();
  if (isPublicApiPath(req.originalUrl || req.path || '')) return next();

  if (isInternalMpesaInvoicePayment(req)) {
    req.user = req.user || { id: null, userId: null, roleName: 'system' };
    return next();
  }

  if (req.user) return next();

  try {
    const { tryServiceCronAuth } = require('../lib/serviceCronAuth');
    if (tryServiceCronAuth(req)) return next();
  } catch {
    /* optional module load */
  }

  // Token may have been invalid; try once more for clear error
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'Invalid token format, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.user) req.user = decoded.user;
    else if (decoded.userId) req.user = decoded;
    else return res.status(401).json({ msg: 'Invalid token structure' });
    return next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}

module.exports = {
  attachUserIfPresent,
  requireAuthUnlessPublic,
  shouldEnforceAuth,
  isPublicApiPath,
};
