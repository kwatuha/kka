/**
 * Portal correction guide — aligned with docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md
 */
const { DHA_APPLICATION_ID, PRODUCT_NAME } = require('./productBrand');

const PORTAL_ATTESTATION_CORRECTIONS = [
  {
    id: 'unique-user-id',
    section: 'must_fix',
    field: 'Unique User Identification',
    recommended: 'Implemented',
    evidenceCodes: ['SEC-AUTH', 'SEC-2FA'],
    doc: 'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
  },
  {
    id: 'backup-tested',
    section: 'must_fix',
    field: 'Backup Plan Tested',
    recommended: 'Yes — date 2026-09-29',
    evidenceCodes: ['OPS-BACKUP'],
    doc: 'docs/DHA_BACKUP_RECOVERY_TEST_LOG.md',
  },
  {
    id: 'digital-health-id',
    section: 'must_fix',
    field: 'Digital Health ID',
    recommended: 'Partial',
    evidenceCodes: ['INT-CR', 'INT-MFL'],
    doc: 'docs/DHA_PHASE9_SANDBOX_PREP.md',
  },
  {
    id: 'hie-transmit',
    section: 'must_fix',
    field: 'Kenya HIE – Can Transmit Data',
    recommended: 'Partial until live smoke',
    evidenceCodes: ['INT-FHIR', 'INT-COMPOSITION', 'INT-LIVE-READY'],
    doc: 'docs/DHA_PHASE9_SANDBOX_PREP.md',
  },
  {
    id: 'patient-facing',
    section: 'must_fix',
    field: 'Patient-facing services',
    recommended: 'Partial',
    evidenceCodes: ['PAT-BOOK-STATUS', 'PRI-NOTICE-WEB', 'PRI-DATAPORT'],
    doc: 'docs/DHA_DEMO_SCRIPT.md',
  },
  {
    id: 'hpt',
    section: 'downgrade',
    field: 'HPT registry / HPT allergy national sync',
    recommended: 'Partial',
    evidenceCodes: ['INT-HPT-SBX', 'CLN-HPT-RX'],
    doc: 'docs/DHA_PARALLEL_TRACK.md',
  },
  {
    id: 'cds-full',
    section: 'downgrade',
    field: 'Full clinical decision support',
    recommended: 'Partial (baseline rules only)',
    evidenceCodes: [
      'CLN-CDS',
      'CLN-CDS-DOC',
      'CLN-CDS-LAB',
      'CLN-CDS-RAD',
      'CLN-CDS-TRIAGE',
      'CLN-CDS-CHART',
    ],
    doc: 'docs/DHA_CDS_RULESET.md',
  },
  {
    id: 'care-plan-hie',
    section: 'downgrade',
    field: 'Clinical summary includes care plan',
    recommended: 'Partial (FHIR CarePlan in bundle)',
    evidenceCodes: ['CLN-CAREPLAN', 'CLN-CAREPLAN-FHIR', 'INT-COMPOSITION'],
    doc: 'docs/DHA_DEMO_SCRIPT.md',
  },
  {
    id: 'cqm-submit',
    section: 'downgrade',
    field: 'CQM electronic submission',
    recommended: 'No / export only',
    evidenceCodes: ['RPT-CQM-START', 'RPT-CQM-EXPAND', 'RPT-CQM-PNC'],
    doc: 'docs/DHA_DEMO_SCRIPT.md',
  },
  {
    id: 'idsr-realtime',
    section: 'downgrade',
    field: 'Real-time national IDSR',
    recommended: 'Partial',
    evidenceCodes: [
      'REP-IDSR',
      'REP-IDSR-WEEK',
      'REP-IDSR-NOTIFY',
      'REP-IDSR-AMEND',
      'REP-IDSR-SMS',
      'REP-IDSR-EMAIL',
      'REP-IHR-AUTO',
    ],
    doc: 'docs/DHA_OPS_CRON_RUNBOOK.md',
  },
  {
    id: 'kenhdd-registration',
    section: 'downgrade',
    field: 'KENHDD demographics at registration',
    recommended: 'Partial',
    evidenceCodes: ['INT-KENHDD-VAL', 'REG-DESK-FULL'],
    doc: 'docs/DHA_KENHDD_FIELD_MAPPING.md',
  },
  {
    id: 'epresc-national',
    section: 'downgrade',
    field: 'National e-prescribing',
    recommended: 'Partial',
    evidenceCodes: ['INT-EPRESC-INT', 'CLN-CDS-HPT'],
    doc: 'docs/DHA_PARALLEL_TRACK.md',
  },
];

async function buildPortalCorrectionsReport(pool) {
  const codes = [...new Set(PORTAL_ATTESTATION_CORRECTIONS.flatMap((c) => c.evidenceCodes))];
  let evidenceByCode = {};
  if (codes.length) {
    const [rows] = await pool.execute(
      `SELECT i.code, COALESCE(r.status, 'not_started') AS status, r.evidenceUrl, r.notes
       FROM dha_evidence_items i
       LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
       WHERE i.code IN (${codes.map(() => '?').join(',')})`,
      codes
    );
    evidenceByCode = Object.fromEntries(rows.map((r) => [r.code, r]));
  }

  const rows = PORTAL_ATTESTATION_CORRECTIONS.map((row) => ({
    ...row,
    evidence: row.evidenceCodes.map((code) => ({
      code,
      status: evidenceByCode[code]?.status || 'not_started',
      evidenceUrl: evidenceByCode[code]?.evidenceUrl || null,
    })),
  }));

  const metLinked = rows.filter((r) =>
    r.evidence.some((e) => e.status === 'met' || e.status === 'partial')
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    applicationId: DHA_APPLICATION_ID,
    productName: PRODUCT_NAME,
    corrections: rows,
    summary: {
      totalFields: rows.length,
      withEvidenceProgress: metLinked,
    },
    attachDocs: [
      'docs/DHA_ATTESTATION_CLARIFICATION_LETTER.md',
      'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
    ],
  };
}

module.exports = {
  PORTAL_ATTESTATION_CORRECTIONS,
  buildPortalCorrectionsReport,
};
