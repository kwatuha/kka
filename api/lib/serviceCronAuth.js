const crypto = require('crypto');

/** Cron/service routes that may use a dedicated env token instead of a user JWT. */
const CRON_ROUTES = [
  { method: 'POST', path: '/api/moh-reports/scheduled-export', envKey: 'MOH_EXPORT_CRON_TOKEN' },
  { method: 'POST', path: '/api/integrations/idsr/weekly-export', envKey: 'IDSR_CRON_TOKEN' },
];

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function extractBearer(req) {
  const auth = req.header('Authorization') || req.headers?.authorization || '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice(7).trim();
}

/**
 * If request matches a cron route and presents the configured service token, set req.user and return true.
 */
function tryServiceCronAuth(req) {
  const method = (req.method || 'GET').toUpperCase();
  const path = (req.originalUrl || req.path || '').split('?')[0];
  const route = CRON_ROUTES.find((r) => r.method === method && path === r.path);
  if (!route) return false;

  const expected = process.env[route.envKey];
  if (!expected || String(expected).trim() === '') return false;

  const candidate =
    extractBearer(req) ||
    String(req.header('X-MOH-Cron-Token') || '').trim() ||
    String(req.header('X-IDSR-Cron-Token') || '').trim() ||
    String(req.header('X-Service-Cron-Token') || '').trim();

  if (!candidate || !timingSafeEqual(candidate, String(expected).trim())) return false;

  req.user = {
    userId: 0,
    id: 0,
    username: 'service-cron',
    roleName: 'admin',
    serviceCron: true,
  };
  return true;
}

module.exports = { tryServiceCronAuth, CRON_ROUTES };
