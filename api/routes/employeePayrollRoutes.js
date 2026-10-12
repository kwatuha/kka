// Employee Payroll routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/employees/:employeeId/salary
 * @description Get salary information for an employee
 */
router.get('/:employeeId/salary', async (req, res) => {
    try {
        const { employeeId } = req.params;

        const [rows] = await pool.execute(`
            SELECT 
                es.*,
                p.positionTitle,
                p.positionCode
            FROM employee_salaries es
            LEFT JOIN employee_positions p ON es.positionId = p.positionId
            WHERE es.employeeId = ? AND es.isActive = TRUE
            ORDER BY es.effectiveDate DESC
            LIMIT 1
        `, [parseInt(employeeId)]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Salary information not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching salary:', error);
        res.status(500).json({ message: 'Error fetching salary', error: error.message });
    }
});

/**
 * @route GET /api/employees/:employeeId/salary/history
 * @description Get salary history for an employee
 */
router.get('/:employeeId/salary/history', async (req, res) => {
    try {
        const { employeeId } = req.params;

        const [rows] = await pool.execute(`
            SELECT 
                es.*,
                p.positionTitle,
                p.positionCode
            FROM employee_salaries es
            LEFT JOIN employee_positions p ON es.positionId = p.positionId
            WHERE es.employeeId = ?
            ORDER BY es.effectiveDate DESC
        `, [parseInt(employeeId)]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching salary history:', error);
        res.status(500).json({ message: 'Error fetching salary history', error: error.message });
    }
});

/**
 * @route POST /api/employees/:employeeId/salary
 * @description Create or update salary information
 */
router.post('/:employeeId/salary', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const {
            positionId,
            baseSalary,
            allowances,
            deductions,
            effectiveDate,
            endDate,
            payFrequency,
            bankName,
            bankAccount,
            bankBranch,
            notes
        } = req.body;

        if (!baseSalary || !effectiveDate) {
            return res.status(400).json({ message: 'Base salary and effective date are required' });
        }

        // Deactivate previous salary records
        await pool.execute(`
            UPDATE employee_salaries 
            SET isActive = FALSE, endDate = ?
            WHERE employeeId = ? AND isActive = TRUE
        `, [effectiveDate, parseInt(employeeId)]);

        // Calculate net salary
        const netSalary = parseFloat(baseSalary) + (parseFloat(allowances) || 0) - (parseFloat(deductions) || 0);

        const [result] = await pool.execute(`
            INSERT INTO employee_salaries (
                employeeId, positionId, baseSalary, allowances, deductions,
                netSalary, effectiveDate, endDate, payFrequency,
                bankName, bankAccount, bankBranch, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            parseInt(employeeId),
            positionId || null,
            parseFloat(baseSalary),
            parseFloat(allowances) || 0,
            parseFloat(deductions) || 0,
            netSalary,
            effectiveDate,
            endDate || null,
            payFrequency || 'monthly',
            bankName || null,
            bankAccount || null,
            bankBranch || null,
            notes || null
        ]);

        // Fetch the created salary
        const [newSalary] = await pool.execute(`
            SELECT 
                es.*,
                p.positionTitle,
                p.positionCode
            FROM employee_salaries es
            LEFT JOIN employee_positions p ON es.positionId = p.positionId
            WHERE es.salaryId = ?
        `, [result.insertId]);

        res.status(201).json(newSalary[0]);
    } catch (error) {
        console.error('Error creating salary:', error);
        res.status(500).json({ message: 'Error creating salary', error: error.message });
    }
});

/**
 * @route GET /api/employees/:employeeId/payroll
 * @description Get payroll transactions for an employee
 */
router.get('/:employeeId/payroll', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate, status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                pt.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            WHERE pt.employeeId = ?
        `;
        const params = [parseInt(employeeId)];

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

        query += ' ORDER BY pt.payPeriodStart DESC';
        query += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching payroll transactions:', error);
        res.status(500).json({ message: 'Error fetching payroll transactions', error: error.message });
    }
});

/**
 * @route POST /api/employees/:employeeId/payroll
 * @description Create a payroll transaction
 */
router.post('/:employeeId/payroll', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const {
            salaryId,
            payPeriodStart,
            payPeriodEnd,
            baseSalary,
            allowances,
            overtime,
            bonuses,
            deductions,
            tax,
            nhif,
            nssf,
            otherDeductions,
            paymentDate,
            paymentMethod,
            referenceNumber,
            notes
        } = req.body;

        if (!salaryId || !payPeriodStart || !payPeriodEnd || !baseSalary || !paymentDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Generate payroll number
        const [lastPayroll] = await pool.execute(
            'SELECT payrollNumber FROM payroll_transactions ORDER BY payrollId DESC LIMIT 1'
        );
        let payrollNumber = 'PAY-000001';
        if (lastPayroll.length > 0) {
            const lastNum = parseInt(lastPayroll[0].payrollNumber.split('-')[1]);
            payrollNumber = `PAY-${String(lastNum + 1).padStart(6, '0')}`;
        }

        // Calculate totals
        const grossSalary = parseFloat(baseSalary) + (parseFloat(allowances) || 0) + 
                          (parseFloat(overtime) || 0) + (parseFloat(bonuses) || 0);
        const totalDeductions = (parseFloat(deductions) || 0) + (parseFloat(tax) || 0) + 
                              (parseFloat(nhif) || 0) + (parseFloat(nssf) || 0) + 
                              (parseFloat(otherDeductions) || 0);
        const netSalary = grossSalary - totalDeductions;

        const [result] = await pool.execute(`
            INSERT INTO payroll_transactions (
                payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd,
                baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf,
                otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus,
                paymentMethod, referenceNumber, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `, [
            payrollNumber,
            parseInt(employeeId),
            parseInt(salaryId),
            payPeriodStart,
            payPeriodEnd,
            parseFloat(baseSalary),
            parseFloat(allowances) || 0,
            parseFloat(overtime) || 0,
            parseFloat(bonuses) || 0,
            parseFloat(deductions) || 0,
            parseFloat(tax) || 0,
            parseFloat(nhif) || 0,
            parseFloat(nssf) || 0,
            parseFloat(otherDeductions) || 0,
            grossSalary,
            netSalary,
            paymentDate,
            paymentMethod || null,
            referenceNumber || null,
            notes || null
        ]);

        // Fetch the created payroll
        const [newPayroll] = await pool.execute(`
            SELECT 
                pt.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            WHERE pt.payrollId = ?
        `, [result.insertId]);

        res.status(201).json(newPayroll[0]);
    } catch (error) {
        console.error('Error creating payroll transaction:', error);
        res.status(500).json({ message: 'Error creating payroll transaction', error: error.message });
    }
});

