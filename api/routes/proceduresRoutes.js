// Procedures routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/procedures
 * @description Get all procedures (optionally filtered)
 */
router.get('/', async (req, res) => {
    try {
        const { search, category, isActive, chargeId } = req.query;
        let query = `
            SELECT
                p.*,
                sc.chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                sc.chargeType, sc.status as chargeStatus
            FROM procedures p
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (p.procedureName LIKE ? OR p.procedureCode LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            query += ' AND p.category = ?';
            params.push(category);
        }

        if (isActive !== undefined) {
            query += ' AND p.isActive = ?';
            params.push(isActive === 'true' ? 1 : 0);
        } else {
            // Default: show only active procedures
            query += ' AND p.isActive = 1';
        }

        if (chargeId) {
            query += ' AND p.chargeId = ?';
            params.push(chargeId);
        }

        query += ' ORDER BY p.procedureName ASC';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching procedures:', error);
        res.status(500).json({ message: 'Error fetching procedures', error: error.message });
    }
});

/**
 * @route GET /api/procedures/reports/performed
 * @description List procedures performed on patients (patient_procedures + patient + performer)
 * @query patientId, search, dateFrom, dateTo, hasOutcomeOnly, page, limit
 */
router.get('/reports/performed', async (req, res) => {
    try {
        const {
            patientId,
            search,
            dateFrom,
            dateTo,
            hasOutcomeOnly,
            page = 1,
            limit = 50,
        } = req.query;
        const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

        let query = `
            SELECT
                pp.patientProcedureId,
                pp.patientId,
                pp.procedureId,
                pp.procedureCode,
                pp.procedureName,
                pp.procedureDate,
                pp.performedBy,
                pp.notes,
                pp.complications,
                pp.procedureOutcome,
                pp.admissionId,
                pp.createdAt,
                pt.firstName,
                pt.lastName,
                pt.patientNumber,
                u.firstName AS performedByFirstName,
                u.lastName AS performedByLastName
            FROM patient_procedures pp
            LEFT JOIN patients pt ON pp.patientId = pt.patientId
            LEFT JOIN users u ON pp.performedBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (patientId) {
            query += ' AND pp.patientId = ?';
            params.push(patientId);
        }
        if (dateFrom) {
            query += ' AND pp.procedureDate >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ' AND pp.procedureDate <= ?';
            params.push(dateTo);
        }
        if (hasOutcomeOnly === 'true') {
            query += ` AND pp.procedureOutcome IS NOT NULL AND TRIM(pp.procedureOutcome) <> ''`;
        }
        if (search) {
            const term = `%${search}%`;
            query += ` AND (
                pp.procedureName LIKE ? OR pp.procedureCode LIKE ?
                OR pp.notes LIKE ? OR pp.complications LIKE ?
                OR pp.procedureOutcome LIKE ?
                OR pt.patientNumber LIKE ?
                OR CONCAT(COALESCE(pt.firstName,''), ' ', COALESCE(pt.lastName,'')) LIKE ?
            )`;
            params.push(term, term, term, term, term, term, term);
        }

        query += ` ORDER BY pp.procedureDate DESC, pp.patientProcedureId DESC LIMIT ${lim} OFFSET ${offset}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching performed procedures report:', error);
        res.status(500).json({ message: 'Error fetching performed procedures report', error: error.message });
    }
});

/**
 * @route GET /api/procedures/:id
 * @description Get a single procedure by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute(
            `SELECT
                p.*,
                sc.chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                sc.chargeType, sc.status as chargeStatus
            FROM procedures p
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            WHERE p.procedureId = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Procedure not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching procedure:', error);
        res.status(500).json({ message: 'Error fetching procedure', error: error.message });
    }
});

