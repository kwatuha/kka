/**
 * Data Exchange overview — destination status + unified transmission ledger.
 * Mounted under /api/integrations
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/** Keep in sync with lib/data-exchange-catalog.ts */
const DESTINATIONS = [
  {
    id: 'event-bus',
    name: 'Internal event bus',
    shortName: 'Outbox / RabbitMQ',
    purpose: 'Queues facility events so national adapters and county systems can consume them reliably.',
    dataTypes: [
      'Patient registered',
      'Lab finalised',
      'Encounter closed',
      'Claim ready',
      'Allied health CPOE orders',
    ],
    authority: 'Facility (internal spine)',
    eventPatterns: [
      'patient.registered',
      'encounter.closed',
      'observation.lab.final',
      'claim.ready',
      'cpoe.allied.',
    ],
    configureHash: 'integration-outbox',
  },
  {
    id: 'client-registry',
    name: 'Client Registry (NUPI)',
    shortName: 'NUPI / CR',
    purpose: 'Resolve and register unique patient identity with the national Client Registry.',
    dataTypes: ['Demographics', 'Identifiers', 'NUPI number'],
    authority: 'Ministry of Health / DHA identity',
    eventPatterns: ['patient.nupi', 'client.registry', 'nupi'],
    configureHash: 'national-integrations',
  },
  {
    id: 'facility-registry',
    name: 'Facility Registry (MFL)',
    shortName: 'MFL',
    purpose: 'Keep facility Master Facility List codes aligned with the national registry.',
    dataTypes: ['Branch / facility codes', 'KEPH level', 'MFL sync'],
    authority: 'Ministry of Health / DHA facility registry',
    eventPatterns: ['facility.mfl', 'mfl'],
    configureHash: 'national-integrations',
  },
  {
    id: 'fhir',
    name: 'FHIR clinical exchange',
    shortName: 'FHIR / OpenHIM',
    purpose: 'Share clinical resources (Patient, Encounter, Observation) with national mediators.',
    dataTypes: ['Patient', 'Encounter', 'Lab Observation', 'LOINC-mapped results'],
    authority: 'DHA clinical interoperability',
    eventPatterns: ['fhir.'],
    configureHash: 'fhir-exchange',
  },
  {
    id: 'hl7',
    name: 'HL7 v2 lab results (ORU)',
    shortName: 'HL7 ORU',
    purpose: 'Sandbox ORU^R01 messages queued when lab results are finalised.',
    dataTypes: ['ORU^R01', 'Lab observation segments'],
    authority: 'DHA lab interoperability (sandbox)',
    eventPatterns: ['hl7.'],
    configureHash: 'fhir-exchange',
  },
  {
    id: 'dhis2',
    name: 'DHIS2 / KHIS reporting',
    shortName: 'DHIS2',
    purpose: 'Send aggregate facility indicators for national and county health information systems.',
    dataTypes: ['Monthly OPD/IPD aggregates', 'Lab volumes', 'SDMX-HD packages'],
    authority: 'KHIS / county HIS',
    eventPatterns: ['dhis2'],
    configureHash: 'reporting-claims',
  },
  {
    id: 'idsr',
    name: 'IDSR disease surveillance',
    shortName: 'IDSR',
    purpose: 'Notify surveillance systems when notifiable conditions are recorded.',
    dataTypes: ['Notifiable disease alerts', 'Case signals'],
    authority: 'Disease surveillance (IDSR)',
    eventPatterns: ['idsr'],
    configureHash: 'reporting-claims',
  },
  {
    id: 'sha',
    name: 'SHA claims',
    shortName: 'SHA',
    purpose: 'Submit insurance claims packages to the Social Health Authority / payer adapters.',
    dataTypes: ['Claim packages', 'Authorization references'],
    authority: 'Social Health Authority',
    eventPatterns: ['sha.', 'claim.'],
    configureHash: 'reporting-claims',
  },
  {
    id: 'nascop',
    name: 'NASCOP (HIV programme)',
    shortName: 'NASCOP',
    purpose: 'Programme reporting for HIV testing, ART, and viral load (planned national connection).',
    dataTypes: ['HTS summaries', 'ART regimens', 'Viral load outcomes'],
    authority: 'NASCOP / national HIV programme',
    eventPatterns: ['nascop'],
    configureHash: 'data-exchange-nascop',
    planned: true,
  },
];

function destinationForEventType(eventType) {
  const t = String(eventType || '').toLowerCase();
  for (const dest of DESTINATIONS) {
    if (dest.planned) continue;
    for (const pattern of dest.eventPatterns) {
      const p = pattern.toLowerCase();
      if (t === p || t.startsWith(p) || t.includes(p)) return dest;
    }
  }
  return DESTINATIONS[0];
}

