const { computeKenyaStatutoryDeductions } = require('./kenyaStatutoryPayroll');

function round2(n) {
    return Math.round(parseFloat(n || 0) * 100) / 100;
}

async function nextPayrollNumber(conn) {
    const [lastPayroll] = await conn.execute(
        'SELECT payrollNumber FROM payroll_transactions ORDER BY payrollId DESC LIMIT 1'
    );
    let payrollNumber = 'PAY-000001';
    if (lastPayroll.length > 0) {
        const lastNum = parseInt(String(lastPayroll[0].payrollNumber).split('-')[1], 10);
        if (!Number.isNaN(lastNum)) {
            payrollNumber = `PAY-${String(lastNum + 1).padStart(6, '0')}`;
        }
    }
    return payrollNumber;
}

async function nextRunNumber(conn, payPeriodStart) {
    const d = new Date(payPeriodStart);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `PR-${ym}-`;
    const [rows] = await conn.execute(
        'SELECT runNumber FROM payroll_runs WHERE runNumber LIKE ? ORDER BY runId DESC LIMIT 1',
        [`${prefix}%`]
    );
    let seq = 1;
    if (rows.length > 0) {
        const part = String(rows[0].runNumber).split('-').pop();
        const n = parseInt(part, 10);
        if (!Number.isNaN(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
}

async function hasPayrollForPeriod(conn, employeeId, payPeriodStart, payPeriodEnd) {
    const [rows] = await conn.execute(
        `SELECT payrollId FROM payroll_transactions
         WHERE employeeId = ? AND payPeriodStart = ? AND payPeriodEnd = ?
           AND paymentStatus != 'cancelled'
         LIMIT 1`,
        [employeeId, payPeriodStart, payPeriodEnd]
    );
    return rows.length > 0;
}

/**
 * Active employees with an active salary record effective for the pay period end date.
 */
async function listEligibleEmployees(conn, { departmentId, employeeIds, includeOnLeave = true } = {}) {
    let query = `
        SELECT
            e.employeeId,
            e.employeeNumber,
            CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) AS employeeName,
            e.status AS employmentStatus,
            e.departmentId,
            d.departmentName,
            es.salaryId,
            es.baseSalary,
            es.allowances,
            es.deductions,
            es.bankName,
            es.bankAccount,
            es.bankBranch,
            es.payFrequency
        FROM employees e
        INNER JOIN employee_salaries es ON es.employeeId = e.employeeId AND es.isActive = TRUE
        LEFT JOIN departments d ON e.departmentId = d.departmentId
        WHERE e.status IN ('active'${includeOnLeave ? ", 'on_leave'" : ''})
    `;
    const params = [];

    if (departmentId) {
        query += ' AND e.departmentId = ?';
        params.push(parseInt(departmentId, 10));
    }

    if (employeeIds && employeeIds.length > 0) {
        query += ` AND e.employeeId IN (${employeeIds.map(() => '?').join(',')})`;
        params.push(...employeeIds.map((id) => parseInt(id, 10)));
    }

    query += ' ORDER BY e.lastName, e.firstName';

    const [rows] = await conn.query(query, params);
    return rows;
}

function buildLineFromSalary(row, { payPeriodStart, payPeriodEnd, paymentDate, applyStatutory, adjustment = {}, statutoryConfig = null }) {
    const baseSalary = round2(adjustment.baseSalary ?? row.baseSalary);
    const allowances = round2(adjustment.allowances ?? row.allowances);
    const overtime = round2(adjustment.overtime ?? 0);
    const bonuses = round2(adjustment.bonuses ?? 0);
    const deductions = round2(adjustment.deductions ?? row.deductions);

    const grossSalary = round2(baseSalary + allowances + overtime + bonuses);

    let tax = round2(adjustment.tax ?? 0);
    let nhif = round2(adjustment.nhif ?? 0);
    let nssf = round2(adjustment.nssf ?? 0);
    let otherDeductions = round2(adjustment.otherDeductions ?? 0);

    if (applyStatutory && grossSalary > 0 && adjustment.tax === undefined) {
        const stat = computeKenyaStatutoryDeductions({ grossPay: grossSalary }, statutoryConfig);
        tax = stat.paye;
        nhif = stat.shif;
        nssf = stat.nssfEmployee;
        otherDeductions = round2(otherDeductions + stat.housingLevyEmployee);
    }

    const totalDeductions = round2(deductions + tax + nhif + nssf + otherDeductions);
    const netSalary = round2(grossSalary - totalDeductions);

    return {
        employeeId: row.employeeId,
        employeeNumber: row.employeeNumber,
        employeeName: row.employeeName,
        employmentStatus: row.employmentStatus,
        departmentName: row.departmentName,
        salaryId: row.salaryId,
        payPeriodStart,
        payPeriodEnd,
        paymentDate,
        baseSalary,
        allowances,
        overtime,
        bonuses,
        deductions,
        tax,
        nhif,
        nssf,
        otherDeductions,
        grossSalary,
        netSalary,
        bankName: row.bankName,
        bankAccount: row.bankAccount,
        bankBranch: row.bankBranch,
    };
}

async function previewBatch(conn, options) {
    const {
        payPeriodStart,
        payPeriodEnd,
        paymentDate,
        departmentId,
        employeeIds,
        includeOnLeave = true,
        applyStatutory = true,
        employeeAdjustments = {},
    } = options;

    const employees = await listEligibleEmployees(conn, { departmentId, employeeIds, includeOnLeave });
    const { getActiveStatutoryRateSet } = require('./statutoryRateSets');
    const statutoryConfig = applyStatutory
        ? await getActiveStatutoryRateSet(conn, payPeriodEnd)
        : null;
    const lines = [];
    const skipped = [];
    const errors = [];

    for (const emp of employees) {
        try {
            const exists = await hasPayrollForPeriod(conn, emp.employeeId, payPeriodStart, payPeriodEnd);
            if (exists) {
                skipped.push({
                    employeeId: emp.employeeId,
                    employeeName: emp.employeeName,
                    reason: 'Payroll already exists for this period',
                });
                continue;
            }
            const adj = employeeAdjustments[String(emp.employeeId)] || employeeAdjustments[emp.employeeId] || {};
            const line = buildLineFromSalary(emp, {
                payPeriodStart,
                payPeriodEnd,
                paymentDate,
                applyStatutory,
                adjustment: adj,
                statutoryConfig,
            });
            lines.push(line);
        } catch (err) {
            errors.push({
                employeeId: emp.employeeId,
                employeeName: emp.employeeName,
                reason: err.message || 'Failed to build payroll line',
            });
        }
    }

    const totals = lines.reduce(
        (acc, l) => {
            acc.totalGross += l.grossSalary;
            acc.totalNet += l.netSalary;
            acc.totalPaye += l.tax;
            acc.totalNssf += l.nssf;
            acc.totalShif += l.nhif;
            acc.totalHousingLevy += l.otherDeductions;
            acc.totalOtherDeductions += l.deductions;
            return acc;
        },
        {
            totalGross: 0,
            totalNet: 0,
            totalPaye: 0,
            totalNssf: 0,
            totalShif: 0,
            totalHousingLevy: 0,
            totalOtherDeductions: 0,
        }
    );

    Object.keys(totals).forEach((k) => {
        totals[k] = round2(totals[k]);
    });

    return {
        payPeriodStart,
        payPeriodEnd,
        paymentDate,
        applyStatutory,
        statutoryRateSet: statutoryConfig
            ? {
                  rateSetId: statutoryConfig.rateSetId,
                  code: statutoryConfig.code,
                  label: statutoryConfig.label,
              }
            : null,
        employeeCount: employees.length,
        readyCount: lines.length,
        skipped,
        errors,
        lines,
        totals,
    };
}

async function commitBatch(conn, options, createdBy) {
    const preview = await previewBatch(conn, options);
    if (preview.lines.length === 0) {
        return { ...preview, run: null, created: [] };
    }

    const runNumber = await nextRunNumber(conn, options.payPeriodStart);
    const [runResult] = await conn.execute(
        `INSERT INTO payroll_runs (
            runNumber, payPeriodStart, payPeriodEnd, paymentDate, status,
            employeeCount, createdCount, skippedCount, errorCount,
            totalGross, totalNet, totalPaye, totalNssf, totalShif, totalHousingLevy, totalOtherDeductions,
            notes, createdBy
        ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            runNumber,
            options.payPeriodStart,
            options.payPeriodEnd,
            options.paymentDate,
            preview.employeeCount,
            preview.lines.length,
            preview.skipped.length,
            preview.errors.length,
            preview.totals.totalGross,
            preview.totals.totalNet,
            preview.totals.totalPaye,
            preview.totals.totalNssf,
            preview.totals.totalShif,
            preview.totals.totalHousingLevy,
            preview.totals.totalOtherDeductions,
            options.notes || null,
            createdBy || null,
        ]
    );
    const runId = runResult.insertId;

    const created = [];
    for (const line of preview.lines) {
        const payrollNumber = await nextPayrollNumber(conn);
        const [ins] = await conn.execute(
            `INSERT INTO payroll_transactions (
                payrollNumber, payrollRunId, employeeId, salaryId, payPeriodStart, payPeriodEnd,
                baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf,
                otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus,
                paymentMethod, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'Bank Transfer', ?)`,
            [
                payrollNumber,
                runId,
                line.employeeId,
                line.salaryId,
                line.payPeriodStart,
                line.payPeriodEnd,
                line.baseSalary,
                line.allowances,
                line.overtime,
                line.bonuses,
                line.deductions,
                line.tax,
                line.nhif,
                line.nssf,
                line.otherDeductions,
                line.grossSalary,
                line.netSalary,
                line.paymentDate,
                options.notes || null,
            ]
        );
        created.push({ payrollId: ins.insertId, payrollNumber, ...line });
    }

    const [runRows] = await conn.execute('SELECT * FROM payroll_runs WHERE runId = ?', [runId]);

    return {
        ...preview,
        run: runRows[0],
        created,
    };
}

module.exports = {
    previewBatch,
    commitBatch,
    listEligibleEmployees,
    buildLineFromSalary,
    hasPayrollForPeriod,
};