/**
 * @route POST /api/procedures
 * @description Create a new procedure
 */
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { procedureCode, procedureName, category, description, duration, cost, chargeId, isActive = true } = req.body;

        if (!procedureName) {
            return res.status(400).json({ error: 'Procedure name is required' });
        }

        // Generate procedure code if not provided
        let finalProcedureCode = procedureCode;
        if (!finalProcedureCode) {
            const codeParts = procedureName.toUpperCase().split(' ').slice(0, 2).map(part => part.substring(0, 3));
            finalProcedureCode = codeParts.join('-');

            // Ensure uniqueness
            let counter = 1;
            let [existing] = await connection.execute('SELECT procedureId FROM procedures WHERE procedureCode = ?', [finalProcedureCode]);
            while (existing.length > 0) {
                finalProcedureCode = `${codeParts.join('-')}-${counter}`;
                [existing] = await connection.execute('SELECT procedureId FROM procedures WHERE procedureCode = ?', [finalProcedureCode]);
                counter++;
            }
        } else {
            // Check if code already exists
            const [existing] = await connection.execute('SELECT procedureId FROM procedures WHERE procedureCode = ?', [finalProcedureCode]);
            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Procedure code already exists' });
            }
        }

        // If chargeId is provided, verify it exists and has chargeType='Procedure'
        if (chargeId) {
            const [chargeCheck] = await connection.execute(
                'SELECT chargeId, chargeType FROM service_charges WHERE chargeId = ?',
                [chargeId]
            );
            if (chargeCheck.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Service charge not found' });
            }
            // Optionally check if chargeType is Procedure (but allow linking to any charge)
        }

        const [result] = await connection.execute(
            `INSERT INTO procedures (procedureCode, procedureName, category, description, duration, cost, chargeId, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalProcedureCode,
                procedureName,
                category || null,
                description || null,
                duration || null,
                cost || null,
                chargeId || null,
                isActive ? 1 : 0
            ]
        );

        const [newProcedure] = await connection.execute(
            `SELECT
                p.*,
                sc.chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                sc.chargeType, sc.status as chargeStatus
            FROM procedures p
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            WHERE p.procedureId = ?`,
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newProcedure[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating procedure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Procedure code already exists' });
        }
        res.status(500).json({ message: 'Error creating procedure', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/procedures/:id
 * @description Update a procedure
 */
router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { procedureCode, procedureName, category, description, duration, cost, chargeId, isActive } = req.body;

        // Check if procedure exists
        const [existing] = await connection.execute('SELECT procedureId FROM procedures WHERE procedureId = ?', [id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Procedure not found' });
        }

        // Check for duplicate procedure code if it's being changed
        if (procedureCode) {
            const [duplicate] = await connection.execute(
                'SELECT procedureId FROM procedures WHERE procedureCode = ? AND procedureId != ?',
                [procedureCode, id]
            );
            if (duplicate.length > 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Procedure code already exists' });
            }
        }

        // Verify chargeId if provided
        if (chargeId !== undefined && chargeId !== null) {
            const [chargeCheck] = await connection.execute(
                'SELECT chargeId FROM service_charges WHERE chargeId = ?',
                [chargeId]
            );
            if (chargeCheck.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Service charge not found' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (procedureCode !== undefined) { updates.push('procedureCode = ?'); values.push(procedureCode); }
        if (procedureName !== undefined) { updates.push('procedureName = ?'); values.push(procedureName); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (duration !== undefined) { updates.push('duration = ?'); values.push(duration); }
        if (cost !== undefined) { updates.push('cost = ?'); values.push(cost); }
        if (chargeId !== undefined) { updates.push('chargeId = ?'); values.push(chargeId); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive ? 1 : 0); }

        if (updates.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await connection.execute(
            `UPDATE procedures SET ${updates.join(', ')}, updatedAt = NOW() WHERE procedureId = ?`,
            values
        );

        const [updated] = await connection.execute(
            `SELECT
                p.*,
                sc.chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                sc.chargeType, sc.status as chargeStatus
            FROM procedures p
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            WHERE p.procedureId = ?`,
            [id]
        );

        await connection.commit();
        res.status(200).json(updated[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating procedure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Procedure code already exists' });
        }
        res.status(500).json({ message: 'Error updating procedure', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/procedures/:id
 * @description Delete (deactivate) a procedure
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if procedure is used in patient_procedures
        const [used] = await pool.execute(
            'SELECT COUNT(*) as count FROM patient_procedures WHERE procedureId = ?',
            [id]
        );

        if (used[0].count > 0) {
            // Soft delete by setting isActive to false
            await pool.execute(
                'UPDATE procedures SET isActive = 0, updatedAt = NOW() WHERE procedureId = ?',
                [id]
            );
            return res.status(200).json({ message: 'Procedure deactivated (used in patient records)' });
        }

        // Hard delete if not used
        const [result] = await pool.execute('DELETE FROM procedures WHERE procedureId = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Procedure not found' });
        }

        res.status(200).json({ message: 'Procedure deleted successfully' });
    } catch (error) {
        console.error('Error deleting procedure:', error);
        res.status(500).json({ message: 'Error deleting procedure', error: error.message });
    }
});

/**
 * @route GET /api/patient-procedures
 * @description Get patient procedures (optionally filtered by patient and date)
 */
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date, procedureId } = req.query;

        let query = `
            SELECT
                pp.*,
                p.procedureCode, p.procedureName, p.category, p.description, p.duration, p.cost,
                p.chargeId,
                sc.chargeCode as chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                u.firstName as performedByFirstName, u.lastName as performedByLastName
            FROM patient_procedures pp
            LEFT JOIN procedures p ON pp.procedureId = p.procedureId
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            LEFT JOIN users u ON pp.performedBy = u.userId
            WHERE pp.patientId = ?
        `;
        const params = [patientId];

        if (date) {
            query += ' AND pp.procedureDate = ?';
            params.push(date);
        }

        if (procedureId) {
            query += ' AND pp.procedureId = ?';
            params.push(procedureId);
        }

        query += ' ORDER BY pp.procedureDate DESC, pp.createdAt DESC';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching patient procedures:', error);
        res.status(500).json({ message: 'Error fetching patient procedures', error: error.message });
    }
});

/**
 * @route POST /api/patient-procedures
 * @description Record a procedure performed on a patient
 */
router.post('/patient', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { patientId, procedureId, procedureCode, procedureName, procedureDate, performedBy, notes, complications, procedureOutcome, admissionId } = req.body;
        const userId = req.user?.id;

        if (!patientId || !procedureDate) {
            await connection.rollback();
            return res.status(400).json({ error: 'Patient ID and procedure date are required' });
        }

        // If procedureId is provided, get procedure details
        let finalProcedureCode = procedureCode;
        let finalProcedureName = procedureName;

        if (procedureId) {
            const [procedure] = await connection.execute(
                'SELECT procedureCode, procedureName FROM procedures WHERE procedureId = ?',
                [procedureId]
            );
            if (procedure.length > 0) {
                finalProcedureCode = finalProcedureCode || procedure[0].procedureCode;
                finalProcedureName = finalProcedureName || procedure[0].procedureName;
            }
        }

        if (!finalProcedureName) {
            await connection.rollback();
            return res.status(400).json({ error: 'Procedure name is required' });
        }

        const [result] = await connection.execute(
            `INSERT INTO patient_procedures
            (patientId, procedureId, procedureCode, procedureName, procedureDate, performedBy, notes, complications, procedureOutcome, admissionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                procedureId || null,
                finalProcedureCode || null,
                finalProcedureName,
                procedureDate,
                performedBy || userId || null,
                notes || null,
                complications || null,
                procedureOutcome || null,
                admissionId || null
            ]
        );

        const [newPatientProcedure] = await connection.execute(
            `SELECT
                pp.*,
                p.procedureCode, p.procedureName, p.category, p.description, p.duration, p.cost as procedureCost,
                p.chargeId,
                sc.chargeCode as chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                u.firstName as performedByFirstName, u.lastName as performedByLastName
            FROM patient_procedures pp
            LEFT JOIN procedures p ON pp.procedureId = p.procedureId
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            LEFT JOIN users u ON pp.performedBy = u.userId
            WHERE pp.patientProcedureId = ?`,
            [result.insertId]
        );

        // Get procedure cost for invoice creation
        // Priority: 1. chargeCost (from service_charges), 2. procedureCost (from procedures table)
        let procedureCost = 0;
        const proc = newPatientProcedure[0];
        if (proc.chargeCost && parseFloat(proc.chargeCost) > 0) {
            procedureCost = parseFloat(proc.chargeCost);
        } else if (proc.procedureCost && parseFloat(proc.procedureCost) > 0) {
            procedureCost = parseFloat(proc.procedureCost);
        }

        console.log('Procedure cost calculation:', {
            procedureId: proc.procedureId,
            procedureName: proc.procedureName || finalProcedureName,
            chargeId: proc.chargeId,
            chargeCost: proc.chargeCost,
            procedureCost: proc.procedureCost,
            finalCost: procedureCost
        });

        // Create Invoice if procedure has a cost
        if (procedureCost > 0) {
            try {
                const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
                const datePrefix = `INV-${today}-`;

                const [maxResult] = await connection.execute(
                    `SELECT MAX(CAST(SUBSTRING_INDEX(invoiceNumber, '-', -1) AS UNSIGNED)) as maxNum
                     FROM invoices WHERE invoiceNumber LIKE CONCAT(?, '%')`, [datePrefix]
                );
                let nextNum = (maxResult[0]?.maxNum || 0) + 1;
                let invoiceNumber = `${datePrefix}${String(nextNum).padStart(4, '0')}`;

                const ppId = result.insertId;
                const invNotes = `Procedure payment - PatientProcedure ${ppId} - ${finalProcedureName || 'Procedure'}`;
                const [invResult] = await connection.execute(
                    `INSERT INTO invoices (invoiceNumber, patientId, invoiceDate, totalAmount, balance, status, notes, createdBy)
                     VALUES (?, ?, CURDATE(), ?, ?, 'pending', ?, ?)`,
                    [invoiceNumber, patientId, procedureCost, procedureCost, invNotes, userId || null]
                );

                // Add invoice item
                await connection.execute(
                    `INSERT INTO invoice_items (invoiceId, description, quantity, unitPrice, totalPrice, chargeId)
                     VALUES (?, ?, 1, ?, ?, ?)`,
                    [invResult.insertId, finalProcedureName || 'Procedure', procedureCost, procedureCost, newPatientProcedure[0].chargeId || null]
                );

                // Add patient to cashier queue for payment (check for duplicates first)
                const [existingQueue] = await connection.execute(
                    `SELECT queueId FROM queue_entries
                     WHERE patientId = ? AND servicePoint = 'cashier'
                     AND status IN ('waiting', 'called', 'serving')`,
                    [patientId]
                );

                if (existingQueue.length === 0) {
                    // Patient not in cashier queue, add them
                    const [cashierCount] = await connection.execute(
                        'SELECT COUNT(*) as count FROM queue_entries WHERE DATE(arrivalTime) = CURDATE() AND servicePoint = "cashier"'
                    );
                    const ticketNum = cashierCount[0].count + 1;
                    const ticketNumber = `C-${String(ticketNum).padStart(3, '0')}`;

                    await connection.execute(
                        `INSERT INTO queue_entries
                        (patientId, ticketNumber, servicePoint, priority, status, notes, createdBy)
                        VALUES (?, ?, 'cashier', 'normal', 'waiting', ?, ?)`,
                        [
                            patientId,
                            ticketNumber,
                            `Procedure payment - PatientProcedure ${ppId} - ${finalProcedureName || 'Procedure'}`,
                            userId || null
                        ]
                    );
                    console.log(`Added patient ${patientId} to cashier queue for procedure: ${finalProcedureName}`);
                } else {
                    console.log(`Patient ${patientId} already exists in cashier queue (queueId: ${existingQueue[0].queueId}) - skipping duplicate entry`);
                }
            } catch (invoiceError) {
                // Log error but don't fail the procedure creation if invoice/queue creation fails
                console.error('Error creating invoice and cashier queue after procedure:', invoiceError);
            }
        }
        // Note: If procedure has no cost, we don't add patient to cashier queue
        // Only add to queue when there's an actual invoice to pay

        await connection.commit();
        res.status(201).json(newPatientProcedure[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating patient procedure:', error);
        res.status(500).json({ message: 'Error creating patient procedure', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/procedures/patient/:id
 * @description Update a patient procedure
 */
router.put('/patient/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { procedureId, procedureDate, performedBy, notes, complications, procedureOutcome } = req.body;

        // Check if patient procedure exists
        const [existing] = await connection.execute(
            'SELECT patientProcedureId FROM patient_procedures WHERE patientProcedureId = ?',
            [id]
        );
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Patient procedure not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (procedureId !== undefined) { updates.push('procedureId = ?'); values.push(procedureId || null); }
        if (procedureDate !== undefined) { updates.push('procedureDate = ?'); values.push(procedureDate); }
        if (performedBy !== undefined) { updates.push('performedBy = ?'); values.push(performedBy || null); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
        if (complications !== undefined) { updates.push('complications = ?'); values.push(complications || null); }
        if (procedureOutcome !== undefined) { updates.push('procedureOutcome = ?'); values.push(procedureOutcome || null); }

        if (updates.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No fields to update' });
        }

        // If procedureId is provided, get procedure details to update procedureName and procedureCode
        if (procedureId) {
            const [procedure] = await connection.execute(
                'SELECT procedureCode, procedureName FROM procedures WHERE procedureId = ?',
                [procedureId]
            );
            if (procedure.length > 0) {
                updates.push('procedureCode = ?');
                values.push(procedure[0].procedureCode || null);
                updates.push('procedureName = ?');
                values.push(procedure[0].procedureName);
            }
        }

        values.push(id);
        await connection.execute(
            `UPDATE patient_procedures SET ${updates.join(', ')} WHERE patientProcedureId = ?`,
            values
        );

        const [updated] = await connection.execute(
            `SELECT
                pp.*,
                p.procedureCode, p.procedureName, p.category, p.description, p.duration, p.cost as procedureCost,
                p.chargeId,
                sc.chargeCode as chargeCode, sc.name as chargeName, sc.cost as chargeCost,
                u.firstName as performedByFirstName, u.lastName as performedByLastName
            FROM patient_procedures pp
            LEFT JOIN procedures p ON pp.procedureId = p.procedureId
            LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
            LEFT JOIN users u ON pp.performedBy = u.userId
            WHERE pp.patientProcedureId = ?`,
            [id]
        );

        await connection.commit();
        res.status(200).json(updated[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating patient procedure:', error);
        res.status(500).json({ message: 'Error updating patient procedure', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/procedures/patient/:id
 * @description Delete a patient procedure
 */
router.delete('/patient/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Check if patient procedure exists
        const [existing] = await connection.execute(
            'SELECT patientProcedureId FROM patient_procedures WHERE patientProcedureId = ?',
            [id]
        );
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Patient procedure not found' });
        }

        // Delete the patient procedure
        await connection.execute(
            'DELETE FROM patient_procedures WHERE patientProcedureId = ?',
            [id]
        );

        await connection.commit();
        res.status(200).json({ message: 'Patient procedure deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting patient procedure:', error);
        res.status(500).json({ message: 'Error deleting patient procedure', error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;







