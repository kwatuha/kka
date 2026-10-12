/**
 * FHIR R4 resource builders (Phase 3 DHA).
 * Produces OpenHIM-compatible JSON resources without external FHIR libs.
 */
const { resolveParameterLoinc, resolvePanelLoinc, codingFromLoinc } = require('./loincMap');
const { FHIR_META_SOURCE, FHIR_AUTHOR_DISPLAY } = require('./productBrand');

function isoDate(value) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return undefined;
}

function isoDateTime(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).toISOString();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return `${s.slice(0, 10)}T00:00:00.000Z`;
  return new Date().toISOString();
}

function mapGender(g) {
  const v = String(g || '').toLowerCase();
  if (v.startsWith('m')) return 'male';
  if (v.startsWith('f')) return 'female';
  if (v) return 'other';
  return 'unknown';
}

function buildPatient(row) {
  const identifiers = [];
  if (row.patientNumber) {
    identifiers.push({
      use: 'usual',
      system: 'http://kakamega.hmis/sid/patient-number',
      value: String(row.patientNumber),
    });
  }
  if (row.nupi) {
    identifiers.push({
      use: 'official',
      system: 'https://cr.health.go.ke/nupi',
      value: String(row.nupi),
    });
  }
  if (row.idNumber) {
    identifiers.push({
      use: 'secondary',
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NI', display: 'National unique individual identifier' }],
      },
      system: 'https://kra.go.ke/national-id',
      value: String(row.idNumber),
    });
  }

  const telecom = [];
  if (row.phone) telecom.push({ system: 'phone', value: String(row.phone), use: 'mobile' });
  if (row.email) telecom.push({ system: 'email', value: String(row.email) });

  const address = [];
  if (row.address || row.county || row.subcounty || row.ward) {
    address.push({
      use: 'home',
      text: row.address || undefined,
      district: row.subcounty || undefined,
      state: row.county || undefined,
      line: row.ward ? [String(row.ward)] : undefined,
      country: 'KE',
    });
  }

  const managingOrganization = row.mflCode
    ? {
        reference: `Organization/mfl-${row.mflCode}`,
        display: row.branchName || undefined,
      }
    : undefined;

  return {
    resourceType: 'Patient',
    id: `patient-${row.patientId}`,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
      source: FHIR_META_SOURCE,
      lastUpdated: new Date().toISOString(),
    },
    identifier: identifiers,
    active: !row.voided,
    name: [
      {
        use: 'official',
        family: row.lastName || undefined,
        given: [row.firstName, row.middleName].filter(Boolean),
      },
    ],
    telecom: telecom.length ? telecom : undefined,
    gender: mapGender(row.gender),
    birthDate: isoDate(row.dateOfBirth),
    address: address.length ? address : undefined,
    managingOrganization,
  };
}

function mapEncounterClass(visitType) {
  const v = String(visitType || '').toLowerCase();
  if (v.includes('inpatient')) return { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' };
  if (v.includes('emergency')) return { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'EMER', display: 'emergency' };
  return { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' };
}

function buildEncounter(row) {
  const diagnosis = [];
  if (row.diagnosis) {
    diagnosis.push({
      condition: {
        display: String(row.diagnosis),
      },
      use: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role', code: 'DD', display: 'Discharge diagnosis' }],
      },
    });
  }

  return {
    resourceType: 'Encounter',
    id: `encounter-${row.recordId}`,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Encounter'],
      source: FHIR_META_SOURCE,
      lastUpdated: new Date().toISOString(),
    },
    identifier: [
      {
        system: 'http://kakamega.hmis/sid/medical-record',
        value: String(row.recordId),
      },
    ],
    status: 'finished',
    class: mapEncounterClass(row.visitType),
    type: row.department
      ? [{ text: String(row.department) }]
      : [{ text: row.visitType || 'Outpatient' }],
    subject: {
      reference: `Patient/patient-${row.patientId}`,
      display: [row.patientFirstName, row.patientLastName].filter(Boolean).join(' ') || undefined,
    },
    period: {
      start: isoDateTime(row.visitDate),
      end: isoDateTime(row.visitDate),
    },
    reasonCode: row.chiefComplaint ? [{ text: String(row.chiefComplaint) }] : undefined,
    diagnosis: diagnosis.length ? diagnosis : undefined,
    serviceProvider: row.mflCode
      ? { reference: `Organization/mfl-${row.mflCode}`, display: row.branchName || undefined }
      : undefined,
  };
}

