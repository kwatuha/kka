/**
 * Maps DHA self-attestation PDF claims to HMIS product reality (for assessors & internal gap closure).
 * Source PDF: docs/azimkim_attestation_report.pdf (DHS-1790683976496-C791HNX7L).
 */
const { PORTAL_ATTESTATION_CORRECTIONS } = require('./portalAttestationGuide');

/** @typedef {'full'|'partial'|'ops'|'external'|'portal_only'} ProductLevel */

const PDF_CLAIMS = [
  {
    id: 'demographics',
    pdfSection: 'Functionality',
    claim: 'Demographics capture (incl. ID types)',
    productLevel: 'full',
    demoPath: '/departments/registration',
    evidenceCodes: ['REG-DESK-FULL'],
  },
  {
    id: 'cpoe-core',
    pdfSection: 'Functionality',
    claim: 'CPOE — meds, lab, rad, billing, vitals, dispensing, family history',
    productLevel: 'full',
    demoPath: '/consultation',
    evidenceCodes: ['CLN-CPOE'],
  },
  {
    id: 'cpoe-allied',
    pdfSection: 'Functionality',
    claim: 'CPOE — physiotherapy, nutrition, social work, counselling',
    productLevel: 'partial',
    demoPath: '/patients',
    demoHint: 'Patient chart → Allied health tab',
    evidenceCodes: ['CLN-CPOE-ALLIED'],
    gapAction: 'Use allied-health orders; expand consultation shortcuts if needed.',
  },
  {
    id: 'cpoe-growth-mch',
    pdfSection: 'Functionality',
    claim: 'BMI/growth charts & full MCH encounter',
    productLevel: 'partial',
    demoPath: '/consultation',
    demoHint: 'Pediatric growth screening panel; MCH ANC/PNC on chart',
    evidenceCodes: ['CLN-GROWTH', 'CLN-MCH-ANC', 'CLN-MCH-PNC'],
  },
  {
    id: 'hpt-national',
    pdfSection: 'Functionality',
    claim: 'HPT registry & HPT allergy (national)',
    productLevel: 'partial',
    demoPath: '/administration?tab=system#national-integrations',
    evidenceCodes: ['INT-HPT-SBX', 'CLN-HPT-RX', 'CLN-CDS-HPT'],
    gapAction: 'Sandbox catalogue + Rx mapping; live HPT API when MoH provides credentials.',
  },
  {
    id: 'cds-enterprise',
    pdfSection: 'Functionality',
    claim: 'Full clinical decision support',
    productLevel: 'partial',
    demoPath: '/administration?tab=system',
    evidenceCodes: ['CLN-CDS', 'CLN-CDS-LAB', 'CLN-CDS-RAD', 'CLN-CDS-TRIAGE', 'CLN-CDS-CHART'],
    gapAction: 'Baseline rules live; not full national DDI/formulary.',
  },
  {
    id: 'summary-hie',
    pdfSection: 'Functionality',
    claim: 'Clinical summary — Kenya HIE exchangeable + care plan',
    productLevel: 'partial',
    demoPath: '/administration?tab=system#fhir-exchange',
    evidenceCodes: ['INT-COMPOSITION', 'CLN-CAREPLAN-FHIR'],
    gapAction: 'FHIR Composition sandbox publish; live HIE after AfyaConnect.',
  },
  {
    id: 'epresc-national',
    pdfSection: 'Functionality',
    claim: 'E-prescribing electronic transmission (national)',
    productLevel: 'partial',
    demoPath: '/pharmacy',
    evidenceCodes: ['INT-EPRESC-INT'],
    gapAction: 'Internal pharmacy queue + outbox; not national e-presc registry.',
  },
  {
    id: 'cqm-submit',
    pdfSection: 'Functionality',
    claim: 'CQM electronic submission',
    productLevel: 'partial',
    demoPath: '/administration?tab=system#reporting-claims',
    evidenceCodes: ['RPT-CQM-EXPAND', 'RPT-CQM-PDF'],
    gapAction: 'Use CQM submission register + export bundle until national API.',
  },
  {
    id: 'idsr-realtime',
    pdfSection: 'Reporting',
    claim: 'Immediate reportable diseases — real-time national',
    productLevel: 'partial',
    demoPath: '/idsr-alerts',
    evidenceCodes: ['REP-IDSR', 'REP-IDSR-NOTIFY', 'REP-IDSR-EMAIL', 'REP-IDSR-SMS'],
    gapAction: 'In-app + email/SMS alerts; national pipe not connected.',
  },
  {
    id: 'idsr-weekly',
    pdfSection: 'Reporting',
    claim: 'IDSR weekly automated submission',
    productLevel: 'partial',
    demoPath: '/administration?tab=system#reporting-claims',
    evidenceCodes: ['REP-IDSR-WEEK'],
    gapAction: 'Weekly export + cron; upload to MoH manually until live.',
  },
  {
    id: 'ph-alert',
    pdfSection: 'Reporting',
    claim: 'Public health — alert mechanism',
    productLevel: 'partial',
    demoPath: '/idsr-alerts',
    evidenceCodes: ['REP-IDSR-NOTIFY'],
    gapAction: 'Header Public health badge + staff notifications + IHR declare.',
  },
  {
    id: 'ihr',
    pdfSection: 'Reporting',
    claim: 'International Health Regulations (IHR)',
    productLevel: 'partial',
    demoPath: '/idsr-alerts',
    evidenceCodes: ['REP-IHR-AUTO'],
    gapAction: 'IHR catalog, auto-link, manual declare workflow.',
  },
  {
    id: 'moh-routine',
    pdfSection: 'Reporting',
    claim: 'MOH monthly/quarterly/annual routine reports',
    productLevel: 'partial',
    demoPath: '/reports',
    evidenceCodes: ['REP-MOH-EXPORT'],
  },
  {
    id: 'unique-user',
    pdfSection: 'Security',
    claim: 'Unique user identification',
    productLevel: 'full',
    demoPath: '/administration?tab=users',
    evidenceCodes: ['SEC-AUTH'],
    gapAction: 'Portal PDF wrongly marked ✗ — set Implemented on re-attestation.',
  },
  {
    id: 'digital-health-id',
    pdfSection: 'Security',
    claim: 'Digital Health ID',
    productLevel: 'partial',
    evidenceCodes: ['INT-CR', 'INT-MFL'],
    gapAction: 'NUPI/CR sandbox; live when AfyaConnect issued.',
  },
  {
    id: 'audit-tamper',
    pdfSection: 'Security',
    claim: 'Tamper-resistant audit',
    productLevel: 'partial',
    demoPath: '/administration?tab=system#audit-log-browser',
    evidenceCodes: ['SEC-AUDIT-CSV'],
    gapAction: 'DB audit + CSV export; not cryptographic WORM.',
  },
  {
    id: 'backup-tested',
    pdfSection: 'Security',
    claim: 'Backup plan tested',
    productLevel: 'ops',
    evidenceCodes: ['OPS-BACKUP'],
    gapAction: 'Attach 2026-09-29 drill log on portal; host evidence.',
  },
  {
    id: 'encryption-rest',
    pdfSection: 'Security',
    claim: 'Encryption at rest / key management',
    productLevel: 'ops',
    evidenceCodes: ['SEC-REST', 'SEC-BAKENC'],
    gapAction: 'Hosting screenshots — not application code.',
  },
  {
    id: 'hie-transmit',
    pdfSection: 'Interoperability',
    claim: 'Kenya HIE — can transmit data (live)',
    productLevel: 'external',
    demoPath: '/administration?tab=system#fhir-exchange',
    evidenceCodes: ['INT-FHIR', 'INT-LIVE-READY', 'INT-HIE-SMOKE-LOG'],
    gapAction: 'AfyaConnect credentials + live smoke test (remediation 30 Oct 2026 in PDF).',
  },
  {
    id: 'hl7-live',
    pdfSection: 'Interoperability',
    claim: 'HL7 compliant (live feed)',
    productLevel: 'partial',
    demoPath: '/administration?tab=system#fhir-exchange',
    evidenceCodes: ['INT-HL7-ORU', 'INT-HL7-OUTBOX'],
    gapAction: 'ORU^R01 builder + outbox; not live v2 interface engine.',
  },
  {
    id: 'patient-facing',
    pdfSection: 'Classification',
    claim: 'Patient-facing services',
    productLevel: 'partial',
    demoPath: '/book',
    evidenceCodes: ['PAT-BOOK-STATUS', 'PRI-DATAPORT'],
  },
];

