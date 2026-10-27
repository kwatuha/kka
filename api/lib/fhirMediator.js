/**
 * FHIR / OpenHIM mediator (Phase 3 DHA).
 * sandbox: persist fhir_export_log + enqueue outbox (no external HTTP)
 * live: AfyaConnect POST /shr/bundles or legacy OpenHIM POST /fhir
 * disabled: no-op
 *
 * @see docs/DHA_FHIR_LIVE_TRANSMIT.md
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');
const { notifyIntegrationFailure } = require('./integrationFailureAlert');
const {
  resolveFhirPublishProvider,
  resolveFhirPublishStyle,
  prepareShrSubmissionBundle,
  postShrBundle,
} = require('./afyaConnectFhirPublish');
const {
  buildPatient,
  buildEncounter,
  buildObservationsFromLabResult,
  buildLabServiceRequest,
  buildClinicalComposition,
  buildClinicalDocumentReference,
  buildClinicalSummaryClinicalResources,
  buildPatientConsents,
  buildBundle,
} = require('./fhirBuilders');
const { resolvePanelLoinc } = require('./loincMap');
const { buildVisitShrResources } = require('./fhirShrVisitBundle');
const { checkShrLivePublishAllowed } = require('./shrPublishGate');

async function loadSettings(executor) {
  const db = executor || pool;
  try {
    const [rows] = await db.execute(
      `SELECT fhirMode, fhirBaseUrl, fhirApiKey, autoPublishFhir
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveMode(settings) {
  const fromEnv = (process.env.FHIR_MODE || '').toLowerCase();
  if (fromEnv === 'sandbox' || fromEnv === 'live' || fromEnv === 'disabled') return fromEnv;
  return String(settings?.fhirMode || 'sandbox').toLowerCase();
}

async function shouldAutoPublish(executor) {
  const settings = await loadSettings(executor);
  if (!settings) return true;
  return Boolean(settings.autoPublishFhir);
}

async function logExport(executor, {
  resourceType,
  resourceId,
  sourceType,
  sourceId,
  mode,
  status,
  httpStatus,
  responseSummary,
  resourceJson,
}) {
  const db = executor || pool;
  const [result] = await db.execute(
    `INSERT INTO fhir_export_log
      (resourceType, resourceId, sourceType, sourceId, mode, status, httpStatus, responseSummary, resourceJson, publishedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${status === 'published' ? 'NOW()' : 'NULL'})`,
    [
      resourceType,
      String(resourceId),
      sourceType,
      String(sourceId),
      mode,
      status,
      httpStatus || null,
      responseSummary || null,
      JSON.stringify(resourceJson),
    ]
  );
  return result.insertId;
}

async function postToOpenHim(settings, resource) {
  const base = process.env.FHIR_BASE_URL || settings?.fhirBaseUrl || '';
  if (!base) throw new Error('FHIR_BASE_URL not configured for live mode');
  const apiKey = process.env.FHIR_API_KEY || settings?.fhirApiKey || '';
  const url = new URL(
    resource.resourceType === 'Bundle' ? 'fhir' : `fhir/${resource.resourceType}`,
    base.endsWith('/') ? base : `${base}/`
  );
  const headers = {
    Accept: 'application/fhir+json',
    'Content-Type': 'application/fhir+json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(resource),
  });
  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
}

async function postLiveFhir(settings, list) {
  const provider = resolveFhirPublishProvider(settings);
  const style = resolveFhirPublishStyle();

  if (provider === 'afyaconnect' && style === 'shr-bundles-v1') {
    const raw =
      list.length > 1
        ? buildBundle(list, 'collection')
        : prepareShrSubmissionBundle(list[0]);
    return postShrBundle(settings, raw);
  }

  const payload =
    list.length > 1 ? buildBundle(list, 'transaction') : list[0];
  return postToOpenHim(settings, payload);
}

async function publishResources(executor, {
  resources,
  sourceType,
  sourceId,
  eventType,
}) {
  const settings = await loadSettings(executor);
  const mode = resolveMode(settings);
  if (mode === 'disabled') {
    return { skipped: true, mode, count: 0 };
  }

  const list = Array.isArray(resources) ? resources : [resources];
  const primary = list[0];
  const exportIds = [];

  if (mode === 'live') {
    try {
      const result = await postLiveFhir(settings, list);
      const status = result.ok ? 'published' : 'failed';
      for (const r of list) {
        const id = await logExport(executor, {
          resourceType: r.resourceType,
          resourceId: r.id,
          sourceType,
          sourceId,
          mode,
          status,
          httpStatus: result.status,
          responseSummary: result.summary || result.body,
          resourceJson: r,
        });
        exportIds.push(id);
      }
      if (!result.ok) {
        void notifyIntegrationFailure({
          channel: 'fhir',
          referenceId: exportIds[0] || primary.id,
          summary: `FHIR live publish failed (${primary.resourceType})`,
          detail: `HTTP ${result.status}: ${String(result.summary || result.body || '').slice(0, 100)}`,
        }).catch((e) => console.warn('[fhir] failure alert:', e.message || e));
        return { mode, status: 'failed', httpStatus: result.status, error: result.body, exportIds };
      }
    } catch (err) {
      for (const r of list) {
        const id = await logExport(executor, {
          resourceType: r.resourceType,
          resourceId: r.id,
          sourceType,
          sourceId,
          mode,
          status: 'failed',
          responseSummary: err.message || String(err),
          resourceJson: r,
        });
        exportIds.push(id);
      }
      void notifyIntegrationFailure({
        channel: 'fhir',
        referenceId: exportIds[0] || primary.id,
        summary: `FHIR live publish error (${primary.resourceType})`,
        detail: String(err.message || err).slice(0, 120),
      }).catch((e) => console.warn('[fhir] failure alert:', e.message || e));
      return { mode, status: 'failed', error: err.message || String(err), exportIds };
    }
  } else {
    for (const r of list) {
      const id = await logExport(executor, {
        resourceType: r.resourceType,
        resourceId: r.id,
        sourceType,
        sourceId,
        mode: 'sandbox',
        status: 'published',
        httpStatus: 200,
        responseSummary: 'sandbox local publish',
        resourceJson: r,
      });
      exportIds.push(id);
    }
  }

  try {
    await enqueueOutboxEvent(executor, {
      eventType: eventType || `fhir.${primary.resourceType}`,
      aggregateType: sourceType,
      aggregateId: sourceId,
      payload: {
        mode,
        resourceType: primary.resourceType,
        resourceIds: list.map((r) => r.id),
        exportIds,
        bundleType: list.length > 1 ? 'transaction' : 'single',
      },
    });
  } catch (outboxErr) {
    console.warn('[fhir] outbox enqueue skipped:', outboxErr.message || outboxErr);
  }

  return {
    mode,
    status: 'published',
    count: list.length,
    resources: list,
    exportIds,
  };
}

async function loadPatientRow(executor, patientId) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT p.*, b.mflCode, b.frCode, b.branchName, b.branchCode
     FROM patients p
     LEFT JOIN branches b ON b.branchId = p.registeredBranchId
     WHERE p.patientId = ? AND p.voided = 0
     LIMIT 1`,
    [patientId]
  );
  return rows[0] || null;
}

async function loadEncounterRow(executor, recordId) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT mr.*,
            p.firstName AS patientFirstName, p.lastName AS patientLastName, p.nupi,
            p.idNumber, p.dateOfBirth, p.gender, p.phone, p.email,
            b.mflCode, b.frCode, b.branchName
     FROM medical_records mr
     LEFT JOIN patients p ON p.patientId = mr.patientId
     LEFT JOIN branches b ON b.branchId = p.registeredBranchId
     WHERE mr.recordId = ?
     LIMIT 1`,
    [recordId]
  );
  return rows[0] || null;
}

async function loadLabResultRow(executor, resultId) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT lr.resultId, lr.orderItemId, lr.testDate, lr.notes, lr.createdAt,
            loi.orderId, loi.testTypeId,
            lo.patientId, lo.orderNumber, lo.branchId, lo.orderDate, lo.priority,
            lo.clinicalIndication, lo.medicalRecordId,
            ltt.testName, ltt.testCode, ltt.loincCode,
            p.firstName AS patientFirstName, p.lastName AS patientLastName,
            b.mflCode, b.frCode, b.branchName
     FROM lab_test_results lr
     INNER JOIN lab_test_order_items loi ON loi.itemId = lr.orderItemId
     INNER JOIN lab_test_orders lo ON lo.orderId = loi.orderId
     LEFT JOIN lab_test_types ltt ON ltt.testTypeId = loi.testTypeId
     LEFT JOIN patients p ON p.patientId = lo.patientId
     LEFT JOIN branches b ON b.branchId = lo.branchId
     WHERE lr.resultId = ?
     LIMIT 1`,
    [resultId]
  );
  if (!rows[0]) return null;
  const [values] = await db.execute(
    `SELECT parameterName, value, unit, normalRange, flag
     FROM lab_result_values WHERE resultId = ?
     ORDER BY valueId ASC`,
    [resultId]
  );
  return { ...rows[0], values };
}

async function publishPatient(executor, patientId) {
  const row = await loadPatientRow(executor, patientId);
  if (!row) throw new Error('Patient not found');
  const resource = buildPatient(row);
  return publishResources(executor, {
    resources: [resource],
    sourceType: 'patient',
    sourceId: patientId,
    eventType: 'fhir.Patient',
  });
}

async function publishEncounter(executor, recordId) {
  const row = await loadEncounterRow(executor, recordId);
  if (!row) throw new Error('Encounter / medical record not found');
  const gate = await checkShrLivePublishAllowed(executor, row.patientId);
  if (!gate.allowed) {
    return { skipped: true, mode: resolveMode(await loadSettings(executor)), reason: gate.reason, count: 0 };
  }
  const patientRow = await loadPatientRow(executor, row.patientId);
  if (!patientRow) throw new Error('Patient not found');
  const { resources } = buildVisitShrResources(patientRow, row);
  return publishResources(executor, {
    resources,
    sourceType: 'medical_record',
    sourceId: recordId,
    eventType: 'fhir.ShrVisitBundle',
  });
}

async function resolveLabEncounterRecordId(executor, row) {
  if (row.medicalRecordId) {
    return Number(row.medicalRecordId);
  }
  const db = executor || pool;
  const [recRows] = await db.execute(
    `SELECT recordId FROM medical_records
     WHERE patientId = ? AND DATE(visitDate) <= DATE(?)
     ORDER BY recordId DESC LIMIT 1`,
    [row.patientId, row.testDate || row.createdAt || new Date()]
  );
  return recRows[0]?.recordId || null;
}

function labLoincWarning(row) {
  const panelLoinc = resolvePanelLoinc(row.testCode, row.testName, row.loincCode);
  if (panelLoinc?.code) return null;
  return `No LOINC mapped for "${row.testName || row.testCode || 'test'}" — map in Administration → FHIR LOINC map for stronger DHA terminology compliance.`;
}

async function publishLabObservation(executor, resultId) {
  const db = executor || pool;
  const row = await loadLabResultRow(executor, resultId);
  if (!row) throw new Error('Lab result not found');
  const gate = await checkShrLivePublishAllowed(executor, row.patientId);
  const loincWarning = labLoincWarning(row);
  if (!gate.allowed) {
    return {
      skipped: true,
      mode: resolveMode(await loadSettings(executor)),
      reason: gate.reason,
      count: 0,
      warning: loincWarning || undefined,
    };
  }

  const linkedRecordId = await resolveLabEncounterRecordId(executor, row);

  if (linkedRecordId) {
    const patientRow = await loadPatientRow(executor, row.patientId);
    const encRow = await loadEncounterRow(executor, linkedRecordId);
    if (patientRow && encRow) {
      const visit = buildVisitShrResources(patientRow, {
        ...encRow,
        mflCode: row.mflCode || encRow.mflCode,
        frCode: row.frCode || encRow.frCode,
        branchName: row.branchName || encRow.branchName,
      });
      const sr = buildLabServiceRequest(
        { ...row, orderItemId: row.orderItemId },
        { encounterFhirId: visit.encFhirId, patientFhirId: visit.patientFhirId }
      );
      const obs = buildObservationsFromLabResult(
        { ...row, ...encRow },
        row.values || [],
        {
          encounterFhirId: visit.encFhirId,
          patientFhirId: visit.patientFhirId,
          serviceRequestFhirId: sr.id,
        }
      );
      const pub = await publishResources(executor, {
        resources: [...visit.resources, sr, ...obs],
        sourceType: 'lab_result',
        sourceId: resultId,
        eventType: 'fhir.ShrVisitLab',
      });
      return loincWarning ? { ...pub, warning: loincWarning } : pub;
    }
  }

  const sr = buildLabServiceRequest(row, { patientFhirId: `patient-${row.patientId}` });
  const resources = [sr, ...buildObservationsFromLabResult(row, row.values || [], { serviceRequestFhirId: sr.id })];
  const pub = await publishResources(executor, {
    resources,
    sourceType: 'lab_result',
    sourceId: resultId,
    eventType: 'fhir.Observation',
  });
  return loincWarning ? { ...pub, warning: loincWarning } : pub;
}

async function loadClinicalSummaryContext(executor, patientId) {
  const db = executor || pool;
  const [problems] = await db
    .execute(
      `SELECT problemId, problemText, icd10Code, snomedCode, snomedDisplay, status, carePlanNotes FROM patient_problems
       WHERE patientId = ? AND voided = 0 AND status = 'active' ORDER BY problemId DESC LIMIT 20`,
      [patientId]
    )
    .catch(() => [[]]);
  const [allergies] = await db
    .execute(
      `SELECT allergen, severity, status FROM patient_allergies
       WHERE patientId = ? AND status = 'active' ORDER BY allergyId DESC LIMIT 20`,
      [patientId]
    )
    .catch(() => [[]]);
  const [carePlans] = await db
    .execute(
      `SELECT ncdId, conditionType, conditionName, treatmentPlan FROM patient_ncd_conditions
       WHERE patientId = ? AND isActive = 1 LIMIT 10`,
      [patientId]
    )
    .catch(() => [[]]);
  const [familyHistory] = await db
    .execute(
      `SELECT relation, \`condition\`, ageAtDiagnosis, status, notes
       FROM patient_family_history WHERE patientId = ? ORDER BY createdAt DESC LIMIT 15`,
      [patientId]
    )
    .catch(() => [[]]);
  return { problems, allergies, carePlans, familyHistory };
}

async function buildClinicalSummaryResources(executor, patientId) {
  const row = await loadPatientRow(executor, patientId);
  if (!row) throw new Error('Patient not found');
  const context = await loadClinicalSummaryContext(executor, patientId);
  const patient = buildPatient(row);
  const clinicalExtras = buildClinicalSummaryClinicalResources(patientId, context);
  const composition = buildClinicalComposition(row, context, clinicalExtras);
  const documentReference = buildClinicalDocumentReference(row, composition);
  return [patient, ...clinicalExtras, composition, documentReference];
}

async function publishClinicalSummary(executor, patientId) {
  const resources = await buildClinicalSummaryResources(executor, patientId);
  return publishResources(executor, {
    resources,
    sourceType: 'patient',
    sourceId: patientId,
    eventType: 'fhir.Composition',
  });
}

async function maybeRepublishClinicalSummary(executor, patientId) {
  const db = executor || pool;
  try {
    if (await shouldAutoPublish(db)) {
      await publishClinicalSummary(db, Number(patientId));
    }
  } catch (err) {
    console.warn('[fhir] clinical summary republish skipped:', err.message || err);
  }
}

async function buildConsentResources(executor, patientId) {
  const row = await loadPatientRow(executor, patientId);
  if (!row) throw new Error('Patient not found');
  const db = executor || pool;
  const [consents] = await db
    .execute(
      `SELECT consentType, granted, signatureName, grantedAt AS capturedAt FROM patient_consents WHERE patientId = ? ORDER BY grantedAt ASC`,
      [patientId]
    )
    .catch(() => [[]]);
  const patient = buildPatient(row);
  const consentResources = buildPatientConsents(patientId, consents || []);
  return [patient, ...consentResources];
}

async function publishConsent(executor, patientId) {
  const resources = await buildConsentResources(executor, patientId);
  return publishResources(executor, {
    resources,
    sourceType: 'patient',
    sourceId: patientId,
    eventType: 'fhir.Consent',
  });
}

module.exports = {
  loadSettings,
  resolveMode,
  shouldAutoPublish,
  publishPatient,
  publishEncounter,
  publishLabObservation,
  publishClinicalSummary,
  maybeRepublishClinicalSummary,
  publishConsent,
  buildClinicalSummaryResources,
  buildConsentResources,
  loadPatientRow,
  loadEncounterRow,
  loadLabResultRow,
  buildPatient,
  buildEncounter,
  buildObservationsFromLabResult,
};
