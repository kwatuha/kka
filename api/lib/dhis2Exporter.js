const { FHIR_META_SOURCE } = require('./productBrand');

/**
 * DHIS2 / SDMX-HD aggregate export packages (Phase 4 DHA).
 * Builds period datasets from HMIS operational counts (MOH-aligned).
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');

async function loadSettings(executor) {
  const db = executor || pool;
  try {
    const [rows] = await db.execute(
      `SELECT dhis2Mode, dhis2BaseUrl, dhis2OrgUnit
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveMode(settings) {
  const fromEnv = (process.env.DHIS2_MODE || '').toLowerCase();
  if (['sandbox', 'live', 'disabled'].includes(fromEnv)) return fromEnv;
  return String(settings?.dhis2Mode || 'sandbox').toLowerCase();
}

function monthPeriod(dateStr) {
  // YYYYMM from YYYY-MM-DD or Date
  if (!dateStr) {
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const s = String(dateStr);
  if (/^\d{6}$/.test(s)) return s;
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 4) + s.slice(5, 7);
  const d = new Date(s);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function periodBounds(period) {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(4, 6));
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(y, m, 0));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

async function gatherMetrics(executor, start, end) {
  const db = executor || pool;
  const q = async (sql, params) => {
    try {
      const [rows] = await db.execute(sql, params);
      return Number(rows[0]?.count || rows[0]?.c || 0);
    } catch {
      return 0;
    }
  };

  return {
    outpatients: await q(
      `SELECT COUNT(*) AS count FROM queue_entries
       WHERE servicePoint = 'consultation' AND DATE(arrivalTime) BETWEEN ? AND ?`,
      [start, end]
    ),
    inpatients: await q(
      `SELECT COUNT(*) AS count FROM admissions WHERE DATE(admissionDate) BETWEEN ? AND ?`,
      [start, end]
    ),
    deliveries: await q(
      `SELECT COUNT(*) AS count FROM deliveries WHERE DATE(deliveryDate) BETWEEN ? AND ?`,
      [start, end]
    ),
    labOrders: await q(
      `SELECT COUNT(*) AS count FROM lab_test_orders WHERE DATE(orderDate) BETWEEN ? AND ?`,
      [start, end]
    ),
    prescriptions: await q(
      `SELECT COUNT(*) AS count FROM prescriptions WHERE DATE(prescriptionDate) BETWEEN ? AND ?`,
      [start, end]
    ),
    patientsRegistered: await q(
      `SELECT COUNT(*) AS count FROM patients WHERE voided = 0 AND DATE(createdAt) BETWEEN ? AND ?`,
      [start, end]
    ),
    encounters: await q(
      `SELECT COUNT(*) AS count FROM medical_records WHERE DATE(visitDate) BETWEEN ? AND ?`,
      [start, end]
    ),
    idsrAlerts: await q(
      `SELECT COUNT(*) AS count FROM idsr_alerts WHERE DATE(createdAt) BETWEEN ? AND ?`,
      [start, end]
    ),
  };
}

function buildDhis2Package({ period, orgUnit, metrics, mflCode }) {
  const dataValues = [
    { dataElement: 'HMIS_OPD', value: metrics.outpatients },
    { dataElement: 'HMIS_IPD', value: metrics.inpatients },
    { dataElement: 'HMIS_DELIV', value: metrics.deliveries },
    { dataElement: 'HMIS_LAB', value: metrics.labOrders },
    { dataElement: 'HMIS_RX', value: metrics.prescriptions },
    { dataElement: 'HMIS_REG', value: metrics.patientsRegistered },
    { dataElement: 'HMIS_ENC', value: metrics.encounters },
    { dataElement: 'HMIS_IDSR', value: metrics.idsrAlerts },
  ].map((dv) => ({
    ...dv,
    period,
    orgUnit: orgUnit || mflCode || 'UNKNOWN',
  }));

  return {
    dataSet: 'HMIS_AGG',
    completeDate: new Date().toISOString().slice(0, 10),
    period,
    orgUnit: orgUnit || mflCode || 'UNKNOWN',
    attributeOptionCombo: 'default',
    dataValues,
    meta: {
      source: FHIR_META_SOURCE,
      generatedAt: new Date().toISOString(),
      metrics,
    },
  };
}

function buildSdmxHdXml(pkg) {
  // Minimal SDMX-HD-inspired DataSet XML for certification evidence / offline transfer
  const series = (pkg.dataValues || [])
    .map(
      (dv) => `    <Series DATAELEMENT="${escapeXml(dv.dataElement)}" ORGUNIT="${escapeXml(dv.orgUnit)}" PERIOD="${escapeXml(dv.period)}">
      <Obs VALUE="${Number(dv.value) || 0}"/>
    </Series>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<SDMX-HD xmlns="urn:sdmx:org.sdmx.infomodel.datastructure.DataSet=HMIS:HMIS_AGG:1.0">
  <Header>
    <ID>HMIS-${escapeXml(pkg.period)}</ID>
    <Test>true</Test>
    <Prepared>${escapeXml(pkg.meta?.generatedAt || new Date().toISOString())}</Prepared>
    <Sender id="KAKAMEGA-HMIS"/>
  </Header>
  <DataSet>
${series}
  </DataSet>
</SDMX-HD>
`;
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function postLive(settings, pkg) {
  const base = process.env.DHIS2_BASE_URL || settings?.dhis2BaseUrl || '';
  if (!base) throw new Error('DHIS2_BASE_URL not configured for live mode');
  const url = new URL('api/dataValueSets', base.endsWith('/') ? base : `${base}/`);
  const auth = process.env.DHIS2_API_KEY || process.env.DHIS2_BASIC_AUTH || '';
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (auth) {
    headers.Authorization = auth.includes(' ') ? auth : `Bearer ${auth}`;
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(pkg),
  });
  const body = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body: body.slice(0, 400) };
}

async function exportPeriod(executor, { period: periodInput, format = 'json' } = {}) {
  const settings = await loadSettings(executor);
  const mode = resolveMode(settings);
  if (mode === 'disabled') return { skipped: true, mode };

  const period = monthPeriod(periodInput);
  const { start, end } = periodBounds(period);
  const metrics = await gatherMetrics(executor, start, end);

  let mflCode = null;
  try {
    const [b] = await (executor || pool).execute(
      `SELECT mflCode FROM branches WHERE isMainBranch = 1 AND isActive = 1 LIMIT 1`
    );
    mflCode = b[0]?.mflCode || null;
  } catch {
    /* ignore */
  }

  const orgUnit = process.env.DHIS2_ORG_UNIT || settings?.dhis2OrgUnit || mflCode;
  const pkg = buildDhis2Package({ period, orgUnit, metrics, mflCode });
  const sdmx = format === 'sdmx-hd' ? buildSdmxHdXml(pkg) : null;

  let status = 'built';
  let httpStatus = null;
  let responseSummary = null;

  if (mode === 'live' && format === 'json') {
    try {
      const result = await postLive(settings, pkg);
      status = result.ok ? 'published' : 'failed';
      httpStatus = result.status;
      responseSummary = result.body;
    } catch (err) {
      status = 'failed';
      responseSummary = err.message || String(err);
    }
  } else if (mode === 'sandbox') {
    status = 'published';
    httpStatus = 200;
    responseSummary = format === 'sdmx-hd' ? 'sandbox SDMX-HD package' : 'sandbox DHIS2 package';
  }

  const storeJson = format === 'sdmx-hd' ? { ...pkg, sdmxHdXml: sdmx } : pkg;
  const db = executor || pool;
  const [ins] = await db.execute(
    `INSERT INTO dhis2_export_log
      (period, datasetCode, orgUnit, mode, status, format, httpStatus, responseSummary, packageJson, publishedAt)
     VALUES (?, 'HMIS_AGG', ?, ?, ?, ?, ?, ?, ?, ${status === 'published' ? 'NOW()' : 'NULL'})`,
    [
      period,
      orgUnit || null,
      mode,
      status,
      format === 'sdmx-hd' ? 'sdmx-hd' : 'json',
      httpStatus,
      responseSummary,
      JSON.stringify(storeJson),
    ]
  );

  try {
    await enqueueOutboxEvent(db, {
      eventType: 'dhis2.export',
      aggregateType: 'dhis2_export',
      aggregateId: ins.insertId,
      payload: {
        exportId: ins.insertId,
        period,
        orgUnit,
        mode,
        status,
        format,
        metrics,
      },
    });
  } catch (err) {
    console.warn('[dhis2] outbox skipped:', err.message || err);
  }

  return {
    mode,
    status,
    exportId: ins.insertId,
    period,
    orgUnit,
    format,
    package: pkg,
    sdmxHdXml: sdmx,
    metrics,
  };
}

module.exports = {
  loadSettings,
  resolveMode,
  exportPeriod,
  buildDhis2Package,
  buildSdmxHdXml,
  monthPeriod,
  gatherMetrics,
};
