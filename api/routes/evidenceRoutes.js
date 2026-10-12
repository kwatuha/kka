/**
 * Phase 5 — DHA evidence pack / attestation API
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const {
  EVIDENCE_EXPORT_PRODUCT,
  DHA_APPLICATION_ID,
  DHA_ORGANISATION,
  PRODUCT_NAME,
} = require('../lib/productBrand');
const { buildPortalCorrectionsReport } = require('../lib/portalAttestationGuide');
const { getDhaSandboxSmoke } = require('../lib/dhaSandboxSmoke');
const { listHieSmokeLogs, createHieSmokeLog } = require('../lib/hieSmokeLog');
const { auditFromRequest } = require('../lib/auditLog');
const { IMPLEMENTED_EVIDENCE_CODES } = require('../lib/dhaEvidenceCodes');
const { syncEvidenceChecklistAttestation } = require('../lib/dhaEvidenceSync');
const { syncMessagingEvidenceNotes } = require('../lib/dhaMessagingEvidenceSync');
const { getAttestationReadiness } = require('../lib/dhaAttestationReadiness');
const {
  getDhaRegistrationProfile,
  buildClarificationLetterMarkdown,
} = require('../lib/dhaRegistrationProfile');

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

/**
 * GET /api/integrations/evidence/checklist
 */
router.get('/evidence/checklist', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.itemId, i.domain, i.code, i.title, i.description, i.evidencePath, i.demoStep, i.sortOrder,
              COALESCE(r.status, 'not_started') AS status,
              r.notes, r.evidenceUrl, r.attestedAt, r.attestedBy
       FROM dha_evidence_items i
       LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
       WHERE i.isActive = 1
       ORDER BY i.sortOrder ASC, i.itemId ASC`
    );

    const byDomain = {};
    for (const row of rows) {
      if (!byDomain[row.domain]) byDomain[row.domain] = [];
      byDomain[row.domain].push(row);
    }

    const summary = {
      total: rows.length,
      met: rows.filter((r) => r.status === 'met').length,
      partial: rows.filter((r) => r.status === 'partial').length,
      in_progress: rows.filter((r) => r.status === 'in_progress').length,
      not_started: rows.filter((r) => r.status === 'not_started').length,
      not_applicable: rows.filter((r) => r.status === 'not_applicable').length,
    };

    res.json({
      summary,
      items: rows,
      byDomain,
      documents: [
        { title: 'Evidence pack index', path: 'docs/DHA_EVIDENCE_PACK.md' },
        { title: 'Self-attestation', path: 'docs/DHA_SELF_ATTESTATION.md' },
        { title: 'Encryption controls', path: 'docs/DHA_ENCRYPTION_CONTROLS.md' },
        { title: 'Incident & breach', path: 'docs/DHA_INCIDENT_BREACH_RESPONSE.md' },
        { title: 'Emergency access', path: 'docs/DHA_EMERGENCY_ACCESS_PROCEDURES.md' },
        { title: 'Privacy policy', path: 'docs/DHA_PRIVACY_POLICY.md' },
        { title: 'Architecture', path: 'docs/DHA_ARCHITECTURE.md' },
        { title: 'Demo script', path: 'docs/DHA_DEMO_SCRIPT.md' },
        { title: 'Sandbox / field env', path: 'docs/DHA_SANDBOX_TEST_ENV.md' },
        { title: 'Backup runbook', path: 'docs/BACKUP_RESTORE_RUNBOOK.md' },
        { title: 'Backup/recovery test log', path: 'docs/DHA_BACKUP_RECOVERY_TEST_LOG.md' },
        { title: 'Portal attestation corrections', path: 'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md' },
        { title: 'Assessor clarification letter', path: 'docs/DHA_ATTESTATION_CLARIFICATION_LETTER.md' },
        { title: 'Field app scope', path: 'docs/DHA_FIELD_APP_SCOPE.md' },
        { title: 'Ops cron runbook', path: 'docs/DHA_OPS_CRON_RUNBOOK.md' },
        { title: 'Re-attestation checklist', path: 'docs/DHA_REATTESTATION_CHECKLIST.md' },
        { title: 'CDS rule set', path: 'docs/DHA_CDS_RULESET.md' },
        { title: 'Internal alignment (portal vs code)', path: 'docs/DHA_INTERNAL_ALIGNMENT.md' },
        { title: 'Attestation gap analysis (internal)', path: 'docs/DHA_AZIMKIM_ATTESTATION_GAP_ANALYSIS.md' },
        { title: 'Encryption evidence checklist (screenshots)', path: 'docs/DHA_ENCRYPTION_EVIDENCE_CHECKLIST.md' },
        { title: 'Interim security hardening (pre–pentest)', path: 'docs/DHA_INTERIM_SECURITY_HARDENING.md' },
        { title: 'Pre–live HIE compliance review', path: 'docs/DHA_PRE_HIE_COMPLIANCE_REVIEW.md' },
        { title: 'Portal mandatory uploads (mapping)', path: 'docs/DHA_PORTAL_MANDATORY_UPLOADS.md' },
        { title: 'Access control policy', path: 'docs/DHA_ACCESS_CONTROL_POLICY.md' },
        { title: 'Data retention policy', path: 'docs/DHA_DATA_RETENTION_POLICY.md' },
      ],
    });
  } catch (err) {
    console.error('evidence checklist:', err);
    res.status(500).json({ message: 'Failed to load evidence checklist', error: err.message });
  }
});

/**
 * GET /api/integrations/evidence/portal-corrections
 * Portal attestation field guide + linked evidence status (Phase 6.4).
 */
router.get('/evidence/portal-corrections', async (_req, res) => {
  try {
    const report = await buildPortalCorrectionsReport(pool);
    res.json(report);
  } catch (err) {
    console.error('evidence portal-corrections:', err);
    res.status(500).json({ message: 'Failed to load portal corrections', error: err.message });
  }
});

/**
 * PUT /api/integrations/evidence/items/:id
 * Body: { status, notes?, evidenceUrl? }
 */
router.put('/evidence/items/:id', async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { status, notes, evidenceUrl } = req.body || {};
    const allowed = ['not_started', 'in_progress', 'met', 'partial', 'not_applicable'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${allowed.join(', ')}` });
    }

    const userId = getUserId(req);
    await pool.execute(
      `INSERT INTO dha_attestation_responses (itemId, status, notes, evidenceUrl, attestedBy, attestedAt)
       VALUES (?, ?, ?, ?, ?, ${status === 'met' || status === 'partial' ? 'NOW()' : 'NULL'})
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         notes = VALUES(notes),
         evidenceUrl = VALUES(evidenceUrl),
         attestedBy = VALUES(attestedBy),
         attestedAt = ${status === 'met' || status === 'partial' ? 'NOW()' : 'attestedAt'}`,
      [itemId, status, notes || null, evidenceUrl || null, userId]
    );

    const [rows] = await pool.execute(
      `SELECT i.*, r.status, r.notes, r.evidenceUrl, r.attestedAt, r.attestedBy
       FROM dha_evidence_items i
       LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
       WHERE i.itemId = ?`,
      [itemId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    console.error('evidence update:', err);
    res.status(500).json({ message: 'Failed to update evidence item', error: err.message });
  }
});

