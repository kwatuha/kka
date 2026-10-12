/**
 * Clinical quality measure starter — computed from HMIS data (no national CQM API).
 */
const pool = require('../config/db');

function parsePeriod(startDate, endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getFullYear(), end.getMonth(), 1);
  const sd = start.toISOString().slice(0, 10);
  const ed = end.toISOString().slice(0, 10);
  return { startDate: sd, endDate: ed, label: `${sd} to ${ed}` };
}

async function computeCqmPackage(executor, options = {}) {
  const db = executor || pool;
  const { startDate, endDate, label } = parsePeriod(options.startDate, options.endDate);

  const [[patientsRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM patients WHERE voided = 0 AND DATE(createdAt) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const [[encRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM medical_records WHERE DATE(visitDate) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const [[tbDocRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM medical_records
     WHERE DATE(visitDate) BETWEEN ? AND ?
       AND (tbScreening IS NOT NULL AND tbScreening != '' OR tbScreenCough IS NOT NULL)`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const encounters = Number(encRow?.c || 0);
  const tbDocumented = Number(tbDocRow?.c || 0);

  const [[probRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM patient_problems WHERE voided = 0 AND status = 'active'`
  ).catch(() => [[{ c: 0 }]]);

  const [[idsrRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM idsr_alerts WHERE DATE(createdAt) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const [[rxRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM prescriptions WHERE DATE(createdAt) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const [[ancRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM antenatal_visits WHERE DATE(visitDate) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const [[pncRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM postnatal_visits WHERE DATE(visitDate) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const [[snomedRow]] = await db.execute(
    `SELECT COUNT(*) AS c FROM patient_problems
     WHERE voided = 0 AND status = 'active' AND snomedCode IS NOT NULL AND snomedCode != ''`
  ).catch(() => [[{ c: 0 }]]);

  const [[pedsVitalsRow]] = await db.execute(
    `SELECT COUNT(DISTINCT vs.patientId) AS c
     FROM vital_signs vs
     INNER JOIN patients p ON p.patientId = vs.patientId AND p.voided = 0
     WHERE vs.weight IS NOT NULL AND vs.weight > 0 AND vs.height IS NOT NULL AND vs.height > 0
       AND p.dateOfBirth IS NOT NULL
       AND TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURDATE()) < 20
       AND DATE(vs.recordedDate) BETWEEN ? AND ?`,
    [startDate, endDate]
  ).catch(() => [[{ c: 0 }]]);

  const indicators = [
    {
      id: 'HMIS-CQM-001',
      name: 'New patients registered',
      numerator: Number(patientsRow?.c || 0),
      denominator: null,
      unit: 'patients',
      category: 'Registration',
    },
    {
      id: 'HMIS-CQM-002',
      name: 'Clinical encounters documented',
      numerator: encounters,
      denominator: null,
      unit: 'encounters',
      category: 'Clinical documentation',
    },
    {
      id: 'HMIS-CQM-003',
      name: 'TB screening documented on encounter',
      numerator: tbDocumented,
      denominator: encounters || null,
      rate: encounters ? Math.round((tbDocumented / encounters) * 1000) / 10 : null,
      unit: 'percent',
      category: 'Public health',
    },
    {
      id: 'HMIS-CQM-004',
      name: 'Active structured problems on problem list',
      numerator: Number(probRow?.c || 0),
      denominator: null,
      unit: 'problems',
      category: 'Problem list',
    },
    {
      id: 'HMIS-CQM-005',
      name: 'IDSR alerts generated',
      numerator: Number(idsrRow?.c || 0),
      denominator: null,
      unit: 'alerts',
      category: 'Surveillance',
    },
    {
      id: 'HMIS-CQM-006',
      name: 'Prescriptions issued',
      numerator: Number(rxRow?.c || 0),
      denominator: null,
      unit: 'prescriptions',
      category: 'Medication',
    },
    {
      id: 'HMIS-CQM-007',
      name: 'Antenatal care visits documented',
      numerator: Number(ancRow?.c || 0),
      denominator: null,
      unit: 'visits',
      category: 'MCH',
    },
    {
      id: 'HMIS-CQM-008',
      name: 'Active problems with SNOMED code',
      numerator: Number(snomedRow?.c || 0),
      denominator: Number(probRow?.c || 0) || null,
      rate:
        probRow?.c > 0
          ? Math.round((Number(snomedRow?.c || 0) / Number(probRow.c)) * 1000) / 10
          : null,
      unit: 'percent',
      category: 'Terminology',
    },
    {
      id: 'HMIS-CQM-009',
      name: 'Pediatric patients with weight+height vitals (under 20y)',
      numerator: Number(pedsVitalsRow?.c || 0),
      denominator: null,
      unit: 'patients',
      category: 'MCH / growth',
    },
    {
      id: 'HMIS-CQM-010',
      name: 'Postnatal care visits documented',
      numerator: Number(pncRow?.c || 0),
      denominator: null,
      unit: 'visits',
      category: 'MCH',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    period: { startDate, endDate, label },
    indicators,
    disclaimer:
      'Starter CQM package for internal and assessor export. Not electronic submission to a national CQM registry.',
  };
}

function indicatorsToCsv(pkg) {
  const lines = [
    'indicator_id,name,category,numerator,denominator,rate_percent,period_start,period_end',
  ];
  for (const i of pkg.indicators) {
    lines.push(
      [
        i.id,
        `"${String(i.name).replace(/"/g, '""')}"`,
        i.category,
        i.numerator,
        i.denominator ?? '',
        i.rate ?? '',
        pkg.period.startDate,
        pkg.period.endDate,
      ].join(',')
    );
  }
  return lines.join('\n');
}

module.exports = { computeCqmPackage, indicatorsToCsv, parsePeriod };