function interpretationFromFlag(flag) {
  const f = String(flag || '').toLowerCase();
  if (!f || f === 'normal' || f === 'n') return undefined;
  let code = 'A';
  let display = 'Abnormal';
  if (f.includes('high') || f === 'h' || f === 'hh') {
    code = f === 'hh' ? 'HH' : 'H';
    display = code === 'HH' ? 'Critical high' : 'High';
  } else if (f.includes('low') || f === 'l' || f === 'll') {
    code = f === 'll' ? 'LL' : 'L';
    display = code === 'LL' ? 'Critical low' : 'Low';
  } else if (f.includes('critical')) {
    code = 'AA';
    display = 'Critical abnormal';
  }
  return [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code,
          display,
        },
      ],
    },
  ];
}

function buildObservationsFromLabResult(row, values = []) {
  const panelLoinc = resolvePanelLoinc(row.testCode, row.testName, row.loincCode);
  const effective = isoDateTime(row.testDate || row.createdAt);
  const subject = {
    reference: `Patient/patient-${row.patientId}`,
    display: [row.patientFirstName, row.patientLastName].filter(Boolean).join(' ') || undefined,
  };
  const common = {
    resourceType: 'Observation',
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Observation'],
      source: FHIR_META_SOURCE,
      lastUpdated: new Date().toISOString(),
    },
    status: 'final',
    subject,
    effectiveDateTime: effective,
    performer: row.mflCode
      ? [{ reference: `Organization/mfl-${row.mflCode}`, display: row.branchName || undefined }]
      : undefined,
  };

  if (!values.length) {
    return [
      {
        ...common,
        id: `obs-${row.resultId}`,
        identifier: [{ system: 'http://kakamega.hmis/sid/lab-result', value: String(row.resultId) }],
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory',
              },
            ],
          },
        ],
        code: codingFromLoinc(panelLoinc, row.testName || row.testCode),
        valueString: row.notes || row.testName || 'Lab result final',
      },
    ];
  }

  return values.map((v, idx) => {
    const paramLoinc = resolveParameterLoinc(v.parameterName) || panelLoinc;
    const numeric = v.value != null && v.value !== '' && !Number.isNaN(Number(v.value));
    const obs = {
      ...common,
      id: `obs-${row.resultId}-${idx + 1}`,
      identifier: [
        {
          system: 'http://kakamega.hmis/sid/lab-result-value',
          value: `${row.resultId}:${idx + 1}`,
        },
      ],
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'laboratory',
              display: 'Laboratory',
            },
          ],
        },
      ],
      code: codingFromLoinc(paramLoinc, v.parameterName || row.testName),
      interpretation: interpretationFromFlag(v.flag),
    };
    if (numeric) {
      obs.valueQuantity = {
        value: Number(v.value),
        unit: v.unit || undefined,
        system: 'http://unitsofmeasure.org',
        code: v.unit || undefined,
      };
    } else {
      obs.valueString = v.value != null ? String(v.value) : undefined;
    }
    if (v.normalRange) {
      obs.referenceRange = [{ text: String(v.normalRange) }];
    }
    return obs;
  });
}

function buildBundle(resources, type = 'collection') {
  return {
    resourceType: 'Bundle',
    type,
    timestamp: new Date().toISOString(),
    meta: { source: FHIR_META_SOURCE },
    entry: (resources || []).map((resource) => ({
      fullUrl: `urn:uuid:${resource.resourceType}-${resource.id}`,
      resource,
      request: {
        method: 'PUT',
        url: `${resource.resourceType}/${resource.id}`,
      },
    })),
  };
}

/**
 * FHIR R4 Composition — human-readable clinical summary for HIE preview (DHA Phase 7).
 */
function buildConditionFromProblem(patientId, problem) {
  const id = `condition-problem-${problem.problemId}`;
  const codings = [];
  if (problem.icd10Code) {
    codings.push({
      system: 'http://hl7.org/fhir/sid/icd-10',
      code: String(problem.icd10Code),
      display: problem.problemText,
    });
  }
  if (problem.snomedCode) {
    codings.push({
      system: 'http://snomed.info/sct',
      code: String(problem.snomedCode),
      display: problem.snomedDisplay || problem.problemText,
    });
  }
  if (!codings.length) {
    codings.push({ display: problem.problemText || 'Problem' });
  }
  const clinicalCode =
    String(problem.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive';
  return {
    resourceType: 'Condition',
    id,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: clinicalCode,
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
          },
        ],
      },
    ],
    code: { coding: codings, text: problem.problemText },
    subject: { reference: `Patient/${patientId}` },
    meta: { source: FHIR_META_SOURCE },
  };
}

