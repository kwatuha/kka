/**
 * Software registration / DHA application profile for assessors and portal submission.
 */
const path = require('path');
const fs = require('fs');
const {
  PRODUCT_NAME,
  EVIDENCE_EXPORT_PRODUCT,
  DHA_APPLICATION_ID,
  DHA_ORGANISATION,
} = require('./productBrand');
const { getAttestationReadiness } = require('./dhaAttestationReadiness');
const { buildPortalCorrectionsReport } = require('./portalAttestationGuide');

const DHA_PORTAL_APP_ID = String(process.env.DHA_PORTAL_APP_ID || 'APP-2026-K6UPM3').trim();
const DHA_CERTIFICATION_MIGRATION_LEVEL = String(
  process.env.DHA_CERTIFICATION_MIGRATION_LEVEL || '129'
).trim();

function readApiVersion() {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
    );
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const {
  DHA_DOCUMENTED_UI,
  DHA_DOCUMENTED_API,
  LEGACY_COUNTY_UI,
} = require('./publicAppUrl');

async function getDhaRegistrationProfile(pool) {
  const readiness = await getAttestationReadiness(pool);
  const portalCorrections = await buildPortalCorrectionsReport(pool);
  return {
    generatedAt: new Date().toISOString(),
    framework: 'Kenya Digital Health Certification Framework',
    software: {
      productName: PRODUCT_NAME,
      evidenceExportProduct: EVIDENCE_EXPORT_PRODUCT,
      apiVersion: readApiVersion(),
      certificationMigrationLevel: DHA_CERTIFICATION_MIGRATION_LEVEL,
    },
    registration: {
      dhsAttestationReference: DHA_APPLICATION_ID,
      portalApplicationNumber: DHA_PORTAL_APP_ID,
      organisation: DHA_ORGANISATION,
      vendorLegalName: DHA_ORGANISATION,
    },
    environments: {
      uatUi: DHA_DOCUMENTED_UI,
      uatApi: DHA_DOCUMENTED_API,
      uatUiCountyAlternate: LEGACY_COUNTY_UI,
      demoCredentialsDoc: 'docs/DHA_SANDBOX_TEST_ENV.md',
    },
    attestationReadiness: readiness,
    portalCorrections,
    submissionPack: {
      evidenceJson: 'GET /api/integrations/evidence/export',
      registrationJson: 'GET /api/integrations/evidence/registration-profile',
      portalGuideJson: 'GET /api/integrations/evidence/portal-corrections',
      clarificationLetter: 'GET /api/integrations/evidence/clarification-letter',
      auditCsv: 'GET /api/audit/logs/export.csv',
    },
    documentIndex: [
      'docs/DHA_ATTESTATION_CLARIFICATION_LETTER.md',
      'docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md',
      'docs/DHA_AZIMKIM_ATTESTATION_GAP_ANALYSIS.md',
      'docs/DHA_DEMO_SCRIPT.md',
      'docs/DHA_SELF_ATTESTATION.md',
      'docs/DHA_REATTESTATION_CHECKLIST.md',
    ],
  };
}

async function buildClarificationLetterMarkdown(pool) {
  const profile = await getDhaRegistrationProfile(pool);
  const r = profile.attestationReadiness.scores;
  const ui = profile.environments.uatUi;

  return `# Clarification letter — ${PRODUCT_NAME} HMIS (DHA self-attestation)

**To:** Kenya Digital Health Authority assessors  
**From:** ${DHA_ORGANISATION}  
**Product:** ${PRODUCT_NAME} HMIS  
**Application reference:** ${DHA_APPLICATION_ID}  
**Portal application number:** ${DHA_PORTAL_APP_ID}  
**UAT environment:** ${ui}  
**Generated:** ${profile.generatedAt}

We submit this letter to align portal self-attestation with demonstrable product behaviour in our UAT build.

## Evidence checklist status (in-app)

- Active evidence items: **${r.total}** (${r.met} met, ${r.partial} partial, ${r.notStarted} not started)  
- In-code implemented coverage: **${r.implementedCoveragePct}%** (${r.implementedMet}/${r.implementedTotal} codes marked met/partial)  
- Sandbox smoke (automated): **${profile.attestationReadiness.sandboxSmoke?.passed ? 'PASS' : 'review required'}**

## Implemented with evidence

- Role-based access, audit logging, patient consent capture, break-glass emergency access  
- Client Registry / NUPI (sandbox), MFL facility sync, FHIR R4 Patient/Encounter/Observation/Composition/CarePlan/Consent (sandbox publish)  
- LOINC-mapped laboratory results, HL7 ORU sandbox outbox, IDSR evaluate + weekly export + in-app/SMS/email hooks  
- Clinical decision support baseline (allergy, duplicate therapy, IDSR hints, HPT cross-check) on prescribing, lab, radiology, encounter  
- Structured problem list with ICD-10/SNOMED; KENHDD validation at registration; MCH ANC/PNC partial; CQM HMIS-001…010 export  
- Public appointment booking and \`/privacy\`; registration desk wizard; allied-health CPOE with outbox events  
- Evidence pack, portal corrections JSON, registration profile, and audit CSV from Administration  

## Partial or sandbox-only (not national live)

- **Kenya HIE transmit/receive:** mediators and sandbox E2E complete; **live AfyaConnect** pending MoH credentials.  
- **HPT / SNOMED / KENHDD:** sandbox catalogues and validation APIs; not national live certification.  
- **Clinical quality measures:** calculated and exported internally; **no electronic submission** to a national CQM registry.  
- **HL7 v2:** ORU^R01 builder and outbox; **FHIR remains primary** for HIE.  
- **E-prescribing:** internal pharmacy queue and outbox; not national e-prescribing network.  
- **Encryption at rest:** documented controls; host-level screenshots attached separately per \`docs/DHA_ENCRYPTION_EVIDENCE_CHECKLIST.md\`.  

## Portal corrections

See exported **portal-corrections JSON** or \`docs/DHA_PORTAL_ATTESTATION_CORRECTIONS.md\` for field-level Partial/Implemented guidance.

## Assessor artefacts

1. **dha-evidence-pack.json** — Administration → DHA evidence pack → Export JSON  
2. **dha-registration-profile.json** — same panel → Registration profile  
3. Demo script: \`docs/DHA_DEMO_SCRIPT.md\`  
4. Gap analysis: \`docs/DHA_AZIMKIM_ATTESTATION_GAP_ANALYSIS.md\`  

**Authorised signatory:** ___________________________  
**Name / title:** ___________________________  
**Date:** ___________________________
`;
}

module.exports = { getDhaRegistrationProfile, buildClarificationLetterMarkdown };
