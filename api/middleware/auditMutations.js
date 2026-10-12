const { auditFromRequest } = require('../lib/auditLog');

const AUDITED_PREFIXES = [
  '/api/patients',
  '/api/medical-records',
  '/api/laboratory',
  '/api/pharmacy',
  '/api/billing',
  '/api/triage',
  '/api/inpatient',
  '/api/telemedicine',
  '/api/queue',
  '/api/nbtms',
];

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function matchesAudited(path = '') {
  const p = path.split('?')[0];
  return AUDITED_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * After successful mutating PHI-related requests, write a lightweight audit row.
 */
function auditMutations(req, res, next) {
  if (!MUTATING.has(req.method) || !matchesAudited(req.originalUrl || req.path || '')) {
    return next();
  }

  const started = Date.now();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      if (res.statusCode < 400) {
        const path = req.originalUrl || req.path || '';
        const resourceType = path.split('/').filter(Boolean)[1] || 'api';
        const resourceId =
          body?.patientId ||
          body?.orderId ||
          body?.invoiceId ||
          body?.id ||
          req.params?.id ||
          null;
        const patientId = body?.patientId || req.body?.patientId || req.params?.patientId || null;
        void auditFromRequest(req, {
          action: req.method.toLowerCase(),
          resourceType,
          resourceId,
          patientId: patientId ? Number(patientId) || null : null,
          summary: `${req.method} ${path.split('?')[0]} (${Date.now() - started}ms)`,
          after: {
            statusCode: res.statusCode,
            keys: body && typeof body === 'object' ? Object.keys(body).slice(0, 20) : null,
          },
        });
      }
    } catch (err) {
      console.warn('[auditMutations]', err.message || err);
    }
    return originalJson(body);
  };

  next();
}

module.exports = { auditMutations };