function buildCarePlanFromProblem(patientId, problem) {
  const notes = String(problem.carePlanNotes || '').trim();
  if (!notes) return null;
  return {
    resourceType: 'CarePlan',
    id: `careplan-problem-${problem.problemId}`,
    status: 'active',
    intent: 'plan',
    title: `Care plan: ${problem.problemText || 'Problem'}`,
    description: notes,
    subject: { reference: `Patient/${patientId}` },
    addresses: [{ reference: `Condition/condition-problem-${problem.problemId}` }],
    meta: { source: FHIR_META_SOURCE },
  };
}

function buildCarePlanFromNcd(patientId, ncd) {
  const plan = String(ncd.treatmentPlan || '').trim();
  if (!plan) return null;
  const label = ncd.conditionName || ncd.conditionType || 'NCD';
  return {
    resourceType: 'CarePlan',
    id: `careplan-ncd-${ncd.ncdId}`,
    status: 'active',
    intent: 'plan',
    title: `NCD care plan: ${label}`,
    description: plan,
    subject: { reference: `Patient/${patientId}` },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/care-plan-category',
            code: 'assess-plan',
            display: 'Assessment and Plan',
          },
        ],
      },
    ],
    meta: { source: FHIR_META_SOURCE },
  };
}

/**
 * Condition + CarePlan resources for clinical summary bundle (DHA 7.4).
 */
function buildClinicalSummaryClinicalResources(patientId, context = {}) {
  const resources = [];
  for (const problem of context.problems || []) {
    if (!problem?.problemId) continue;
    resources.push(buildConditionFromProblem(patientId, problem));
    const cp = buildCarePlanFromProblem(patientId, problem);
    if (cp) resources.push(cp);
  }
  for (const ncd of context.carePlans || []) {
    if (!ncd?.ncdId) continue;
    const cp = buildCarePlanFromNcd(patientId, ncd);
    if (cp) resources.push(cp);
  }
  return resources;
}

function buildClinicalComposition(patientRow, context = {}, clinicalExtras = []) {
  const patientRef = `Patient/${patientRow.patientId}`;
  const problems = context.problems || [];
  const allergies = context.allergies || [];
  const carePlans = context.carePlans || [];
  const familyHistory = context.familyHistory || [];
  const carePlanResources = (clinicalExtras || []).filter((r) => r.resourceType === 'CarePlan');

  const problemHtml = problems.length
    ? `<ul>${problems
        .map((p) => {
          const plan = p.carePlanNotes ? ` — Plan: ${p.carePlanNotes}` : '';
          const snomed = p.snomedCode ? ` SNOMED:${p.snomedCode}` : '';
          return `<li>${p.problemText}${p.icd10Code ? ` (${p.icd10Code}${snomed})` : snomed ? ` (${snomed.trim()})` : ''} — ${p.status}${plan}</li>`;
        })
        .join('')}</ul>`
    : '<p>No structured problems recorded.</p>';
  const allergyHtml = allergies.length
    ? `<ul>${allergies.map((a) => `<li>${a.allergen} (${a.severity || 'unknown'})</li>`).join('')}</ul>`
    : '<p>No allergies recorded.</p>';
  const planHtml = carePlans.length
    ? `<ul>${carePlans.map((c) => `<li>${c.conditionName || c.conditionType}: ${c.treatmentPlan || '—'}</li>`).join('')}</ul>`
    : '<p>See problem list and NCD modules for care plans.</p>';
  const familyHtml = familyHistory.length
    ? `<ul>${familyHistory
        .map((f) => {
          const age = f.ageAtDiagnosis != null ? ` at age ${f.ageAtDiagnosis}` : '';
          const st = f.status ? ` (${f.status})` : '';
          const note = f.notes ? ` — ${f.notes}` : '';
          return `<li>${f.relation}: ${f.condition}${age}${st}${note}</li>`;
        })
        .join('')}</ul>`
    : '<p>No family history recorded.</p>';

  const narrative = `
    <div xmlns="http://www.w3.org/1999/xhtml">
      <h2>Clinical Summary</h2>
      <p><b>Patient:</b> ${patientRow.firstName} ${patientRow.lastName}</p>
      <h3>Active problems</h3>${problemHtml}
      <h3>Allergies</h3>${allergyHtml}
      <h3>Family history</h3>${familyHtml}
      <h3>Care plans</h3>${planHtml}
    </div>`.trim();

  return {
    resourceType: 'Composition',
    id: `clinical-summary-${patientRow.patientId}`,
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '60591-5',
          display: 'Patient summary Document',
        },
      ],
    },
    subject: { reference: patientRef },
    date: isoDateTime(new Date()),
    title: 'Patient Clinical Summary',
    author: [{ display: FHIR_AUTHOR_DISPLAY }],
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Composition'],
      source: FHIR_META_SOURCE,
    },
    section: [
      {
        title: 'Problems',
        code: {
          coding: [{ system: 'http://loinc.org', code: '11450-4', display: 'Problem list' }],
        },
        text: { status: 'generated', div: narrative },
        entry: (clinicalExtras || [])
          .filter((r) => r.resourceType === 'Condition')
          .map((r) => ({ reference: `${r.resourceType}/${r.id}` })),
      },
      ...(carePlanResources.length
        ? [
            {
              title: 'Care plans',
              code: {
                coding: [{ system: 'http://loinc.org', code: '18776-5', display: 'Plan of care' }],
              },
              entry: carePlanResources.map((r) => ({ reference: `${r.resourceType}/${r.id}` })),
            },
          ]
        : []),
      ...(familyHistory.length
        ? [
            {
              title: 'Family history',
              code: {
                coding: [{ system: 'http://loinc.org', code: '10157-6', display: 'History of family member diseases' }],
              },
              text: { status: 'generated', div: familyHtml },
            },
          ]
        : []),
    ],
  };
}