function plainLanguageEvent(eventType) {
  const map = {
    'patient.registered': 'Patient registered',
    'patient.nupi.resolved': 'NUPI resolved',
    'patient.nupi.registered': 'NUPI registered',
    'encounter.closed': 'Encounter closed',
    'observation.lab.final': 'Lab result finalised',
    'hl7.oru.sandbox': 'HL7 ORU^R01 (sandbox)',
    'epresc.internal': 'Internal e-prescription handoff',
    'claim.ready': 'Claim ready',
    'sha.claim.submitted': 'SHA claim submitted',
    'fhir.Patient': 'FHIR Patient published',
    'fhir.Encounter': 'FHIR Encounter published',
    'fhir.Observation': 'FHIR Observation published',
    'idsr.alert': 'IDSR alert published',
    'dhis2.export': 'DHIS2 export packaged',
    'facility.mfl.synced': 'MFL facility synced',
    'cpoe.allied.order': 'Allied health CPOE order created',
    'cpoe.allied.completed': 'Allied health CPOE order completed',
    'hie.inbound.received': 'HIE inbound message received (sandbox)',
  };
  return map[eventType] || String(eventType || 'Exchange event').replace(/\./g, ' · ');
}

function modeHealth(mode, baseUrlConfigured, extras = {}) {
  if (mode === 'disabled') {
    return { mode: 'disabled', health: 'not_configured', label: 'Disabled' };
  }
  if (mode === 'planned') {
    return { mode: 'planned', health: 'planned', label: 'Planned' };
  }
  if (!baseUrlConfigured && mode === 'live') {
    return { mode: mode || 'sandbox', health: 'degraded', label: 'Live (endpoint missing)' };
  }
  if (extras.failedCount > 0) {
    return { mode: mode || 'sandbox', health: 'degraded', label: mode === 'live' ? 'Live · errors' : 'Sandbox · errors' };
  }
  if (baseUrlConfigured || mode === 'sandbox') {
    return {
      mode: mode || 'sandbox',
      health: 'connected',
      label: mode === 'live' ? 'Live' : 'Sandbox',
    };
  }
  return { mode: mode || 'sandbox', health: 'configured', label: 'Configured' };
}

/**
 * GET /api/integrations/data-exchange/overview
 */