/**
 * POST /api/integrations/evidence/mark-implemented
 * Sync checklist: met for delivered features, partial for sandbox/national/host gaps.
 */
router.post('/evidence/mark-implemented', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (Array.isArray(req.body?.codes) && req.body.codes.length) {
      const codes = req.body.codes;
      const [result] = await pool.execute(
        `UPDATE dha_attestation_responses r
         INNER JOIN dha_evidence_items i ON i.itemId = r.itemId
         SET r.status = 'met', r.attestedBy = ?, r.attestedAt = NOW(),
             r.notes = COALESCE(r.notes, 'Marked met (manual code list)')
         WHERE i.isActive = 1 AND i.code IN (${codes.map(() => '?').join(',')})`,
        [userId, ...codes]
      );
      return res.json({ message: 'Evidence items marked met', affected: result.affectedRows || 0 });
    }
    const result = await syncEvidenceChecklistAttestation(pool, userId);
    const messaging = await syncMessagingEvidenceNotes(pool, userId);
    res.json({
      message: 'Evidence checklist synced (met + partial)',
      ...result,
      messagingEvidence: messaging,
      affected: (result.markedMet || 0) + (result.markedPartial || 0),
    });
  } catch (err) {
    console.error('evidence mark:', err);
    res.status(500).json({ message: 'Failed to mark evidence', error: err.message });
  }
});

/**
 * GET /api/integrations/evidence/export
 * Assessor annex JSON
 */