function summarizeMatrix() {
  const counts = { full: 0, partial: 0, ops: 0, external: 0, portal_only: 0 };
  for (const row of PDF_CLAIMS) {
    counts[row.productLevel] = (counts[row.productLevel] || 0) + 1;
  }
  return {
    sourcePdf: 'docs/azimkim_attestation_report.pdf',
    attestationRef: 'DHS-1790683976496-C791HNX7L',
    portalScorePdf: 92,
    disclaimer:
      'PDF marks many items 100% Implemented; this matrix reflects deployable HMIS behaviour for facilities.',
    counts,
    portalCorrectionsCount: PORTAL_ATTESTATION_CORRECTIONS.length,
  };
}

function getAttestationProductMatrix() {
  return {
    ...summarizeMatrix(),
    items: PDF_CLAIMS,
    portalFieldCorrections: PORTAL_ATTESTATION_CORRECTIONS.map((c) => ({
      field: c.field,
      recommended: c.recommended,
      section: c.section,
      evidenceCodes: c.evidenceCodes,
      doc: c.doc,
    })),
    cannotEditOnPortal:
      'DHS portal may not allow editing a submitted attestation — use clarification letter + corrected re-submission when DHA enables it.',
    pendingOutsideProduct: [
      'DHS digital signature on submitted PDF',
      'AfyaConnect / live HIE credentials',
      'National HPT, IDSR, CQM, e-presc live APIs',
      'ODPC/DPIA uploads (governance artifacts)',
    ],
  };
}

module.exports = {
  getAttestationProductMatrix,
  PDF_CLAIMS,
};