/**
 * FHIR R4 DocumentReference pointing at the clinical summary Composition (HIE bundle).
 */
function buildClinicalDocumentReference(patientRow, compositionResource) {
  const compId = compositionResource.id || `clinical-summary-${patientRow.patientId}`;
  return {
    resourceType: 'DocumentReference',
    id: `docref-summary-${patientRow.patientId}`,
    status: 'current',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '60591-5',
          display: 'Patient summary Document',
        },
      ],
    },
    subject: { reference: `Patient/${patientRow.patientId}` },
    date: isoDateTime(new Date()),
    description: 'Clinical summary (Composition)',
    content: [
      {
        attachment: {
          contentType: 'application/fhir+json',
          url: `Composition/${compId}`,
          title: compositionResource.title || 'Patient Clinical Summary',
        },
      },
    ],
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/DocumentReference'],
      source: FHIR_META_SOURCE,
    },
  };
}

const CONSENT_TYPE_DISPLAY = {
  treatment: 'Treatment',
  share_info: 'Share information',
  photos: 'Clinical photography',
};

/**
 * FHIR R4 Consent resources from patient_consents rows.
 */
function buildPatientConsents(patientId, consentRows = []) {
  return consentRows.map((row, index) => {
    const type = String(row.consentType || 'treatment');
    return {
      resourceType: 'Consent',
      id: `consent-${patientId}-${index + 1}`,
      status: row.granted ? 'active' : 'inactive',
      scope: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentscope',
            code: 'patient-privacy',
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              code: type === 'treatment' ? 'ICOL' : 'IDSCL',
              display: CONSENT_TYPE_DISPLAY[type] || type,
            },
          ],
        },
      ],
      patient: { reference: `Patient/${patientId}` },
      dateTime: row.capturedAt ? isoDateTime(row.capturedAt) : isoDateTime(new Date()),
      provision: {
        type: row.granted ? 'permit' : 'deny',
      },
      meta: { source: FHIR_META_SOURCE },
    };
  });
}

module.exports = {
  buildPatient,
  buildEncounter,
  buildObservationsFromLabResult,
  buildBundle,
  buildConditionFromProblem,
  buildCarePlanFromProblem,
  buildCarePlanFromNcd,
  buildClinicalSummaryClinicalResources,
  buildClinicalComposition,
  buildClinicalDocumentReference,
  buildPatientConsents,
  isoDate,
  isoDateTime,
};