router.get('/evidence/export', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.domain, i.code, i.title, i.description, i.evidencePath, i.demoStep,
              COALESCE(r.status, 'not_started') AS status, r.notes, r.evidenceUrl, r.attestedAt
       FROM dha_evidence_items i
       LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
       WHERE i.isActive = 1
       ORDER BY i.sortOrder`
    );
    const summary = {
      total: rows.length,
      met: rows.filter((r) => r.status === 'met').length,
      partial: rows.filter((r) => r.status === 'partial').length,
    };
    const {
      DHA_DOCUMENTED_UI,
      DHA_DOCUMENTED_API,
      LEGACY_COUNTY_UI,
    } = require('../lib/publicAppUrl');
    const portalCorrections = await buildPortalCorrectionsReport(pool);
    const attestationReadiness = await getAttestationReadiness(pool);
    const pack = {
      product: EVIDENCE_EXPORT_PRODUCT,
      productName: PRODUCT_NAME,
      dhaApplicationId: DHA_APPLICATION_ID,
      organisation: DHA_ORGANISATION,
      framework: 'Kenya Digital Health Certification Framework',
      exportedAt: new Date().toISOString(),
      ui: DHA_DOCUMENTED_UI,
      uiCountyAlternate: LEGACY_COUNTY_UI,
      api: DHA_DOCUMENTED_API,
      summary,
      items: rows,
      portalCorrections,
      attestationReadiness,
      registrationProfileEndpoint: '/api/integrations/evidence/registration-profile',
      documentIndex: [
        'docs/DHA_EVIDENCE_PACK.md',
        'docs/DHA_SELF_ATTESTATION.md',
        'docs/DHA_ENCRYPTION_CONTROLS.md',
        'docs/DHA_INCIDENT_BREACH_RESPONSE.md',
        'docs/DHA_EMERGENCY_ACCESS_PROCEDURES.md',
        'docs/DHA_PRIVACY_POLICY.md',
        'docs/DHA_ARCHITECTURE.md',
        'docs/DHA_DEMO_SCRIPT.md',
        'docs/DHA_SANDBOX_TEST_ENV.md',
        'docs/BACKUP_RESTORE_RUNBOOK.md',
        'docs/DHA_BACKUP_RECOVERY_TEST_LOG.md',
        'docs/DHA_CERTIFICATION_ROADMAP.md',
        'docs/DHA_KENHDD_FIELD_MAPPING.md',
        'docs/DHA_ATTESTATION_CLARIFICATION_LETTER.md',
        'docs/DHA_FIELD_APP_SCOPE.md',
        'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
        'docs/DHA_INTERNAL_ALIGNMENT.md',
        'docs/DHA_AZIMKIM_ATTESTATION_GAP_ANALYSIS.md',
        'docs/DHA_ENCRYPTION_EVIDENCE_CHECKLIST.md',
        'docs/DHA_PRE_HIE_COMPLIANCE_REVIEW.md',
        'docs/DHA_PORTAL_MANDATORY_UPLOADS.md',
        'docs/DHA_ACCESS_CONTROL_POLICY.md',
        'docs/DHA_DATA_RETENTION_POLICY.md',
      ],
    };
    res.setHeader('Content-Disposition', 'attachment; filename="dha-evidence-pack.json"');
    res.json(pack);
  } catch (err) {
    console.error('evidence export:', err);
    res.status(500).json({ message: 'Failed to export evidence pack', error: err.message });
  }
});

/**
 * GET /api/integrations/evidence/documents/:name
 * Serve allowlisted markdown docs for in-app reading (no path traversal).
 */
/**
 * GET /api/integrations/evidence/sandbox-smoke
 */
router.get('/evidence/attestation-readiness', async (_req, res) => {
  try {
    res.json(await getAttestationReadiness(pool));
  } catch (err) {
    console.error('evidence attestation-readiness:', err);
    res.status(500).json({ message: 'Failed to load attestation readiness', error: err.message });
  }
});

router.get('/evidence/attestation-product-matrix', async (_req, res) => {
  try {
    const { getAttestationProductMatrix } = require('../lib/attestationProductMatrix');
    res.json(getAttestationProductMatrix());
  } catch (err) {
    console.error('evidence attestation-product-matrix:', err);
    res.status(500).json({ message: 'Failed to load product matrix', error: err.message });
  }
});

router.get('/evidence/registration-profile', async (_req, res) => {
  try {
    const profile = await getDhaRegistrationProfile(pool);
    res.setHeader('Content-Disposition', 'attachment; filename="dha-registration-profile.json"');
    res.json(profile);
  } catch (err) {
    console.error('evidence registration-profile:', err);
    res.status(500).json({ message: 'Failed to build registration profile', error: err.message });
  }
});

router.get('/evidence/clarification-letter', async (_req, res) => {
  try {
    const content = await buildClarificationLetterMarkdown(pool);
    const format = String(_req.query.format || 'markdown').toLowerCase();
    if (format === 'json') {
      return res.json({ content, generatedAt: new Date().toISOString() });
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="DHA_ATTESTATION_CLARIFICATION_LETTER.generated.md"'
    );
    res.send(content);
  } catch (err) {
    console.error('evidence clarification-letter:', err);
    res.status(500).json({ message: 'Failed to build clarification letter', error: err.message });
  }
});

router.get('/evidence/sandbox-smoke', async (_req, res) => {
  try {
    res.json(await getDhaSandboxSmoke());
  } catch (err) {
    console.error('evidence sandbox-smoke:', err);
    res.status(500).json({ message: 'Sandbox smoke check failed', error: err.message });
  }
});

router.get('/evidence/hie-smoke-log', async (req, res) => {
  try {
    const logs = await listHieSmokeLogs(req.query.limit);
    res.json({ logs });
  } catch (err) {
    console.error('evidence hie-smoke-log list:', err);
    res.status(500).json({ message: 'Failed to load HIE smoke log', error: err.message });
  }
});

router.post('/evidence/hie-smoke-log', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { passed, notes, testLabel, stepsPerformed } = req.body || {};
    if (passed === undefined || passed === null) {
      return res.status(400).json({ message: 'passed (boolean) is required' });
    }
    const result = await createHieSmokeLog(pool, {
      userId,
      passed: Boolean(passed),
      notes,
      testLabel,
      stepsPerformed,
    });
    await auditFromRequest(req, {
      action: 'HIE_SMOKE_LOG',
      resourceType: 'hie_smoke_log',
      resourceId: String(result.logId),
      summary: result.evidenceSummary,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('evidence hie-smoke-log create:', err);
    res.status(500).json({ message: 'Failed to record HIE smoke test', error: err.message });
  }
});

router.get('/evidence/documents/:name', async (req, res) => {
  try {
    const allow = new Set([
      'DHA_EVIDENCE_PACK.md',
      'DHA_SELF_ATTESTATION.md',
      'DHA_ENCRYPTION_CONTROLS.md',
      'DHA_INCIDENT_BREACH_RESPONSE.md',
      'DHA_EMERGENCY_ACCESS_PROCEDURES.md',
      'DHA_PRIVACY_POLICY.md',
      'DHA_ARCHITECTURE.md',
      'DHA_DEMO_SCRIPT.md',
      'DHA_SANDBOX_TEST_ENV.md',
      'BACKUP_RESTORE_RUNBOOK.md',
      'DHA_BACKUP_RECOVERY_TEST_LOG.md',
      'DHA_CERTIFICATION_ROADMAP.md',
      'DHA_PHASE9_SANDBOX_PREP.md',
      'DHA_PARALLEL_TRACK.md',
      'DHA_GAP_REMEDIATION_PHASES.md',
      'DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
      'DHA_ENCRYPTION_EVIDENCE_CHECKLIST.md',
      'DHA_KENHDD_FIELD_MAPPING.md',
      'DHA_ATTESTATION_CLARIFICATION_LETTER.md',
      'DHA_FIELD_APP_SCOPE.md',
      'DHA_OPS_CRON_RUNBOOK.md',
      'DHA_REATTESTATION_CHECKLIST.md',
      'DHA_CDS_RULESET.md',
      'DHA_INTERNAL_ALIGNMENT.md',
      'DHA_AZIMKIM_ATTESTATION_GAP_ANALYSIS.md',
      'DHA_INTERIM_SECURITY_HARDENING.md',
      'DHA_PRE_HIE_COMPLIANCE_REVIEW.md',
      'DHA_PORTAL_MANDATORY_UPLOADS.md',
      'DHA_ACCESS_CONTROL_POLICY.md',
      'DHA_DATA_RETENTION_POLICY.md',
    ]);
    const name = String(req.params.name || '');
    if (!allow.has(name)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    const candidates = [
      path.join(__dirname, '../docs', name),
      path.join(process.cwd(), 'docs', name),
    ];
    let content = null;
    let used = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        content = fs.readFileSync(p, 'utf8');
        used = p;
        break;
      }
    }
    if (content == null) {
      return res.status(404).json({
        message: 'Document file not present in API image — see git docs/ folder',
        name,
      });
    }
    res.json({ name, path: used, content });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
