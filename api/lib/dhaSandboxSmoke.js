/**
 * Automated sandbox readiness (no live HIE credentials required).
 */
const pool = require('../config/db');

async function tableCount(db, sql, params = []) {
  try {
    const [rows] = await db.execute(sql, params);
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

async function getDhaSandboxSmoke() {
  const checks = [];

  const evidenceCount = await tableCount(
    pool,
    'SELECT COUNT(*) AS c FROM dha_evidence_items WHERE isActive = 1'
  );
  checks.push({
    id: 'evidence_catalog',
    label: 'DHA evidence catalog loaded',
    ready: evidenceCount != null && evidenceCount >= 40,
    detail: evidenceCount != null ? `${evidenceCount} active items` : 'table missing',
  });

  const idsrCatalog = await tableCount(
    pool,
    'SELECT COUNT(*) AS c FROM idsr_disease_catalog WHERE isActive = 1'
  );
  checks.push({
    id: 'idsr_catalog',
    label: 'IDSR notifiable disease catalog',
    ready: idsrCatalog != null && idsrCatalog > 0,
    detail: idsrCatalog != null ? `${idsrCatalog} diseases` : 'table missing',
  });

  const fhirExports = await tableCount(pool, 'SELECT COUNT(*) AS c FROM fhir_export_log');
  const outboxEvents = await tableCount(pool, 'SELECT COUNT(*) AS c FROM integration_outbox');
  const interopActivity = (fhirExports || 0) + (outboxEvents || 0);
  checks.push({
    id: 'sandbox_interop_activity',
    label: 'Sandbox FHIR export log or integration outbox activity',
    ready: interopActivity > 0,
    detail: `fhir_export_log=${fhirExports ?? '?'}, integration_outbox=${outboxEvents ?? '?'}`,
  });

  let registryOk = false;
  try {
    const [reg] = await pool.execute(
      'SELECT fhirMode, clientRegistryMode FROM integration_registry_settings WHERE settingId = 1 LIMIT 1'
    );
    registryOk = Boolean(reg[0]);
    checks.push({
      id: 'registry_settings',
      label: 'Integration registry settings row',
      ready: registryOk,
      detail: reg[0]
        ? `FHIR=${reg[0].fhirMode || 'sandbox'}, CR=${reg[0].clientRegistryMode || 'sandbox'}`
        : 'missing',
    });
  } catch {
    checks.push({
      id: 'registry_settings',
      label: 'Integration registry settings row',
      ready: false,
      detail: 'table missing',
    });
  }

  const idsrAlerts = await tableCount(pool, 'SELECT COUNT(*) AS c FROM idsr_alerts');
  checks.push({
    id: 'idsr_pipeline',
    label: 'IDSR alert pipeline reachable',
    ready: idsrAlerts != null,
    detail: idsrAlerts != null ? `${idsrAlerts} alerts recorded` : 'table missing',
  });

  try {
    const { getMessagingComplianceStatus } = require('./messagingCompliance');
    const msg = getMessagingComplianceStatus();
    checks.push({
      id: 'smtp_idsr_email',
      label: 'IDSR alert email path (SMTP + recipients)',
      ready: Boolean(msg.idsrAlertEmail?.deliverable),
      detail: msg.smtpConfigured
        ? `recipients=${msg.idsrAlertEmail?.recipientCount ?? 0}, deliverable=${msg.idsrAlertEmail?.deliverable}`
        : 'SMTP_HOST not set',
    });
  } catch {
    checks.push({
      id: 'smtp_idsr_email',
      label: 'IDSR alert email path (SMTP + recipients)',
      ready: false,
      detail: 'messaging check failed',
    });
  }

  const breakGlass = await tableCount(pool, 'SELECT COUNT(*) AS c FROM break_glass_access_log');
  checks.push({
    id: 'break_glass_log',
    label: 'Break-glass access log table',
    ready: breakGlass != null,
    detail: breakGlass != null ? `${breakGlass} events` : 'table missing',
  });

  const scored = checks.filter((c) => c.ready !== null);
  const passedCount = scored.filter((c) => c.ready).length;
  const passed = passedCount === scored.length;

  return {
    generatedAt: new Date().toISOString(),
    passed,
    passedCount,
    totalChecks: scored.length,
    checks,
    endpoints: [
      'GET /api/integrations/evidence/sandbox-smoke',
      'GET /api/integrations/fhir/live-readiness (includes sandbox E2E check)',
    ],
    runbookPath: 'docs/DHA_SANDBOX_TEST_ENV.md',
  };
}

module.exports = { getDhaSandboxSmoke };