router.get('/data-exchange/overview', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const destinationFilter = req.query.destination ? String(req.query.destination) : null;
    const statusFilter = req.query.status ? String(req.query.status) : null;

    // Settings from existing tables (tolerate missing columns/tables)
    let registry = {};
    let fhir = {};
    let phase4 = {};
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
      );
      registry = rows[0] || {};
    } catch {
      registry = {};
    }

    const crMode = registry.clientRegistryMode || 'sandbox';
    const frMode = registry.facilityRegistryMode || 'sandbox';
    const fhirMode = registry.fhirMode || 'sandbox';
    const idsrMode = registry.idsrMode || 'sandbox';
    const dhis2Mode = registry.dhis2Mode || 'sandbox';
    const shaMode = registry.shaMode || 'sandbox';

    // Outbox events
    let outboxRows = [];
    let outboxCounts = {};
    let outboxEventTypes = {};
    try {
      const params = [];
      let where = 'WHERE 1=1';
      if (statusFilter) {
        where += ' AND status = ?';
        params.push(statusFilter);
      }
      const [rows] = await pool.execute(
        `SELECT outboxId, eventType, aggregateType, aggregateId, status, attempts, lastError, createdAt, publishedAt
         FROM integration_outbox
         ${where}
         ORDER BY outboxId DESC
         LIMIT ${limit * 3}`,
        params
      );
      outboxRows = rows || [];
      const [counts] = await pool.execute(
        `SELECT status, COUNT(*) AS c FROM integration_outbox GROUP BY status`
      );
      outboxCounts = Object.fromEntries((counts || []).map((r) => [r.status, Number(r.c)]));
      const [byType] = await pool.execute(
        `SELECT eventType, COUNT(*) AS c FROM integration_outbox GROUP BY eventType ORDER BY c DESC LIMIT 40`
      );
      outboxEventTypes = Object.fromEntries((byType || []).map((r) => [r.eventType, Number(r.c)]));
    } catch {
      outboxRows = [];
    }

    // Partner-specific recent logs (best-effort)
    const partnerTx = [];
    try {
      const [fhirLogs] = await pool.execute(
        `SELECT exportId AS id, resourceType, status, createdAt, publishedAt, externalRef, errorMessage
         FROM fhir_export_log ORDER BY exportId DESC LIMIT 20`
      );
      for (const row of fhirLogs || []) {
        partnerTx.push({
          source: 'fhir_export_log',
          transmissionId: `fhir-${row.id}`,
          destinationId: 'fhir',
          destinationName: 'FHIR clinical exchange',
          eventType: `fhir.${row.resourceType || 'Resource'}`,
          label: plainLanguageEvent(`fhir.${row.resourceType || 'Resource'}`),
          status: row.status === 'published' ? 'published' : row.status || 'pending',
          aggregateType: row.resourceType,
          aggregateId: String(row.id),
          externalRef: row.externalRef || null,
          lastError: row.errorMessage || null,
          createdAt: row.createdAt,
          publishedAt: row.publishedAt,
        });
      }
    } catch {
      /* table may not exist */
    }
    try {
      const [dhis] = await pool.execute(
        `SELECT exportId AS id, period, status, createdAt, completedAt, errorMessage
         FROM dhis2_export_log ORDER BY exportId DESC LIMIT 15`
      );
      for (const row of dhis || []) {
        partnerTx.push({
          source: 'dhis2_export_log',
          transmissionId: `dhis2-${row.id}`,
          destinationId: 'dhis2',
          destinationName: 'DHIS2 / KHIS reporting',
          eventType: 'dhis2.export',
          label: `DHIS2 export ${row.period || ''}`.trim(),
          status: row.status || 'pending',
          aggregateType: 'period',
          aggregateId: String(row.period || row.id),
          externalRef: null,
          lastError: row.errorMessage || null,
          createdAt: row.createdAt,
          publishedAt: row.completedAt || null,
        });
      }
    } catch {
      /* ignore */
    }
    try {
      const [idsr] = await pool.execute(
        `SELECT alertId AS id, conditionName, status, createdAt, publishedAt, errorMessage
         FROM idsr_alerts ORDER BY alertId DESC LIMIT 15`
      );
      for (const row of idsr || []) {
        partnerTx.push({
          source: 'idsr_alerts',
          transmissionId: `idsr-${row.id}`,
          destinationId: 'idsr',
          destinationName: 'IDSR disease surveillance',
          eventType: 'idsr.alert',
          label: `IDSR: ${row.conditionName || 'Alert'}`,
          status: row.status || 'pending',
          aggregateType: 'alert',
          aggregateId: String(row.id),
          externalRef: null,
          lastError: row.errorMessage || null,
          createdAt: row.createdAt,
          publishedAt: row.publishedAt || null,
        });
      }
    } catch {
      /* ignore */
    }
    try {
      const [sha] = await pool.execute(
        `SELECT submissionId AS id, claimId, status, createdAt, submittedAt, externalReference, errorMessage
         FROM sha_claim_submissions ORDER BY submissionId DESC LIMIT 15`
      );
      for (const row of sha || []) {
        partnerTx.push({
          source: 'sha_claim_submissions',
          transmissionId: `sha-${row.id}`,
          destinationId: 'sha',
          destinationName: 'SHA claims',
          eventType: 'sha.claim.submitted',
          label: `SHA claim #${row.claimId || row.id}`,
          status: row.status || 'pending',
          aggregateType: 'claim',
          aggregateId: String(row.claimId || row.id),
          externalRef: row.externalReference || null,
          lastError: row.errorMessage || null,
          createdAt: row.createdAt,
          publishedAt: row.submittedAt || null,
        });
      }
    } catch {
      /* ignore */
    }

    const outboxTx = outboxRows.map((row) => {
      const dest = destinationForEventType(row.eventType);
      return {
        source: 'integration_outbox',
        transmissionId: `outbox-${row.outboxId}`,
        outboxId: row.outboxId,
        destinationId: dest.id,
        destinationName: dest.name,
        eventType: row.eventType,
        label: plainLanguageEvent(row.eventType),
        status: row.status,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        externalRef: null,
        lastError: row.lastError || null,
        attempts: row.attempts,
        createdAt: row.createdAt,
        publishedAt: row.publishedAt,
      };
    });

    let transmissions = [...outboxTx, ...partnerTx].sort((a, b) => {
      const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });

    if (destinationFilter && destinationFilter !== 'all') {
      transmissions = transmissions.filter((t) => t.destinationId === destinationFilter);
    }
    transmissions = transmissions.slice(0, limit);

    // Per-destination stats from outbox
    const destStats = {};
    for (const dest of DESTINATIONS) {
      destStats[dest.id] = { total: 0, published: 0, failed: 0, pending: 0, lastSuccessAt: null };
    }
    for (const row of outboxRows) {
      const dest = destinationForEventType(row.eventType);
      const s = destStats[dest.id];
      s.total += 1;
      if (row.status === 'published') {
        s.published += 1;
        const at = row.publishedAt || row.createdAt;
        if (at && (!s.lastSuccessAt || new Date(at) > new Date(s.lastSuccessAt))) {
          s.lastSuccessAt = at;
        }
      } else if (row.status === 'failed') s.failed += 1;
      else if (row.status === 'pending') s.pending += 1;
    }
    for (const tx of partnerTx) {
      const s = destStats[tx.destinationId] || (destStats[tx.destinationId] = {
        total: 0, published: 0, failed: 0, pending: 0, lastSuccessAt: null,
      });
      s.total += 1;
      if (['published', 'submitted', 'accepted', 'success', 'completed'].includes(String(tx.status).toLowerCase())) {
        s.published += 1;
        if (tx.publishedAt && (!s.lastSuccessAt || new Date(tx.publishedAt) > new Date(s.lastSuccessAt))) {
          s.lastSuccessAt = tx.publishedAt;
        }
      } else if (['failed', 'rejected', 'error'].includes(String(tx.status).toLowerCase())) {
        s.failed += 1;
      } else {
        s.pending += 1;
      }
    }

    const destinations = DESTINATIONS.map((dest) => {
      const stats = destStats[dest.id] || { total: 0, published: 0, failed: 0, pending: 0, lastSuccessAt: null };
      let mode = 'sandbox';
      let baseUrlConfigured = false;
      let extra = {};

      if (dest.planned) {
        mode = 'planned';
      } else if (dest.id === 'client-registry') {
        mode = crMode;
        baseUrlConfigured = Boolean(process.env.CLIENT_REGISTRY_BASE_URL || registry.clientRegistryBaseUrl);
      } else if (dest.id === 'facility-registry') {
        mode = frMode;
        baseUrlConfigured = Boolean(process.env.FACILITY_REGISTRY_BASE_URL || registry.facilityRegistryBaseUrl);
      } else if (dest.id === 'fhir') {
        mode = fhirMode;
        baseUrlConfigured = Boolean(process.env.FHIR_BASE_URL || registry.fhirBaseUrl);
      } else if (dest.id === 'hl7') {
        mode = 'sandbox';
        baseUrlConfigured = true;
      } else if (dest.id === 'dhis2') {
        mode = dhis2Mode;
        baseUrlConfigured = Boolean(process.env.DHIS2_BASE_URL || registry.dhis2BaseUrl);
      } else if (dest.id === 'idsr') {
        mode = idsrMode;
        baseUrlConfigured = Boolean(process.env.IDSR_BASE_URL || registry.idsrBaseUrl);
      } else if (dest.id === 'sha') {
        mode = shaMode;
        baseUrlConfigured = Boolean(process.env.SHA_BASE_URL || registry.shaBaseUrl);
      } else if (dest.id === 'event-bus') {
        mode = process.env.RABBITMQ_URL ? 'live' : 'sandbox';
        baseUrlConfigured = Boolean(process.env.RABBITMQ_URL);
      }

      const healthInfo = dest.planned
        ? { mode: 'planned', health: 'planned', label: 'Planned — not connected yet' }
        : modeHealth(mode, baseUrlConfigured, { failedCount: stats.failed });

      return {
        ...dest,
        mode: healthInfo.mode,
        health: healthInfo.health,
        statusLabel: healthInfo.label,
        baseUrlConfigured,
        stats,
        configurePath: `/administration?tab=system#${dest.configureHash}`,
      };
    });

    res.json({
      generatedAt: new Date().toISOString(),
      rabbitmqConfigured: Boolean(process.env.RABBITMQ_URL),
      outboxCounts,
      outboxEventTypes,
      destinations,
      transmissions,
      flow: {
        steps: [
          { id: 'facility', title: 'This facility', detail: 'Registration, clinical, lab, pharmacy, billing' },
          { id: 'outbox', title: 'Secure outbox', detail: 'Events queued in integration_outbox' },
          { id: 'bus', title: 'Event bus', detail: 'RabbitMQ hmis.events (when configured)' },
          { id: 'partners', title: 'National / county partners', detail: 'NUPI, MFL, FHIR, DHIS2, IDSR, SHA, NASCOP…' },
        ],
      },
    });
  } catch (err) {
    console.error('data-exchange overview:', err);
    res.status(500).json({ message: 'Failed to load data exchange overview', error: err.message });
  }
});

module.exports = router;
