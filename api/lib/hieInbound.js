/**
 * Phase 9 sandbox — minimal HIE inbound receive adapter.
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');

function resolveInboundSecret() {
  return process.env.HIE_INBOUND_SECRET || '';
}

function validateSharedSecret(req) {
  const expected = resolveInboundSecret();
  if (!expected) return true;
  const got = req.headers['x-hie-shared-secret'] || req.headers['x-hie-secret'] || '';
  return String(got) === expected;
}

function normalizeInboundPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body must be JSON object' };
  }
  const resourceType = body.resourceType;
  if (!resourceType) {
    return { ok: false, error: 'Missing resourceType' };
  }
  if (resourceType === 'Bundle') {
    const entries = Array.isArray(body.entry) ? body.entry : [];
    return {
      ok: true,
      resourceType: 'Bundle',
      bundleType: body.type || null,
      entryCount: entries.length,
      summary: `Bundle type=${body.type || 'unknown'} entries=${entries.length}`,
    };
  }
  if (['Patient', 'Encounter', 'Composition', 'Observation', 'DocumentReference'].includes(resourceType)) {
    return {
      ok: true,
      resourceType,
      bundleType: null,
      entryCount: 1,
      summary: `${resourceType}/${body.id || 'no-id'}`,
    };
  }
  return { ok: false, error: `Unsupported resourceType: ${resourceType}` };
}

async function receiveInbound(executor, req, payload) {
  const db = executor || pool;
  if (!validateSharedSecret(req)) {
    const err = new Error('Invalid HIE inbound shared secret');
    err.statusCode = 401;
    throw err;
  }

  const parsed = normalizeInboundPayload(payload);
  if (!parsed.ok) {
    const err = new Error(parsed.error);
    err.statusCode = 400;
    throw err;
  }

  const sourceLabel =
    req.headers['x-hie-source'] ||
    req.headers['x-forwarded-for'] ||
    req.ip ||
    'unknown';

  const [ins] = await db.execute(
    `INSERT INTO hie_inbound_receipts
     (resourceType, bundleType, entryCount, mode, status, sourceLabel, payloadSummary, payloadJson)
     VALUES (?, ?, ?, 'sandbox', 'accepted', ?, ?, ?)`,
    [
      parsed.resourceType,
      parsed.bundleType,
      parsed.entryCount,
      String(sourceLabel).slice(0, 120),
      parsed.summary,
      JSON.stringify(payload),
    ]
  );

  await enqueueOutboxEvent(db, {
    eventType: 'hie.inbound.received',
    aggregateType: 'hie_inbound_receipt',
    aggregateId: String(ins.insertId),
    payload: {
      receiptId: ins.insertId,
      resourceType: parsed.resourceType,
      entryCount: parsed.entryCount,
      summary: parsed.summary,
    },
  });

  return {
    receiptId: ins.insertId,
    status: 'accepted',
    resourceType: parsed.resourceType,
    entryCount: parsed.entryCount,
    summary: parsed.summary,
  };
}

async function listInboundReceipts(executor, limit = 20) {
  const db = executor || pool;
  const lim = Math.min(Number(limit) || 20, 100);
  const [rows] = await db.execute(
    `SELECT receiptId, resourceType, bundleType, entryCount, mode, status,
            sourceLabel, payloadSummary, receivedAt
     FROM hie_inbound_receipts
     ORDER BY receiptId DESC
     LIMIT ${lim}`
  );
  return rows;
}

function buildSampleInboundBundle() {
  const stamp = new Date().toISOString();
  return {
    resourceType: 'Bundle',
    type: 'message',
    id: `az-careplus-demo-inbound-${Date.now()}`,
    timestamp: stamp,
    entry: [
      {
        fullUrl: 'Patient/demo-inbound-az-careplus',
        resource: {
          resourceType: 'Patient',
          id: 'demo-inbound-az-careplus',
          meta: { source: 'AZ-CarePlus-HMIS-sandbox-demo' },
          identifier: [
            {
              system: 'urn:oid:2.16.840.1.113883.3.2944',
              value: 'DEMO-INBOUND-001',
            },
          ],
          name: [{ family: 'Demo', given: ['Inbound'] }],
          gender: 'unknown',
        },
      },
    ],
  };
}

module.exports = {
  receiveInbound,
  listInboundReceipts,
  validateSharedSecret,
  buildSampleInboundBundle,
};
