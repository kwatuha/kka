const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { computeKenyaStatutoryDeductions } = require('../lib/kenyaStatutoryPayroll');
const { previewBatch, commitBatch } = require('../lib/payrollBatchService');
const {
    getActiveStatutoryRateSet,
    listRateSets,
    getRateSetById,
    createRateSet,
    updateRateSet,
    archiveRateSet,
} = require('../lib/statutoryRateSets');
const { sendPayslipEmail, EMAIL_RE } = require('../lib/payslipEmail');
const { smtpConfigured } = require('../lib/smtpMailer');

function userIdFromReq(req) {
    return req.user?.id || req.user?.userId || null;
}

function csvEscape(val) {
    const s = val == null ? '' : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/**
 * @route GET /api/payroll/statutory-rates
 */
router.get('/statutory-rates', async (req, res) => {
    try {
        const includeArchived = req.query.includeArchived === '1' || req.query.includeArchived === 'true';
        const rateSets = await listRateSets(pool, { includeArchived });
        res.status(200).json({ rateSets });
    } catch (error) {
        console.error('Error listing statutory rate sets:', error);
        res.status(500).json({ message: 'Error listing statutory rate sets', error: error.message });
    }
});

/**
 * @route GET /api/payroll/statutory-rates/active
 */
router.get('/statutory-rates/active', async (req, res) => {
    try {
        const asOf = req.query.asOf || new Date().toISOString().slice(0, 10);
        const config = await getActiveStatutoryRateSet(pool, asOf);
        res.status(200).json({ asOf, rateSet: config });
    } catch (error) {
        console.error('Error resolving active statutory rate set:', error);
        res.status(500).json({ message: 'Error resolving active statutory rate set', error: error.message });
    }
});

/**
 * @route GET /api/payroll/statutory-rates/:rateSetId
 */
router.get('/statutory-rates/:rateSetId', async (req, res) => {
    try {
        const row = await getRateSetById(pool, req.params.rateSetId);
        if (!row) return res.status(404).json({ message: 'Rate set not found' });
        res.status(200).json(row);
    } catch (error) {
        console.error('Error fetching statutory rate set:', error);
        res.status(500).json({ message: 'Error fetching statutory rate set', error: error.message });
    }
});

/**
 * @route POST /api/payroll/statutory-rates
 */
router.post('/statutory-rates', async (req, res) => {
    try {
        const created = await createRateSet(pool, req.body, userIdFromReq(req));
        res.status(201).json(created);
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) console.error('Error creating statutory rate set:', error);
        res.status(status).json({ message: error.message || 'Error creating statutory rate set' });
    }
});

/**
 * @route PUT /api/payroll/statutory-rates/:rateSetId
 */
router.put('/statutory-rates/:rateSetId', async (req, res) => {
    try {
        const updated = await updateRateSet(pool, req.params.rateSetId, req.body);
        res.status(200).json(updated);
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) console.error('Error updating statutory rate set:', error);
        res.status(status).json({ message: error.message || 'Error updating statutory rate set' });
    }
});

/**
 * @route POST /api/payroll/statutory-rates/:rateSetId/archive
 */
router.post('/statutory-rates/:rateSetId/archive', async (req, res) => {
    try {
        const archived = await archiveRateSet(pool, req.params.rateSetId);
        res.status(200).json(archived);
    } catch (error) {
        console.error('Error archiving statutory rate set:', error);
        res.status(500).json({ message: 'Error archiving statutory rate set', error: error.message });
    }
});

/**
 * @route GET /api/payroll/transactions
 */
