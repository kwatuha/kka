/**
 * HL7 v2.5 ORU^R01 lab result message (sandbox / DHA evidence).
 * Prefer FHIR Observation for national HIE; this supports HL7 attestation demos.
 */
const { FHIR_META_SOURCE, APP_BRAND } = require('./productBrand');

function hl7Escape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\E\\')
    .replace(/\|/g, '\\F\\')
    .replace(/\^/g, '\\S\\')
    .replace(/&/g, '\\T\\')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
}

function formatHl7Date(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return formatHl7Date(new Date());
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function segment(type, fields) {
  return `${type}|${fields.map((f) => hl7Escape(f)).join('|')}`;
}

/**
 * @param {object} row from loadLabResultRow
 */
function buildOruR01(row) {
  const controlId = `ORU${row.resultId}-${Date.now()}`;
  const ts = formatHl7Date(row.testDate || row.createdAt);
  const sendingApp = APP_BRAND.slice(0, 20);
  const sendingFac = row.mflCode || row.branchName || 'FACILITY';
  const patientName = `${row.patientLastName || ''}^${row.patientFirstName || ''}`;
  const patientId = String(row.patientId || '');
  const loinc = row.loincCode || row.testCode || 'UNKNOWN';
  const testName = row.testName || 'Laboratory test';

  const lines = [
    segment('MSH', [
      '^~\\&',
      sendingApp,
      sendingFac,
      'RECEIVER',
      'LAB',
      ts,
      '',
      'ORU^R01^ORU_R01',
      controlId,
      'P',
      '2.5',
    ]),
    segment('PID', ['1', '', `${patientId}^^^${sendingFac}`, '', patientName, '', '', '', '', '']),
    segment('OBR', [
      '1',
      String(row.orderNumber || row.orderId || ''),
      String(row.resultId),
      `${loinc}^${testName}^LN`,
      '',
      ts,
    ]),
  ];

  const values = row.values || [];
  if (!values.length) {
    lines.push(segment('OBX', ['1', 'ST', `${loinc}^${testName}^LN`, '', 'See narrative', '', '', 'F']));
  } else {
    values.forEach((v, idx) => {
      const code = v.parameterName || `OBX${idx + 1}`;
      lines.push(
        segment('OBX', [
          String(idx + 1),
          'NM',
          `${code}^${v.parameterName || code}^L`,
          '',
          v.value != null ? String(v.value) : '',
          v.unit || '',
          v.normalRange || '',
          v.flag || '',
          'F',
        ])
      );
    });
  }

  const message = lines.join('\r');
  return {
    messageType: 'ORU^R01',
    controlId,
    encoding: 'HL7 v2.5',
    source: FHIR_META_SOURCE,
    generatedAt: new Date().toISOString(),
    hl7: message,
  };
}

module.exports = { buildOruR01, formatHl7Date };
