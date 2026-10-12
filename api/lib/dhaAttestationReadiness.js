/**
 * Attestation / software registration readiness (no live HIE required).
 */
const { IMPLEMENTED_EVIDENCE_CODES } = require('./dhaEvidenceCodes');
const { buildPortalCorrectionsReport } = require('./portalAttestationGuide');
const { getDhaSandboxSmoke } = require('./dhaSandboxSmoke');
const { getHieLiveReadiness } = require('./hieLiveReadiness');
const { getMessagingComplianceStatus } = require('./messagingCompliance');

const OPERATIONAL_BLOCKERS = [
  {
    id: 'live_hie',
    label: 'AfyaConnect / HIE live credentials and smoke test',
    category: 'external',
    doc: 'docs/DHA_PHASE9_SANDBOX_PREP.md',
  },
  {
    id: 'encryption_screenshots',
    label: 'Host encryption evidence (SEC-REST, SEC-BAKENC)',
    category: 'ops',
    doc: 'docs/DHA_ENCRYPTION_EVIDENCE_CHECKLIST.md',
  },
  {
    id: 'portal_signature',
    label: 'DHS portal digital signature on self-attestation',
    category: 'portal',
    doc: 'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
  },
  {
    id: 'portal_field_edits',
    label: 'Apply portal field corrections (Unique User ID, backup date, Partial flags)',
    category: 'portal',
    doc: 'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
  },
];

async function loadEvidenceStatuses(pool) {
  const [rows] = await pool.execute(
    `SELECT i.code, i.title, i.domain, COALESCE(r.status, 'not_started') AS status
     FROM dha_evidence_items i
     LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
     WHERE i.isActive = 1`
  );
  return rows;
}

function scoreEvidence(rows) {
  const total = rows.length;
  const met = rows.filter((r) => r.status === 'met').length;
  const partial = rows.filter((r) => r.status === 'partial').length;
  const implementedSet = new Set(IMPLEMENTED_EVIDENCE_CODES);
  const implementedRows = rows.filter((r) => implementedSet.has(r.code));
  const implementedMet = implementedRows.filter((r) => r.status === 'met' || r.status === 'partial').length;
  return {
    total,
    met,
    partial,
    notStarted: rows.filter((r) => r.status === 'not_started').length,
    implementedTotal: implementedRows.length,
    implementedMet,
    implementedCoveragePct: implementedRows.length
      ? Math.round((implementedMet / implementedRows.length) * 100)
      : 0,
    checklistPct: total ? Math.round((met / total) * 100) : 0,
  };
}

async function getAttestationReadiness(pool) {
  const evidenceRows = await loadEvidenceStatuses(pool);
  const scores = scoreEvidence(evidenceRows);
  const implementedSet = new Set(IMPLEMENTED_EVIDENCE_CODES);

  const implementedNotMarked = evidenceRows.filter(
    (r) => implementedSet.has(r.code) && r.status === 'not_started'
  );

  const portal = await buildPortalCorrectionsReport(pool);
  const portalWeak = (portal.corrections || []).filter((c) => {
    const codes = c.evidence || [];
    if (!codes.length) return c.section === 'must_fix';
    const weak = codes.every((e) => e.status === 'not_started' || e.status === 'in_progress');
    return weak;
  });

  let sandboxSmoke = null;
  let liveReadiness = null;
  let messaging = null;
  try {
    messaging = getMessagingComplianceStatus();
  } catch {
    /* ignore */
  }
  try {
    sandboxSmoke = await getDhaSandboxSmoke();
  } catch {
    /* ignore */
  }
  try {
    liveReadiness = await getHieLiveReadiness();
  } catch {
    /* ignore */
  }

  const productReady =
    scores.implementedCoveragePct >= 85 &&
    Boolean(sandboxSmoke?.passed) &&
    implementedNotMarked.length <= 5;

  return {
    generatedAt: new Date().toISOString(),
    scores,
    productReadyForAssessorDemo: productReady,
    implementedNotMarked: implementedNotMarked.map((r) => ({
      code: r.code,
      title: r.title,
      domain: r.domain,
    })),
    portalFieldsNeedingEvidence: portalWeak.map((c) => ({
      field: c.field,
      recommended: c.recommended,
      section: c.section,
    })),
    operationalBlockers: OPERATIONAL_BLOCKERS,
    messagingCompliance: messaging,
    preHieCompliance: {
      productSandboxReady: Boolean(sandboxSmoke?.passed),
      idsrEmailReady: Boolean(messaging?.idsrAlertEmail?.deliverable),
      liveHieBlocked: true,
      reviewDoc: 'docs/DHA_PRE_HIE_COMPLIANCE_REVIEW.md',
      portalUploadsDoc: 'docs/DHA_PORTAL_MANDATORY_UPLOADS.md',
    },
    sandboxSmoke: sandboxSmoke
      ? { passed: sandboxSmoke.passed, passedCount: sandboxSmoke.passedCount, totalChecks: sandboxSmoke.totalChecks }
      : null,
    liveHie: liveReadiness
      ? {
          readyCount: liveReadiness.readyCount,
          totalScored: liveReadiness.totalScored,
          modes: liveReadiness.modes,
          items: liveReadiness.items,
          runbookPath: liveReadiness.runbookPath,
          disclaimer: liveReadiness.disclaimer,
        }
      : null,
    recommendedActions: [
      implementedNotMarked.length
        ? 'Evidence pack → Mark implemented (auto list), then review SEC-REST / SEC-BAKENC manually.'
        : null,
      portalWeak.length ? 'Update DHS portal fields using Portal guide JSON export.' : null,
      'Export registration-profile.json and clarification letter for portal submission.',
      'Attach encryption screenshots and signed clarification letter PDF.',
      messaging?.idsrAlertEmail?.deliverable
        ? 'IDSR email path is configured — run IDSR evaluate (immediate) or SMTP test for assessor evidence.'
        : 'Configure SMTP_HOST + IDSR_ALERT_EMAIL for facility IDSR email alerts (REP-IDSR-EMAIL).',
      'Export portal mandatory docs per docs/DHA_PORTAL_MANDATORY_UPLOADS.md (corporate PDFs still offline).',
    ].filter(Boolean),
  };
}

module.exports = { getAttestationReadiness, OPERATIONAL_BLOCKERS };