router.get('/transactions', async (req, res) => {
    try {
        const { startDate, endDate, status, departmentId, payrollRunId, search, page = 1, limit = 100 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let query = `
            SELECT
                pt.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) AS employeeName,
                e.employeeNumber,
                e.email,
                d.departmentName,
                es.bankName,
                es.bankAccount,
                es.bankBranch
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_salaries es ON pt.salaryId = es.salaryId
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ' AND pt.payPeriodStart >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND pt.payPeriodEnd <= ?';
            params.push(endDate);
        }
        if (status) {
            query += ' AND pt.paymentStatus = ?';
            params.push(status);
        }
        if (departmentId) {
            query += ' AND e.departmentId = ?';
            params.push(parseInt(departmentId, 10));
        }
        if (payrollRunId) {
            query += ' AND pt.payrollRunId = ?';
            params.push(parseInt(payrollRunId, 10));
        }
        if (search) {
            query += ` AND (
                e.firstName LIKE ? OR e.lastName LIKE ? OR e.employeeNumber LIKE ? OR pt.payrollNumber LIKE ?
            )`;
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        query += ' ORDER BY pt.payPeriodStart DESC, pt.payrollId DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);

        let countQuery = `
            SELECT COUNT(*) AS total
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            WHERE 1=1
        `;
        const countParams = [];
        if (startDate) {
            countQuery += ' AND pt.payPeriodStart >= ?';
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += ' AND pt.payPeriodEnd <= ?';
            countParams.push(endDate);
        }
        if (status) {
            countQuery += ' AND pt.paymentStatus = ?';
            countParams.push(status);
        }
        if (departmentId) {
            countQuery += ' AND e.departmentId = ?';
            countParams.push(parseInt(departmentId, 10));
        }
        if (payrollRunId) {
            countQuery += ' AND pt.payrollRunId = ?';
            countParams.push(parseInt(payrollRunId, 10));
        }
        if (search) {
            countQuery += ` AND (
                e.firstName LIKE ? OR e.lastName LIKE ? OR e.employeeNumber LIKE ? OR pt.payrollNumber LIKE ?
            )`;
            const term = `%${search}%`;
            countParams.push(term, term, term, term);
        }

        const [countRows] = await pool.query(countQuery, countParams);

        res.status(200).json({
            transactions: rows,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total: countRows[0]?.total || 0,
            },
        });
    } catch (error) {
        console.error('Error listing payroll transactions:', error);
        res.status(500).json({ message: 'Error listing payroll transactions', error: error.message });
    }
});

/**
 * @route GET /api/payroll/transactions/:payrollId
 */
router.get('/transactions/:payrollId', async (req, res) => {
    try {
        const { payrollId } = req.params;
        const [rows] = await pool.execute(
            `SELECT
                pt.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) AS employeeName,
                e.employeeNumber,
                e.email,
                e.phone,
                d.departmentName,
                es.bankName,
                es.bankAccount,
                es.bankBranch
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_salaries es ON pt.salaryId = es.salaryId
            WHERE pt.payrollId = ?`,
            [parseInt(payrollId, 10)]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Payroll not found' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching payroll:', error);
        res.status(500).json({ message: 'Error fetching payroll', error: error.message });
    }
});

/**
 * @route GET /api/payroll/summary
 */
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        let query = `
            SELECT
                COUNT(*) AS headcount,
                COALESCE(SUM(grossSalary), 0) AS totalGross,
                COALESCE(SUM(netSalary), 0) AS totalNet,
                COALESCE(SUM(tax), 0) AS totalPaye,
                COALESCE(SUM(nssf), 0) AS totalNssf,
                COALESCE(SUM(nhif), 0) AS totalShif,
                COALESCE(SUM(otherDeductions), 0) AS totalHousingAndOther,
                COALESCE(SUM(deductions), 0) AS totalVoluntaryDeductions,
                SUM(CASE WHEN paymentStatus = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
                SUM(CASE WHEN paymentStatus = 'paid' THEN 1 ELSE 0 END) AS paidCount
            FROM payroll_transactions pt
            WHERE paymentStatus != 'cancelled'
        `;
        const params = [];
        if (startDate) {
            query += ' AND pt.payPeriodStart >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND pt.payPeriodEnd <= ?';
            params.push(endDate);
        }
        if (status) {
            query += ' AND pt.paymentStatus = ?';
            params.push(status);
        }
        const [rows] = await pool.query(query, params);
        res.status(200).json(rows[0] || {});
    } catch (error) {
        console.error('Error fetching payroll summary:', error);
        res.status(500).json({ message: 'Error fetching payroll summary', error: error.message });
    }
});

/**
 * @route POST /api/payroll/statutory-preview
 */
router.post('/statutory-preview', async (req, res) => {
    try {
        const grossPay = parseFloat(req.body.grossPay);
        if (!grossPay || grossPay <= 0) {
            return res.status(400).json({ message: 'grossPay must be a positive number' });
        }
        const asOf = req.body.asOf || req.body.payPeriodEnd || new Date().toISOString().slice(0, 10);
        const config = await getActiveStatutoryRateSet(pool, asOf);
        res.status(200).json(computeKenyaStatutoryDeductions({ grossPay }, config));
    } catch (error) {
        console.error('Error in statutory preview:', error);
        res.status(500).json({ message: 'Error in statutory preview', error: error.message });
    }
});

/**
 * @route POST /api/payroll/batch/preview
 */
router.post('/batch/preview', async (req, res) => {
    try {
        const { payPeriodStart, payPeriodEnd, paymentDate } = req.body;
        if (!payPeriodStart || !payPeriodEnd || !paymentDate) {
            return res.status(400).json({ message: 'payPeriodStart, payPeriodEnd, and paymentDate are required' });
        }
        const conn = await pool.getConnection();
        try {
            const preview = await previewBatch(conn, {
                payPeriodStart,
                payPeriodEnd,
                paymentDate,
                departmentId: req.body.departmentId,
                employeeIds: req.body.employeeIds,
                includeOnLeave: req.body.includeOnLeave !== false,
                applyStatutory: req.body.applyStatutory !== false,
                employeeAdjustments: req.body.employeeAdjustments || {},
            });
            res.status(200).json(preview);
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error previewing payroll batch:', error);
        res.status(500).json({ message: 'Error previewing payroll batch', error: error.message });
    }
});

/**
 * @route POST /api/payroll/batch/run
 */
router.post('/batch/run', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { payPeriodStart, payPeriodEnd, paymentDate } = req.body;
        if (!payPeriodStart || !payPeriodEnd || !paymentDate) {
            return res.status(400).json({ message: 'payPeriodStart, payPeriodEnd, and paymentDate are required' });
        }
        await conn.beginTransaction();
        const result = await commitBatch(
            conn,
            {
                payPeriodStart,
                payPeriodEnd,
                paymentDate,
                departmentId: req.body.departmentId,
                employeeIds: req.body.employeeIds,
                includeOnLeave: req.body.includeOnLeave !== false,
                applyStatutory: req.body.applyStatutory !== false,
                employeeAdjustments: req.body.employeeAdjustments || {},
                notes: req.body.notes,
            },
            userIdFromReq(req)
        );
        await conn.commit();
        res.status(201).json(result);
    } catch (error) {
        await conn.rollback();
        console.error('Error running payroll batch:', error);
        res.status(500).json({ message: 'Error running payroll batch', error: error.message });
    } finally {
        conn.release();
    }
});

/**
 * @route GET /api/payroll/runs
 */
router.get('/runs', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [rows] = await pool.query(
            `SELECT pr.*, u.username AS createdByUsername
             FROM payroll_runs pr
             LEFT JOIN users u ON pr.createdBy = u.userId
             ORDER BY pr.createdAt DESC
             LIMIT ? OFFSET ?`,
            [Number(limit), offset]
        );
        const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM payroll_runs');
        res.status(200).json({
            runs: rows,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total: countRows[0]?.total || 0,
            },
        });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ runs: [], pagination: { page: 1, limit: 20, total: 0 } });
        }
        console.error('Error listing payroll runs:', error);
        res.status(500).json({ message: 'Error listing payroll runs', error: error.message });
    }
});

/**
 * @route GET /api/payroll/runs/:runId
 */
router.get('/runs/:runId', async (req, res) => {
    try {
        const runId = parseInt(req.params.runId, 10);
        const [runs] = await pool.execute('SELECT * FROM payroll_runs WHERE runId = ?', [runId]);
        if (runs.length === 0) {
            return res.status(404).json({ message: 'Payroll run not found' });
        }
        const [lines] = await pool.execute(
            `SELECT
                pt.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) AS employeeName,
                e.employeeNumber
             FROM payroll_transactions pt
             JOIN employees e ON pt.employeeId = e.employeeId
             WHERE pt.payrollRunId = ?
             ORDER BY e.lastName, e.firstName`,
            [runId]
        );
        res.status(200).json({ run: runs[0], lines });
    } catch (error) {
        console.error('Error fetching payroll run:', error);
        res.status(500).json({ message: 'Error fetching payroll run', error: error.message });
    }
});

/**
 * @route POST /api/payroll/runs/:runId/mark-paid
 */
router.post('/runs/:runId/mark-paid', async (req, res) => {
    try {
        const runId = parseInt(req.params.runId, 10);
        const processedBy = userIdFromReq(req);
        const referenceNumber = req.body.referenceNumber || null;

        await pool.execute(
            `UPDATE payroll_transactions
             SET paymentStatus = 'paid', processedBy = ?, processedDate = NOW(), referenceNumber = COALESCE(?, referenceNumber)
             WHERE payrollRunId = ? AND paymentStatus IN ('pending', 'processed')`,
            [processedBy, referenceNumber, runId]
        );
        await pool.execute(`UPDATE payroll_runs SET status = 'paid' WHERE runId = ?`, [runId]);

        const [runs] = await pool.execute('SELECT * FROM payroll_runs WHERE runId = ?', [runId]);
        res.status(200).json({ run: runs[0] });
    } catch (error) {
        console.error('Error marking payroll run paid:', error);
        res.status(500).json({ message: 'Error marking payroll run paid', error: error.message });
    }
});

/**
 * @route POST /api/payroll/bulk-status
 */
router.post('/bulk-status', async (req, res) => {
    try {
        const { payrollIds, paymentStatus, referenceNumber } = req.body;
        if (!Array.isArray(payrollIds) || payrollIds.length === 0 || !paymentStatus) {
            return res.status(400).json({ message: 'payrollIds array and paymentStatus are required' });
        }
        const processedBy = userIdFromReq(req);
        const placeholders = payrollIds.map(() => '?').join(',');
        await pool.query(
            `UPDATE payroll_transactions
             SET paymentStatus = ?, processedBy = ?, processedDate = NOW(), referenceNumber = COALESCE(?, referenceNumber)
             WHERE payrollId IN (${placeholders})`,
            [paymentStatus, processedBy, referenceNumber || null, ...payrollIds.map((id) => parseInt(id, 10))]
        );
        res.status(200).json({ updated: payrollIds.length });
    } catch (error) {
        console.error('Error bulk updating payroll:', error);
        res.status(500).json({ message: 'Error bulk updating payroll', error: error.message });
    }
});

async function fetchPayrollRow(payrollId) {
    const [rows] = await pool.execute(
        `SELECT
            pt.*,
            CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) AS employeeName,
            e.employeeNumber,
            e.email,
            d.departmentName,
            es.bankName,
            es.bankAccount,
            es.bankBranch
        FROM payroll_transactions pt
        JOIN employees e ON pt.employeeId = e.employeeId
        LEFT JOIN departments d ON e.departmentId = d.departmentId
        LEFT JOIN employee_salaries es ON pt.salaryId = es.salaryId
        WHERE pt.payrollId = ?`,
        [parseInt(payrollId, 10)]
    );
    return rows[0] || null;
}

/**
 * @route POST /api/payroll/payslips/email
 * @description Send one payslip PDF to an address (PDF generated client-side).
 */
router.post('/payslips/email', async (req, res) => {
    try {
        if (!smtpConfigured()) {
            return res.status(503).json({ message: 'Email is not configured (set SMTP_HOST on the API server).' });
        }
        const { payrollId, email, pdfBase64, subject, message } = req.body || {};
        if (!payrollId || !email || !pdfBase64) {
            return res.status(400).json({ message: 'payrollId, email, and pdfBase64 are required' });
        }
        if (!EMAIL_RE.test(String(email).trim())) {
            return res.status(400).json({ message: 'Invalid email address' });
        }
        const row = await fetchPayrollRow(payrollId);
        if (!row) {
            return res.status(404).json({ message: 'Payroll not found' });
        }
        const result = await sendPayslipEmail(row, email, pdfBase64, { subject, message });
        if (!result.ok) {
            const status = result.error === 'smtp_not_configured' ? 503 : 400;
            return res.status(status).json({ message: result.error || 'Send failed', ...result });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Error sending payslip email:', error);
        res.status(500).json({ message: 'Error sending payslip email', error: error.message });
    }
});

/**
 * @route POST /api/payroll/payslips/email-bulk
 */
router.post('/payslips/email-bulk', async (req, res) => {
    try {
        if (!smtpConfigured()) {
            return res.status(503).json({ message: 'Email is not configured (set SMTP_HOST on the API server).' });
        }
        const { items, subject, message } = req.body || {};
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'items array is required' });
        }
        const results = [];
        for (const item of items) {
            if (item && item.send === false) continue;
            const payrollId = item?.payrollId;
            const email = String(item?.email || '').trim();
            const pdfBase64 = item?.pdfBase64;
            if (!payrollId || !email || !pdfBase64) {
                results.push({ payrollId, ok: false, error: 'missing_fields' });
                continue;
            }
            if (!EMAIL_RE.test(email)) {
                results.push({ payrollId, ok: false, error: 'invalid_email', email });
                continue;
            }
            const row = await fetchPayrollRow(payrollId);
            if (!row) {
                results.push({ payrollId, ok: false, error: 'not_found' });
                continue;
            }
            const result = await sendPayslipEmail(row, email, pdfBase64, { subject, message });
            results.push(result);
        }
        const sent = results.filter((r) => r.ok).length;
        const failed = results.length - sent;
        res.status(200).json({ results, sent, failed });
    } catch (error) {
        console.error('Error bulk sending payslip emails:', error);
        res.status(500).json({ message: 'Error bulk sending payslip emails', error: error.message });
    }
});

/**
 * @route GET /api/payroll/export/bank
 */
router.get('/export/bank', async (req, res) => {
    try {
        const { startDate, endDate, payrollRunId, status = 'pending' } = req.query;
        let query = `
            SELECT
                pt.payrollNumber,
                e.employeeNumber,
                CONCAT(e.firstName, ' ', e.lastName) AS employeeName,
                pt.netSalary,
                es.bankName,
                es.bankAccount,
                es.bankBranch,
                pt.paymentDate
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            LEFT JOIN employee_salaries es ON pt.salaryId = es.salaryId
            WHERE pt.paymentStatus = ?
        `;
        const params = [status];
        if (payrollRunId) {
            query += ' AND pt.payrollRunId = ?';
            params.push(parseInt(payrollRunId, 10));
        }
        if (startDate) {
            query += ' AND pt.payPeriodStart >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND pt.payPeriodEnd <= ?';
            params.push(endDate);
        }
        query += ' ORDER BY e.lastName, e.firstName';

        const [rows] = await pool.query(query, params);
        const header = ['PayrollNumber', 'EmployeeNumber', 'EmployeeName', 'NetSalary', 'BankName', 'BankAccount', 'BankBranch', 'PaymentDate'];
        const lines = [header.join(',')];
        for (const row of rows) {
            lines.push(
                [
                    csvEscape(row.payrollNumber),
                    csvEscape(row.employeeNumber),
                    csvEscape(row.employeeName),
                    csvEscape(row.netSalary),
                    csvEscape(row.bankName),
                    csvEscape(row.bankAccount),
                    csvEscape(row.bankBranch),
                    csvEscape(row.paymentDate),
                ].join(',')
            );
        }
        const filename = `payroll-bank-export-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(lines.join('\n'));
    } catch (error) {
        console.error('Error exporting bank file:', error);
        res.status(500).json({ message: 'Error exporting bank file', error: error.message });
    }
});

module.exports = router;
