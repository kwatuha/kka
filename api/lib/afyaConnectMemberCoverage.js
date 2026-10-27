/**
 * National benefit package summary for UAT witness planning (OP vs IP sub-benefits).
 * @see https://hie-docs.dha.go.ke/docs/claims/process/eligibility/subBenefitsCoverage
 */
const { listShaParentBenefits, listShaSubBenefits } = require('./afyaConnectEclaims');

function parentBenefitsIncludeInpatientPackages(parentBenefits) {
  return (parentBenefits || []).some((p) => {
    const code = String(p.parentBenefitCode || p.code || '').toUpperCase();
    const name = String(p.name || p.parentBenefit || '').toLowerCase();
    return (
      code.startsWith('SHA-07') ||
      code.startsWith('PMF-07') ||
      code.startsWith('SHA-19') ||
      /inpatient|surgical services/i.test(name)
    );
  });
}

function buildWitnessTracks({ outpatientSubCount, inpatientSubCount, inpatientParent }) {
  const ipReady = inpatientSubCount > 0 || inpatientParent;
  return {
    shifOutpatient: {
      status: outpatientSubCount > 0 ? 'ready' : 'blocked',
      label: 'SHIF outpatient (submit)',
      detail:
        outpatientSubCount > 0
          ? `${outpatientSubCount} OP sub-benefit(s) at this facility FR`
          : 'No OP sub-benefits — check eligibility and FR code',
    },
    shifInpatient: {
      status: ipReady ? 'ready' : 'awaiting_dha',
      label: 'SHIF inpatient (discharge)',
      detail: ipReady
        ? `${inpatientSubCount} IP sub-benefit(s) or inpatient parent on file`
        : 'No SHA-07 / IP sub-benefits on UAT for this member — request IP test CR from afyaconnect.dha@gmail.com',
    },
    phcCapitation: {
      status: 'manual',
      label: 'PHC capitation',
      detail: 'Chart → National visit fund Capitation (PHC) — separate parent benefits; witness when fund returns packages',
    },
    eccifEmergency: {
      status: 'manual',
      label: 'ECCIF emergency',
      detail: 'Chart → Emergency visit fund — doctor consent path; submit within 24h per DHA checklist',
    },
  };
}

/**
 * @param {{ patientCrId: string }} params
 */
async function analyzeMemberCoverage({ patientCrId }) {
  const cr = String(patientCrId || '').trim();
  if (!cr) return { error: 'patientCrId required' };

  const parent = await listShaParentBenefits({ patientCrId: cr });
  if (parent.error && parent.mode === 'live') {
    return { patientCrId: cr, mode: parent.mode, error: parent.error };
  }

  const parents = parent.parentBenefits || [];
  const op = await listShaSubBenefits({ patientCrId: cr, serviceType: 'OUTPATIENT' });
  const ip = await listShaSubBenefits({ patientCrId: cr, serviceType: 'INPATIENT' });

  const outpatientSubCount =
    op.subBenefitsFilteredCount ?? (op.subBenefits ? op.subBenefits.length : 0);
  const inpatientSubCount =
    ip.subBenefitsFilteredCount ?? (ip.subBenefits ? ip.subBenefits.length : 0);
  const inpatientParent = parentBenefitsIncludeInpatientPackages(parents);
  const inpatientPackagesAvailable = inpatientParent || inpatientSubCount > 0;

  return {
    mode: parent.mode || op.mode,
    patientCrId: cr,
    parentBenefits: parents.map((p) => ({
      parentBenefitCode: p.parentBenefitCode,
      name: p.name,
      fund: p.fund || null,
    })),
    parentBenefitCodes: parents.map((p) => p.parentBenefitCode).filter(Boolean),
    outpatientSubBenefitsCount: outpatientSubCount,
    inpatientSubBenefitsCount: inpatientSubCount,
    inpatientParentBenefitPresent: inpatientParent,
    inpatientPackagesAvailable,
    outpatientOnlyOnNationalApi: parents.length > 0 && !inpatientPackagesAvailable,
    witnessTracks: buildWitnessTracks({
      outpatientSubCount,
      inpatientSubCount,
      inpatientParent,
    }),
    dhaContact: 'afyaconnect.dha@gmail.com',
    uatSmokeNote:
      cr === 'CR6724396934727-8' && !inpatientPackagesAvailable
        ? 'Default UAT member 12345678 is OP-only (SHA-12) at most facilities — use for SHIF OP witness while awaiting IP CR.'
        : null,
  };
}

module.exports = {
  analyzeMemberCoverage,
  parentBenefitsIncludeInpatientPackages,
  buildWitnessTracks,
};