/**
 * @route PUT /api/employees/payroll/:payrollId
 * @description Update payroll transaction status
 */
router.put('/payroll/:payrollId', async (req, res) => {
    try {
        const { payrollId } = req.params;
        const {
            paymentStatus,
            processedBy,
            referenceNumber,
            notes,
            payPeriodStart,
            payPeriodEnd,
            baseSalary,
            allowances,
            overtime,
            bonuses,
            deductions,
            tax,
            nhif,
            nssf,
            otherDeductions,
            paymentDate,
            paymentMethod,
        } = req.body;

        const updateFields = [];
        const params = [];

        const numericFields = {
            baseSalary,
            allowances,
            overtime,
            bonuses,
            deductions,
            tax,
            nhif,
            nssf,
            otherDeductions,
        };

        for (const [key, val] of Object.entries(numericFields)) {
            if (val !== undefined && val !== null) {
                updateFields.push(`${key} = ?`);
                params.push(parseFloat(val));
            }
        }

        if (payPeriodStart) {
            updateFields.push('payPeriodStart = ?');
            params.push(payPeriodStart);
        }
        if (payPeriodEnd) {
            updateFields.push('payPeriodEnd = ?');
            params.push(payPeriodEnd);
        }
        if (paymentDate) {
            updateFields.push('paymentDate = ?');
            params.push(paymentDate);
        }
        if (paymentMethod !== undefined) {
            updateFields.push('paymentMethod = ?');
            params.push(paymentMethod);
        }

        if (paymentStatus) {
            updateFields.push('paymentStatus = ?');
            params.push(paymentStatus);
        }

        if (processedBy) {
            updateFields.push('processedBy = ?');
            updateFields.push('processedDate = NOW()');
            params.push(parseInt(processedBy));
        }

        if (referenceNumber !== undefined) {
            updateFields.push('referenceNumber = ?');
            params.push(referenceNumber);
        }

        if (notes !== undefined) {
            updateFields.push('notes = ?');
            params.push(notes);
        }

        if (
            baseSalary !== undefined ||
            allowances !== undefined ||
            overtime !== undefined ||
            bonuses !== undefined
        ) {
            const [existing] = await pool.execute(
                'SELECT baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions FROM payroll_transactions WHERE payrollId = ?',
                [parseInt(payrollId)]
            );
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Payroll not found' });
            }
            const row = existing[0];
            const grossSalary =
                parseFloat(baseSalary ?? row.baseSalary) +
                parseFloat(allowances ?? row.allowances) +
                parseFloat(overtime ?? row.overtime) +
                parseFloat(bonuses ?? row.bonuses);
            const totalDeductions =
                parseFloat(deductions ?? row.deductions) +
                parseFloat(tax ?? row.tax) +
                parseFloat(nhif ?? row.nhif) +
                parseFloat(nssf ?? row.nssf) +
                parseFloat(otherDeductions ?? row.otherDeductions);
            updateFields.push('grossSalary = ?', 'netSalary = ?');
            params.push(grossSalary, grossSalary - totalDeductions);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        params.push(parseInt(payrollId));

        await pool.execute(`
            UPDATE payroll_transactions SET ${updateFields.join(', ')}
            WHERE payrollId = ?
        `, params);

        // Fetch updated payroll
        const [updatedPayroll] = await pool.execute(`
            SELECT 
                pt.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber
            FROM payroll_transactions pt
            JOIN employees e ON pt.employeeId = e.employeeId
            WHERE pt.payrollId = ?
        `, [payrollId]);

        res.status(200).json(updatedPayroll[0]);
    } catch (error) {
        console.error('Error updating payroll transaction:', error);
        res.status(500).json({ message: 'Error updating payroll transaction', error: error.message });
    }
});

module.exports = router;

