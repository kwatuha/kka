const { sendMail, smtpConfigured } = require('./smtpMailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function facilityName() {
  return (
    process.env.SMS_FACILITY_NAME ||
    process.env.APP_NAME ||
    process.env.NEXT_PUBLIC_PRODUCT_NAME ||
    'AZ CarePlus'
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

function kes(n) {
  const v = parseFloat(String(n || 0)) || 0;
  return `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function payslipPlainText(row) {
  const lines = [
    `${facilityName()} — Payslip`,
    '',
    `Employee: ${row.employeeName}`,
    `Employee #: ${row.employeeNumber || '—'}`,
    `Payroll #: ${row.payrollNumber}`,
    `Period: ${fmtDate(row.payPeriodStart)} – ${fmtDate(row.payPeriodEnd)}`,
    `Pay date: ${fmtDate(row.paymentDate)}`,
    '',
    `Gross pay: ${kes(row.grossSalary)}`,
    `Net pay: ${kes(row.netSalary)}`,
    '',
    'See attached PDF for full breakdown.',
    '',
    'Confidential — for the addressee only.',
  ];
  return lines.join('\n');
}

/**
 * @param {object} row payroll transaction row
 * @param {string} pdfBase64
 */
async function sendPayslipEmail(row, toEmail, pdfBase64, opts = {}) {
  const to = String(toEmail || '').trim();
  if (!EMAIL_RE.test(to)) {
    return { ok: false, error: 'invalid_email', payrollId: row.payrollId };
  }
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured', payrollId: row.payrollId };
  }
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return { ok: false, error: 'missing_pdf', payrollId: row.payrollId };
  }

  const period = `${fmtDate(row.payPeriodStart)} – ${fmtDate(row.payPeriodEnd)}`;
  const subject =
    opts.subject ||
    `Payslip ${row.payrollNumber || ''} — ${period}`.trim().replace(/\s+/g, ' ');
  const text = opts.message
    ? `${opts.message}\n\n${payslipPlainText(row)}`
    : payslipPlainText(row);

  const filename = `payslip-${String(row.payrollNumber || row.payrollId).replace(/[^\w.-]+/g, '-')}.pdf`;

  const result = await sendMail({
    to,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    ok: result.ok,
    error: result.error,
    payrollId: row.payrollId,
    email: to,
    messageId: result.messageId,
  };
}

module.exports = { sendPayslipEmail, EMAIL_RE, payslipPlainText };
