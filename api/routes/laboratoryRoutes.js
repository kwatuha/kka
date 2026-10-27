// Laboratory routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { notifyLabResultsReady } = require('../lib/patientSms');
const { resolveFacilityScope } = require('../lib/branchContext');
const { resolveLaboratoryForRequest } = require('../lib/facilityUnits');
const { enqueueOutboxEvent } = require('../lib/integrationOutbox');
const { shouldAutoPublish, publishLabObservation } = require('../lib/fhirMediator');
const { evaluateAndPublish: evaluateIdsr } = require('../lib/idsrPublisher');
const { getPatientBillingPolicy, waiveInvoiceForExemptCare } = require('../lib/patientBillingPolicy');

/**
 * @route GET /api/laboratory/test-types
 * @description Get all lab test types
 */
router.get('/test-types', async (req, res) => {
    try {
        const { search, category, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM lab_test_types WHERE isActive = 1';
        const params = [];

        if (search) {
            query += ` AND (testName LIKE ? OR testCode LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }

        query += ` ORDER BY testName LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching lab test types:', error);
        res.status(500).json({ message: 'Error fetching lab test types', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/test-types/:id
 * @description Get a single lab test type
 */
router.get('/test-types/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM lab_test_types WHERE testTypeId = ?',
            [req.params.id]
        );

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Lab test type not found' });
        }
    } catch (error) {
        console.error('Error fetching lab test type:', error);
        res.status(500).json({ message: 'Error fetching lab test type', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/test-types
 * @description Create a new lab test type
 */
router.post('/test-types', async (req, res) => {
    try {
        const testData = req.body;
        const [result] = await pool.execute(
            `INSERT INTO lab_test_types (testCode, testName, category, specimenType, turnaroundTime, cost, description, normalRange, preparationInstructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                testData.testCode || null,
                testData.testName,
                testData.category || null,
                testData.specimenType || null,
                testData.turnaroundTime || null,
                testData.cost || testData.unitPrice || null,
                testData.description || null,
                testData.normalRange || null,
                testData.preparationInstructions || null
            ]
        );

        const [newTest] = await pool.execute(
            'SELECT * FROM lab_test_types WHERE testTypeId = ?',
            [result.insertId]
        );

        res.status(201).json(newTest[0]);
    } catch (error) {
        console.error('Error creating lab test type:', error);
        res.status(500).json({ message: 'Error creating lab test type', error: error.message });
    }
});

/**
 * @route PUT /api/laboratory/test-types/:id
 * @description Update a lab test type
 */
router.put('/test-types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const testData = req.body;

        // Check if test type exists
        const [existing] = await pool.execute(
            'SELECT testTypeId FROM lab_test_types WHERE testTypeId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Lab test type not found' });
        }

        const updates = [];
        const values = [];

        if (testData.testCode !== undefined) { updates.push('testCode = ?'); values.push(testData.testCode || null); }
        if (testData.testName !== undefined) { updates.push('testName = ?'); values.push(testData.testName); }
        if (testData.category !== undefined) { updates.push('category = ?'); values.push(testData.category || null); }
        if (testData.specimenType !== undefined) { updates.push('specimenType = ?'); values.push(testData.specimenType || null); }
        if (testData.turnaroundTime !== undefined) { updates.push('turnaroundTime = ?'); values.push(testData.turnaroundTime || null); }
        if (testData.cost !== undefined) { updates.push('cost = ?'); values.push(testData.cost || null); }
        if (testData.unitPrice !== undefined) { updates.push('cost = ?'); values.push(testData.unitPrice || null); }
        if (testData.description !== undefined) { updates.push('description = ?'); values.push(testData.description || null); }
        if (testData.normalRange !== undefined) { updates.push('normalRange = ?'); values.push(testData.normalRange || null); }
        if (testData.preparationInstructions !== undefined) { updates.push('preparationInstructions = ?'); values.push(testData.preparationInstructions || null); }
        if (testData.isActive !== undefined) { updates.push('isActive = ?'); values.push(testData.isActive); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);

        await pool.execute(
            `UPDATE lab_test_types SET ${updates.join(', ')}, updatedAt = NOW() WHERE testTypeId = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM lab_test_types WHERE testTypeId = ?',
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating lab test type:', error);
        res.status(500).json({ message: 'Error updating lab test type', error: error.message });
    }
});

/**
 * @route DELETE /api/laboratory/test-types/:id
 * @description Soft delete a lab test type (set isActive = 0)
 */
router.delete('/test-types/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if test type exists
        const [existing] = await pool.execute(
            'SELECT * FROM lab_test_types WHERE testTypeId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Lab test type not found' });
        }

        // Soft delete: set isActive = 0
        await pool.execute(
            'UPDATE lab_test_types SET isActive = 0, updatedAt = NOW() WHERE testTypeId = ?',
            [id]
        );

        res.status(200).json({
            message: 'Lab test type deleted successfully',
            testTypeId: id
        });
    } catch (error) {
        console.error('Error deleting lab test type:', error);
        res.status(500).json({ message: 'Error deleting lab test type', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/orders
 * @description Get lab test orders.
 * When `patientId` is omitted and `status` is omitted, excludes `awaiting_payment` (work queue only).
 * Pass `status=awaiting_payment` to list unpaid orders, or pass `patientId` for full history for that patient.
 */
router.get('/orders', async (req, res) => {
    try {
        const { patientId, status, branchId, labId, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const scope = await resolveFacilityScope(pool, req);
        const effectiveBranchId = branchId || scope.currentBranchId || null;

        let query = `
            SELECT lo.*,
                   pt.firstName, pt.lastName, pt.patientNumber,
                   u.firstName as doctorFirstName, u.lastName as doctorLastName,
                   l.labName, l.labCode,
                   b.branchName,
                   GROUP_CONCAT(DISTINCT ltt.testName ORDER BY loi.itemId SEPARATOR ', ') as testNames
            FROM lab_test_orders lo
            LEFT JOIN patients pt ON lo.patientId = pt.patientId
            LEFT JOIN users u ON lo.orderedBy = u.userId
            LEFT JOIN lab_test_order_items loi ON lo.orderId = loi.orderId
            LEFT JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
            LEFT JOIN laboratories l ON lo.labId = l.labId
            LEFT JOIN branches b ON lo.branchId = b.branchId
            WHERE 1=1
        `;
        const params = [];

        if (patientId) {
            query += ` AND lo.patientId = ?`;
            params.push(patientId);
        }

        if (labId) {
            query += ` AND lo.labId = ?`;
            params.push(labId);
        } else if (effectiveBranchId && !scope.canAccessAllBranches) {
            query += ` AND lo.branchId = ?`;
            params.push(effectiveBranchId);
        } else if (effectiveBranchId && scope.canAccessAllBranches && branchId) {
            query += ` AND lo.branchId = ?`;
            params.push(effectiveBranchId);
        }

        if (status) {
            query += ` AND lo.status = ?`;
            params.push(status);
        } else if (!patientId) {
            // Laboratory work list: unpaid orders (awaiting_payment) stay at cashier — do not list here
            query += ` AND lo.status != 'awaiting_payment'`;
        }

        query += ` GROUP BY lo.orderId ORDER BY lo.orderDate DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching lab orders:', error);
        res.status(500).json({ message: 'Error fetching lab orders', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/orders
 * @description Create a new lab test order
 */
/**
 * @route POST /api/laboratory/orders
 * @description Create a new lab test order with Duplicate Prevention and Billing
 */
router.post('/orders', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { orderNumber, patientId, admissionId, medicalRecordId, orderedBy, orderDate, priority, status, clinicalNotes, clinicalIndication, items, testTypes, labId: bodyLabId, branchId: bodyBranchId } = req.body;
        const userId = req.user?.id || req.user?.userId || null;

        const scope = await resolveFacilityScope(connection, req, { body: req.body });
        const resolvedLab = await resolveLaboratoryForRequest(connection, req, { body: req.body });
        let branchId = bodyBranchId || scope.currentBranchId || resolvedLab?.branchId || null;
        let labId = bodyLabId || resolvedLab?.labId || null;

        if (!branchId && patientId) {
            const [patientRows] = await connection.execute(
                'SELECT registeredBranchId FROM patients WHERE patientId = ? LIMIT 1',
                [patientId]
            );
            branchId = patientRows[0]?.registeredBranchId || branchId;
        }
        if (!labId && branchId) {
            const [labRows] = await connection.execute(
                `SELECT labId FROM laboratories WHERE branchId = ? AND isActive = 1 ORDER BY isDefault DESC, labId ASC LIMIT 1`,
                [branchId]
            );
            labId = labRows[0]?.labId || null;
        }

        // Support both 'items' and 'testTypes' formats for backward compatibility
        let finalItems = items || [];
        if (testTypes && testTypes.length > 0 && !items) {
            // Convert testTypes format to items format
            finalItems = testTypes.map(test => ({
                testTypeId: test.testTypeId,
                notes: test.clinicalIndication || null,
            }));
        }

        if (!finalItems || finalItems.length === 0) {
            return res.status(400).json({ message: 'No tests provided in the order' });
        }

        // --- DUPLICATE PREVENTION LOGIC ---
        // Check if any of the requested testTypes already exist for this patient
        // in an incomplete state (status is not 'completed' and not 'cancelled')
        for (const item of finalItems) {
            const [pendingTests] = await connection.execute(
                `SELECT ltt.testName, lo.orderNumber
                 FROM lab_test_order_items loi
                 JOIN lab_test_orders lo ON loi.orderId = lo.orderId
                 JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
                 WHERE lo.patientId = ?
                 AND loi.testTypeId = ?
                 AND loi.status NOT IN ('completed', 'cancelled')
                 AND lo.status != 'cancelled'`,
                [patientId, item.testTypeId]
            );

            if (pendingTests.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Duplicate Test: '${pendingTests[0].testName}' is already active for this patient under Order ${pendingTests[0].orderNumber}. Please wait for results or cancel the existing order.`
                });
            }
        }
        // ----------------------------------

        // 1. Generate order number with retry logic to prevent duplicates
        let orderNum = orderNumber;
        if (!orderNum) {
            // Get the maximum order number to avoid duplicates (similar to radiology orders)
            const [maxResult] = await connection.execute(
                `SELECT MAX(CAST(SUBSTRING(orderNumber, 5) AS UNSIGNED)) as maxNum
                 FROM lab_test_orders
                 WHERE orderNumber LIKE 'LAB-%' AND orderNumber NOT LIKE 'LAB-HIV-%'`
            );

            let nextNum = (maxResult[0]?.maxNum || 0) + 1;
            orderNum = `LAB-${String(nextNum).padStart(6, '0')}`;
        }

        const clinicalInfo = clinicalIndication || clinicalNotes || null;

        // 2. Insert order with retry logic for duplicate key errors
        let result;
        let insertAttempts = 0;
        let finalOrderNum = orderNum;
        let orderId;

        while (insertAttempts < 100) {
            // First check if the number exists before trying to insert
            const [existing] = await connection.execute(
                'SELECT orderId FROM lab_test_orders WHERE orderNumber = ?',
                [finalOrderNum]
            );

            if (existing.length > 0) {
                // Number exists, extract current number and increment
                const currentNum = parseInt(finalOrderNum.substring(4)) || 0;
                const nextNum = currentNum + 1;
                finalOrderNum = `LAB-${String(nextNum).padStart(6, '0')}`;
                insertAttempts++;

                if (insertAttempts >= 100) {
                    await connection.rollback();
                    connection.release();
                    return res.status(500).json({
                        message: 'Failed to generate unique lab order number',
                        error: 'Please try again.'
                    });
                }
                // Continue to check next number
                continue;
            }

            // Number doesn't exist, try to insert
            try {
                [result] = await connection.execute(
                    `INSERT INTO lab_test_orders (orderNumber, patientId, admissionId, medicalRecordId, orderedBy, orderDate, priority, status, clinicalIndication, branchId, labId)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        finalOrderNum,
                        patientId,
                        admissionId || null,
                        medicalRecordId ? Number(medicalRecordId) : null,
                        orderedBy,
                        orderDate || new Date(),
                        priority || 'routine',
                        status || 'pending',
                        clinicalInfo,
                        branchId,
                        labId,
                    ]
                );
                orderId = result.insertId;
                break; // Success, exit loop
            } catch (insertError) {
                if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
                    // Duplicate key error, increment and retry
                    const currentNum = parseInt(finalOrderNum.substring(4)) || 0;
                    const nextNum = currentNum + 1;
                    finalOrderNum = `LAB-${String(nextNum).padStart(6, '0')}`;
                    insertAttempts++;

                    if (insertAttempts >= 100) {
                        await connection.rollback();
                        connection.release();
                        return res.status(500).json({
                            message: 'Failed to generate unique lab order number',
                            error: 'Please try again.'
                        });
                    }
                    // Continue to retry
                    continue;
                } else {
                    // Different error, rethrow
                    throw insertError;
                }
            }
        }

        // 3. Save order items
        for (const item of finalItems) {
            await connection.execute(
                `INSERT INTO lab_test_order_items (orderId, testTypeId, notes, status)
                 VALUES (?, ?, ?, 'pending')`,
                [orderId, item.testTypeId, (item.notes || item.instructions || null)]
            );
        }

        // 4. Invoice + cashier queue at order time (patient pays before lab queue / sample collection)
        const [orderItemsRows] = await connection.execute(
            `SELECT loi.itemId, loi.testTypeId, ltt.testName, ltt.testCode, ltt.cost
             FROM lab_test_order_items loi
             JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
             WHERE loi.orderId = ?`,
            [orderId]
        );

        let invoiceTotal = 0;
        for (const row of orderItemsRows) {
            invoiceTotal += parseFloat(row.cost || 0);
        }

        if (invoiceTotal > 0) {
            const billingPolicy = await getPatientBillingPolicy(connection, patientId);

            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const datePrefix = `INV-${today}-`;
            const [maxResult] = await connection.execute(
                `SELECT MAX(CAST(SUBSTRING_INDEX(invoiceNumber, '-', -1) AS UNSIGNED)) as maxNum
                 FROM invoices WHERE invoiceNumber LIKE CONCAT(?, '%')`,
                [datePrefix]
            );
            let nextNum = (maxResult[0]?.maxNum || 0) + 1;
            let invoiceNumber = `${datePrefix}${String(nextNum).padStart(4, '0')}`;

            const invoiceNotes = `Lab payment - Order: ${finalOrderNum}${admissionId ? ` (Admission ${admissionId})` : ''}`;

            const [invResult] = await connection.execute(
                `INSERT INTO invoices (invoiceNumber, patientId, invoiceDate, totalAmount, balance, status, notes, createdBy)
                 VALUES (?, ?, CURDATE(), ?, ?, 'pending', ?, ?)`,
                [invoiceNumber, patientId, invoiceTotal, invoiceTotal, invoiceNotes, userId]
            );
            const invoiceId = invResult.insertId;

            for (const row of orderItemsRows) {
                const lineCost = parseFloat(row.cost || 0);
                if (lineCost <= 0) continue;
                const itemDescription = `Lab Test: ${row.testName || 'Test'} (${row.testCode || 'N/A'}) - Order Item #${row.itemId}`;
                await connection.execute(
                    `INSERT INTO invoice_items (invoiceId, description, quantity, unitPrice, totalPrice)
                     VALUES (?, ?, 1, ?, ?)`,
                    [invoiceId, itemDescription, lineCost, lineCost]
                );
            }

            if (billingPolicy.bypassPayment) {
                // Non-paying: waive invoice and keep order ready for lab (no cashier)
                await waiveInvoiceForExemptCare(connection, {
                    invoiceId,
                    userId,
                    note: 'Non-paying patient — auto-waived',
                });
                await connection.execute(
                    `UPDATE lab_test_orders SET status = 'pending' WHERE orderId = ?`,
                    [orderId]
                );
                const [existingLabQ] = await connection.execute(
                    `SELECT queueId FROM queue_entries
                     WHERE patientId = ? AND servicePoint = 'laboratory'
                       AND status NOT IN ('completed', 'cancelled')`,
                    [patientId]
                );
                if (existingLabQ.length === 0) {
                    const [labCount] = await connection.execute(
                        'SELECT COUNT(*) as count FROM queue_entries WHERE DATE(arrivalTime) = CURDATE() AND servicePoint = "laboratory"'
                    );
                    const labTicketNumber = `LAB-${String((labCount[0]?.count || 0) + 1).padStart(3, '0')}`;
                    const queuePriority = (priority === 'stat' || priority === 'urgent') ? 'urgent' : 'normal';
                    await connection.execute(
                        `INSERT INTO queue_entries (patientId, ticketNumber, servicePoint, priority, status, notes, createdBy)
                         VALUES (?, ?, 'laboratory', ?, 'waiting', ?, ?)`,
                        [patientId, labTicketNumber, queuePriority, `Lab ready (non-paying) - Order: ${finalOrderNum}`, userId]
                    );
                }
            } else {
                await connection.execute(
                    `UPDATE lab_test_orders SET status = 'awaiting_payment' WHERE orderId = ?`,
                    [orderId]
                );

                const [existingCashier] = await connection.execute(
                    `SELECT queueId FROM queue_entries
                     WHERE patientId = ? AND servicePoint = 'cashier'
                       AND status IN ('waiting', 'called', 'serving')`,
                    [patientId]
                );
                if (existingCashier.length === 0) {
                    const [cashierCount] = await connection.execute(
                        'SELECT COUNT(*) as count FROM queue_entries WHERE DATE(arrivalTime) = CURDATE() AND servicePoint = "cashier"'
                    );
                    const ticketNumber = `C-${String((cashierCount[0]?.count || 0) + 1).padStart(3, '0')}`;
                    const queuePriority = (priority === 'stat' || priority === 'urgent') ? 'urgent' : 'normal';
                    await connection.execute(
                        `INSERT INTO queue_entries (patientId, ticketNumber, servicePoint, priority, status, notes, createdBy)
                         VALUES (?, ?, 'cashier', ?, 'waiting', ?, ?)`,
                        [patientId, ticketNumber, queuePriority, `Lab payment - Order: ${finalOrderNum}`, userId]
                    );
                }
            }
        }

        await connection.commit();

        const [newOrder] = await connection.execute(
            `SELECT lo.*, pt.firstName, pt.lastName, pt.patientNumber, u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM lab_test_orders lo
             LEFT JOIN patients pt ON lo.patientId = pt.patientId
             LEFT JOIN users u ON lo.orderedBy = u.userId
             WHERE lo.orderId = ?`,
            [orderId]
        );

        res.status(201).json(newOrder[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating lab order:', error);
        let errMsg = error.message || String(error);
        // Common when DB was never migrated: UPDATE ... status = 'awaiting_payment' fails
        if (errMsg.includes('Data truncated') && errMsg.includes('status')) {
            errMsg =
                'lab_test_orders.status must include awaiting_payment (paid-before-lab workflow). ' +
                'Run: api/database/migrations/46_lab_test_orders_awaiting_payment_enum.sql on your MySQL database, then retry. ' +
                `Original error: ${error.message}`;
        }
        res.status(500).json({ message: 'Error creating lab order', error: errMsg });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/laboratory/orders/:id
 * @description Get a single lab test order with details
 */
router.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get order with patient and doctor info
        const [orders] = await pool.execute(
            `SELECT lo.*,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM lab_test_orders lo
             LEFT JOIN patients pt ON lo.patientId = pt.patientId
             LEFT JOIN users u ON lo.orderedBy = u.userId
             WHERE lo.orderId = ?`,
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Lab order not found' });
        }

        // Get order items with test type info
        const [items] = await pool.execute(
            `SELECT loi.*, ltt.testCode, ltt.testName, ltt.category
             FROM lab_test_order_items loi
             LEFT JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
             WHERE loi.orderId = ?
             ORDER BY loi.itemId`,
            [id]
        );

        const order = orders[0];
        order.items = items;

        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching lab order:', error);
        res.status(500).json({ message: 'Error fetching lab order', error: error.message });
    }
});

/**
 * @route PUT /api/laboratory/orders/:id
 * @description Update a lab test order
 */
router.put('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, sampleCollectionDate, expectedCompletionDate, notes, priority, clinicalIndication } = req.body;

        // Check if order exists
        const [existing] = await pool.execute(
            'SELECT orderId FROM lab_test_orders WHERE orderId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Lab order not found' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }

        if (priority !== undefined) {
            updates.push('priority = ?');
            values.push(priority);
        }

        if (clinicalIndication !== undefined) {
            updates.push('clinicalIndication = ?');
            values.push(clinicalIndication || null);
        }

        if (sampleCollectionDate !== undefined) {
            updates.push('sampleCollectionDate = ?');
            values.push(sampleCollectionDate || null);
        }

        if (expectedCompletionDate !== undefined) {
            updates.push('expectedCompletionDate = ?');
            values.push(expectedCompletionDate || null);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes || null);
        }

        if (req.body.labId !== undefined) {
            const nextLabId = req.body.labId === null || req.body.labId === '' ? null : Number(req.body.labId);
            updates.push('labId = ?');
            values.push(Number.isFinite(nextLabId) ? nextLabId : null);
            if (Number.isFinite(nextLabId) && nextLabId) {
                const [labRows] = await pool.execute(
                    'SELECT branchId FROM laboratories WHERE labId = ? AND isActive = 1 LIMIT 1',
                    [nextLabId]
                );
                if (labRows[0]?.branchId) {
                    updates.push('branchId = ?');
                    values.push(labRows[0].branchId);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        updates.push('updatedAt = NOW()');
        values.push(id);

        await pool.execute(
            `UPDATE lab_test_orders SET ${updates.join(', ')} WHERE orderId = ?`,
            values
        );

        // Fetch updated order
        const [updated] = await pool.execute(
            `SELECT lo.*,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM lab_test_orders lo
             LEFT JOIN patients pt ON lo.patientId = pt.patientId
             LEFT JOIN users u ON lo.orderedBy = u.userId
             WHERE lo.orderId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating lab order:', error);
        res.status(500).json({ message: 'Error updating lab order', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/orders/:id/reschedule
 * @description Reschedule sample collection / expected completion for a lab order
 */
router.post('/orders/:id/reschedule', async (req, res) => {
    try {
        const { id } = req.params;
        const { sampleCollectionDate, expectedCompletionDate, reason } = req.body || {};
        if (!sampleCollectionDate && !expectedCompletionDate) {
            return res.status(400).json({ error: 'Provide sampleCollectionDate and/or expectedCompletionDate' });
        }

        const [existing] = await pool.execute(
            'SELECT orderId, notes, status FROM lab_test_orders WHERE orderId = ?',
            [id]
        );
        if (!existing.length) {
            return res.status(404).json({ message: 'Lab order not found' });
        }
        if (existing[0].status === 'cancelled' || existing[0].status === 'completed') {
            return res.status(400).json({ error: `Cannot reschedule a ${existing[0].status} order` });
        }

        const noteLine = `[Rescheduled ${new Date().toISOString().slice(0, 10)}] ${reason || 'No reason given'}`;
        const notes = existing[0].notes ? `${existing[0].notes}\n${noteLine}` : noteLine;
        const updates = [];
        const values = [];
        if (sampleCollectionDate) {
            updates.push('sampleCollectionDate = ?');
            values.push(sampleCollectionDate);
        }
        if (expectedCompletionDate) {
            updates.push('expectedCompletionDate = ?');
            values.push(expectedCompletionDate);
        }
        updates.push('notes = ?', 'updatedAt = NOW()');
        values.push(notes, id);
        await pool.execute(`UPDATE lab_test_orders SET ${updates.join(', ')} WHERE orderId = ?`, values);

        const [updated] = await pool.execute(
            `SELECT lo.*, pt.firstName, pt.lastName, pt.patientNumber, l.labName
             FROM lab_test_orders lo
             LEFT JOIN patients pt ON lo.patientId = pt.patientId
             LEFT JOIN laboratories l ON lo.labId = l.labId
             WHERE lo.orderId = ?`,
            [id]
        );
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error rescheduling lab order:', error);
        res.status(500).json({ message: 'Error rescheduling lab order', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/orders/:id/refer
 * @description Refer / transfer a lab order to another laboratory unit
 */
router.post('/orders/:id/refer', async (req, res) => {
    try {
        const { id } = req.params;
        const { labId, reason } = req.body || {};
        const targetLabId = Number(labId);
        if (!Number.isFinite(targetLabId) || targetLabId <= 0) {
            return res.status(400).json({ error: 'labId is required' });
        }

        const [existing] = await pool.execute(
            `SELECT lo.orderId, lo.notes, lo.status, lo.labId, lo.branchId, l.labName AS currentLabName
             FROM lab_test_orders lo
             LEFT JOIN laboratories l ON lo.labId = l.labId
             WHERE lo.orderId = ?`,
            [id]
        );
        if (!existing.length) {
            return res.status(404).json({ message: 'Lab order not found' });
        }
        if (existing[0].status === 'cancelled' || existing[0].status === 'completed') {
            return res.status(400).json({ error: `Cannot refer a ${existing[0].status} order` });
        }

        const [labs] = await pool.execute(
            'SELECT labId, labName, branchId FROM laboratories WHERE labId = ? AND isActive = 1 LIMIT 1',
            [targetLabId]
        );
        if (!labs.length) {
            return res.status(404).json({ error: 'Target laboratory not found or inactive' });
        }

        const noteLine = `[Referred ${new Date().toISOString().slice(0, 10)}] ${existing[0].currentLabName || 'previous lab'} → ${labs[0].labName}. ${reason || ''}`.trim();
        const notes = existing[0].notes ? `${existing[0].notes}\n${noteLine}` : noteLine;

        await pool.execute(
            `UPDATE lab_test_orders
             SET labId = ?, branchId = ?, notes = ?, updatedAt = NOW()
             WHERE orderId = ?`,
            [labs[0].labId, labs[0].branchId, notes, id]
        );

        const [updated] = await pool.execute(
            `SELECT lo.*, pt.firstName, pt.lastName, pt.patientNumber, l.labName, b.branchName
             FROM lab_test_orders lo
             LEFT JOIN patients pt ON lo.patientId = pt.patientId
             LEFT JOIN laboratories l ON lo.labId = l.labId
             LEFT JOIN branches b ON lo.branchId = b.branchId
             WHERE lo.orderId = ?`,
            [id]
        );
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error referring lab order:', error);
        res.status(500).json({ message: 'Error referring lab order', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/orders/:id/clinical-context
 * @description Allergies, recent prescriptions, and medical history for lab decision support
 */
router.get('/orders/:id/clinical-context', async (req, res) => {
    try {
        const { id } = req.params;
        const [orders] = await pool.execute(
            `SELECT lo.orderId, lo.orderNumber, lo.patientId, lo.status, lo.labId, lo.expectedCompletionDate,
                    lo.sampleCollectionDate, lo.notes, lo.clinicalIndication, lo.priority,
                    pt.firstName, pt.lastName, pt.patientNumber, pt.dateOfBirth, pt.gender,
                    l.labName
             FROM lab_test_orders lo
             LEFT JOIN patients pt ON lo.patientId = pt.patientId
             LEFT JOIN laboratories l ON lo.labId = l.labId
             WHERE lo.orderId = ?`,
            [id]
        );
        if (!orders.length) {
            return res.status(404).json({ message: 'Lab order not found' });
        }
        const order = orders[0];
        const patientId = order.patientId;

        const [allergies] = await pool.execute(
            `SELECT allergyId, allergen, allergyType, severity, reaction, notes, status, createdAt
             FROM patient_allergies
             WHERE patientId = ?
             ORDER BY createdAt DESC
             LIMIT 50`,
            [patientId]
        );

        const [prescriptions] = await pool.execute(
            `SELECT p.prescriptionId, p.prescriptionNumber, p.prescriptionDate, p.status,
                    u.firstName AS doctorFirstName, u.lastName AS doctorLastName
             FROM prescriptions p
             LEFT JOIN users u ON p.doctorId = u.userId
             WHERE p.patientId = ?
             ORDER BY p.prescriptionDate DESC, p.prescriptionId DESC
             LIMIT 10`,
            [patientId]
        );

        for (const rx of prescriptions) {
            const [items] = await pool.execute(
                `SELECT medicationName, dosage, frequency, duration, quantity, status
                 FROM prescription_items WHERE prescriptionId = ? LIMIT 20`,
                [rx.prescriptionId]
            );
            rx.items = items;
        }

        const [history] = await pool.execute(
            `SELECT recordId, visitDate, visitType, chiefComplaint, diagnosis, createdAt
             FROM medical_records
             WHERE patientId = ?
             ORDER BY visitDate DESC, recordId DESC
             LIMIT 10`,
            [patientId]
        );

        res.status(200).json({
            order,
            allergies: allergies || [],
            prescriptions: prescriptions || [],
            medicalHistory: history || [],
        });
    } catch (error) {
        console.error('Error fetching lab clinical context:', error);
        res.status(500).json({ message: 'Error fetching lab clinical context', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/orders/:id/results
 * @description Get results for a lab test order
 */
router.get('/orders/:id/results', async (req, res) => {
    try {
        const { id } = req.params;

        // Get order items
        const [items] = await pool.execute(
            `SELECT loi.*, ltt.testCode, ltt.testName, ltt.category
             FROM lab_test_order_items loi
             LEFT JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
             WHERE loi.orderId = ?
             ORDER BY loi.itemId`,
            [id]
        );

        // Get results for each item
        for (const item of items) {
            const [results] = await pool.execute(
                `SELECT ltr.*,
                        u1.firstName as performedByFirstName, u1.lastName as performedByLastName,
                        u2.firstName as verifiedByFirstName, u2.lastName as verifiedByLastName
                 FROM lab_test_results ltr
                 LEFT JOIN users u1 ON ltr.performedBy = u1.userId
                 LEFT JOIN users u2 ON ltr.verifiedBy = u2.userId
                 WHERE ltr.orderItemId = ?
                 ORDER BY ltr.createdAt DESC
                 LIMIT 1`,
                [item.itemId]
            );

            if (results.length > 0) {
                const result = results[0];
                // Get result values
                const [values] = await pool.execute(
                    `SELECT * FROM lab_result_values WHERE resultId = ? ORDER BY valueId`,
                    [result.resultId]
                );
                result.values = values;
                item.result = result;
            }
        }

        res.status(200).json(items);
    } catch (error) {
        console.error('Error fetching lab results:', error);
        res.status(500).json({ message: 'Error fetching lab results', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/orders/:id/results
 * @description Add results for a lab test order item
 */
router.post('/orders/:id/results', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { orderItemId, testDate, notes, values, performedBy } = req.body;
        const userId = req.user?.id || req.user?.userId || null;

        // Check if order item exists
        const [itemCheck] = await connection.execute(
            'SELECT itemId, orderId FROM lab_test_order_items WHERE itemId = ? AND orderId = ?',
            [orderItemId, id]
        );

        if (itemCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order item not found' });
        }

        const [orderStatusRows] = await connection.execute(
            'SELECT status, orderNumber FROM lab_test_orders WHERE orderId = ?',
            [id]
        );
        if (orderStatusRows.length > 0 && orderStatusRows[0].status === 'awaiting_payment') {
            await connection.rollback();
            return res.status(400).json({
                message: 'Lab fees must be paid (cashier) before results can be entered.',
                code: 'LAB_AWAITING_PAYMENT',
                orderNumber: orderStatusRows[0].orderNumber,
            });
        }

        const hasValues = values && Array.isArray(values) && values.length > 0;
        const initialStatus = hasValues ? 'verified' : 'pending';

        // Create result
        const [resultInsert] = await connection.execute(
            `INSERT INTO lab_test_results (orderItemId, testDate, status, notes, performedBy, verifiedBy, verifiedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                orderItemId,
                testDate || new Date(),
                initialStatus,
                notes || null,
                performedBy || userId || null,
                hasValues && userId ? userId : null,
                hasValues && userId ? new Date() : null,
            ]
        );

        const resultId = resultInsert.insertId;

        // Add result values if provided
        if (values && Array.isArray(values) && values.length > 0) {
            for (const value of values) {
                await connection.execute(
                    `INSERT INTO lab_result_values (resultId, parameterName, value, unit, normalRange, flag, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        resultId,
                        value.parameterName,
                        value.value || null,
                        value.unit || null,
                        value.normalRange || null,
                        value.flag || 'normal',
                        value.notes || null
                    ]
                );
            }
        }

        // Update order item status to completed
        await connection.execute(
            'UPDATE lab_test_order_items SET status = ? WHERE itemId = ?',
            ['completed', orderItemId]
        );

        // Lab billing is at order creation (invoice + cashier). No per-result invoicing here.

        let orderMetaForEvents = null;
        try {
            const [orderMeta] = await connection.execute(
                `SELECT lo.patientId, lo.orderNumber, lo.orderId, ltt.testName, ltt.testCode
                 FROM lab_test_orders lo
                 INNER JOIN lab_test_order_items loi ON loi.orderId = lo.orderId
                 LEFT JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
                 WHERE loi.itemId = ?
                 LIMIT 1`,
                [orderItemId]
            );
            orderMetaForEvents = orderMeta[0] || null;
            if (orderMetaForEvents?.patientId) {
                await enqueueOutboxEvent(connection, {
                    eventType: 'observation.lab.final',
                    aggregateType: 'lab_result',
                    aggregateId: resultId,
                    payload: {
                        resultId,
                        orderId: Number(id),
                        orderItemId,
                        patientId: orderMetaForEvents.patientId,
                        orderNumber: orderMetaForEvents.orderNumber,
                        testName: orderMetaForEvents.testName,
                        testCode: orderMetaForEvents.testCode,
                        testDate: testDate || new Date(),
                        values: (values || []).map((v) => ({
                            parameterName: v.parameterName,
                            value: v.value,
                            unit: v.unit,
                            flag: v.flag,
                        })),
                    },
                });
                await enqueueOutboxEvent(connection, {
                    eventType: 'hl7.oru.sandbox',
                    aggregateType: 'lab_result',
                    aggregateId: resultId,
                    payload: {
                        resultId,
                        messageType: 'ORU^R01',
                        hl7PreviewPath: `/api/integrations/hl7/oru/${resultId}`,
                        hl7DownloadPath: `/api/integrations/hl7/oru/${resultId}?format=plain`,
                        patientId: orderMetaForEvents.patientId,
                    },
                });
            }
        } catch (outboxErr) {
            console.warn('[laboratory] outbox enqueue skipped:', outboxErr.message || outboxErr);
        }

        await connection.commit();

        let fhirPublish = null;
        try {
            if (hasValues && (await shouldAutoPublish(pool))) {
                fhirPublish = await publishLabObservation(pool, resultId);
                if (fhirPublish?.skipped && fhirPublish.reason) {
                    console.warn('[laboratory] FHIR publish skipped:', fhirPublish.reason);
                }
            } else if (hasValues) {
                fhirPublish = { skipped: true, reason: 'Auto-publish disabled in FHIR settings' };
            } else {
                fhirPublish = { skipped: true, reason: 'Add result values before national FHIR publish' };
            }
        } catch (fhirErr) {
            fhirPublish = { status: 'failed', error: fhirErr.message || String(fhirErr) };
            console.warn('[laboratory] FHIR Observation publish skipped:', fhirErr.message || fhirErr);
        }

        try {
            const labText = [
                orderMetaForEvents?.testName,
                orderMetaForEvents?.testCode,
                ...(values || []).map((v) => `${v.parameterName || ''} ${v.value || ''} ${v.flag || ''}`),
                notes,
            ]
                .filter(Boolean)
                .join(' | ');
            if (labText && orderMetaForEvents?.patientId) {
                await evaluateIdsr(pool, {
                    text: labText,
                    patientId: orderMetaForEvents.patientId,
                    sourceType: 'lab_result',
                    sourceId: resultId,
                    summary: orderMetaForEvents.testName || 'Lab result',
                });
            }
        } catch (idsrErr) {
            console.warn('[laboratory] IDSR evaluate skipped:', idsrErr.message || idsrErr);
        }

        // Fetch created result with values
        const [result] = await connection.execute(
            `SELECT ltr.*,
                    u1.firstName as performedByFirstName, u1.lastName as performedByLastName
             FROM lab_test_results ltr
             LEFT JOIN users u1 ON ltr.performedBy = u1.userId
             WHERE ltr.resultId = ?`,
            [resultId]
        );

        const [resultValues] = await connection.execute(
            `SELECT * FROM lab_result_values WHERE resultId = ? ORDER BY valueId`,
            [resultId]
        );

        result[0].values = resultValues;

        try {
            if (orderMetaForEvents?.patientId) {
                notifyLabResultsReady(orderMetaForEvents.patientId, {
                    orderNumber: orderMetaForEvents.orderNumber,
                    testName: orderMetaForEvents.testName,
                });
            }
        } catch (smsErr) {
            console.error('[SMS] lab result create notify skipped:', smsErr.message || smsErr);
        }

        res.status(201).json({ ...result[0], fhirPublish });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating lab result:', error);
        res.status(500).json({ message: 'Error creating lab result', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/laboratory/results/:resultId
 * @description Update a lab test result
 */
router.put('/results/:resultId', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { resultId } = req.params;
        const { testDate, notes, status, values } = req.body;

        // Check if result exists
        const [existing] = await connection.execute(
            'SELECT resultId FROM lab_test_results WHERE resultId = ?',
            [resultId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Result not found' });
        }

        // Update result
        const updates = [];
        const updateValues = [];

        if (testDate !== undefined) {
            updates.push('testDate = ?');
            updateValues.push(testDate);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            updateValues.push(notes || null);
        }

        if (status !== undefined) {
            updates.push('status = ?');
            updateValues.push(status);
        }

        if (updates.length > 0) {
            updates.push('updatedAt = NOW()');
            updateValues.push(resultId);
            await connection.execute(
                `UPDATE lab_test_results SET ${updates.join(', ')} WHERE resultId = ?`,
                updateValues
            );
        }

        // Update or insert result values
        if (values && Array.isArray(values)) {
            // Delete existing values
            await connection.execute(
                'DELETE FROM lab_result_values WHERE resultId = ?',
                [resultId]
            );

            // Insert new values
            for (const value of values) {
                await connection.execute(
                    `INSERT INTO lab_result_values (resultId, parameterName, value, unit, normalRange, flag, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        resultId,
                        value.parameterName,
                        value.value || null,
                        value.unit || null,
                        value.normalRange || null,
                        value.flag || 'normal',
                        value.notes || null
                    ]
                );
            }
        }

        await connection.commit();

        // Fetch updated result
        const [result] = await connection.execute(
            `SELECT ltr.*,
                    u1.firstName as performedByFirstName, u1.lastName as performedByLastName
             FROM lab_test_results ltr
             LEFT JOIN users u1 ON ltr.performedBy = u1.userId
             WHERE ltr.resultId = ?`,
            [resultId]
        );

        const [resultValues] = await connection.execute(
            `SELECT * FROM lab_result_values WHERE resultId = ? ORDER BY valueId`,
            [resultId]
        );

        result[0].values = resultValues;

        res.status(200).json(result[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating lab result:', error);
        res.status(500).json({ message: 'Error updating lab result', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/laboratory/critical-results
 * @description Get all patients with critical test results that require urgent attention
 */
router.get('/critical-results', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT
                p.patientId,
                p.patientNumber,
                p.firstName,
                p.lastName,
                p.phone,
                p.dateOfBirth,
                p.gender,
                lo.orderId,
                lo.orderNumber,
                lo.orderDate,
                ltt.testTypeId,
                ltt.testCode,
                ltt.testName,
                ltr.resultId,
                ltr.testDate,
                ltr.status as resultStatus,
                ltr.notes as resultNotes,
                GROUP_CONCAT(DISTINCT CONCAT(lrv.parameterName, ': ', lrv.value, ' (', lrv.flag, ')') SEPARATOR '; ') as criticalValues
            FROM patients p
            INNER JOIN lab_test_orders lo ON p.patientId = lo.patientId
            INNER JOIN lab_test_order_items loi ON lo.orderId = loi.orderId
            INNER JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
            INNER JOIN lab_test_results ltr ON loi.itemId = ltr.orderItemId
            INNER JOIN lab_result_values lrv ON ltr.resultId = lrv.resultId
            INNER JOIN lab_critical_value_ranges lcvr ON ltt.testTypeId = lcvr.testTypeId
                AND lrv.parameterName = lcvr.parameterName
            WHERE lcvr.isActive = 1
                AND ltr.status IN ('verified', 'released')
                AND (
                    (lcvr.criticalLowValue IS NOT NULL AND CAST(lrv.value AS DECIMAL(10,2)) < lcvr.criticalLowValue)
                    OR
                    (lcvr.criticalHighValue IS NOT NULL AND CAST(lrv.value AS DECIMAL(10,2)) > lcvr.criticalHighValue)
                )
            GROUP BY p.patientId, lo.orderId, ltt.testTypeId, ltr.resultId
            ORDER BY ltr.testDate DESC, p.lastName, p.firstName
        `;

        const [rows] = await pool.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching critical results:', error);
        res.status(500).json({ message: 'Error fetching critical results', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/critical-tests
 * @description Get all critical test configurations
 */
router.get('/critical-tests', async (req, res) => {
    try {
        const query = `
            SELECT lct.*, ltt.testCode, ltt.testName, ltt.category
            FROM lab_critical_tests lct
            INNER JOIN lab_test_types ltt ON lct.testTypeId = ltt.testTypeId
            ORDER BY ltt.testName
        `;
        const [rows] = await pool.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching critical tests:', error);
        res.status(500).json({ message: 'Error fetching critical tests', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/critical-tests
 * @description Add a test type to critical tests list
 */
router.post('/critical-tests', async (req, res) => {
    try {
        const { testTypeId, description } = req.body;

        if (!testTypeId) {
            return res.status(400).json({ message: 'testTypeId is required' });
        }

        // Check if test type exists
        const [testType] = await pool.execute(
            'SELECT testTypeId FROM lab_test_types WHERE testTypeId = ? AND isActive = 1',
            [testTypeId]
        );

        if (testType.length === 0) {
            return res.status(404).json({ message: 'Test type not found' });
        }

        // Check if already exists
        const [existing] = await pool.execute(
            'SELECT criticalTestId FROM lab_critical_tests WHERE testTypeId = ?',
            [testTypeId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Test type is already marked as critical' });
        }

        // Insert new critical test
        const [result] = await pool.execute(
            'INSERT INTO lab_critical_tests (testTypeId, description, isActive) VALUES (?, ?, 1)',
            [testTypeId, description || null]
        );

        // Fetch the created record
        const [newCriticalTest] = await pool.execute(
            `SELECT lct.*, ltt.testCode, ltt.testName, ltt.category
             FROM lab_critical_tests lct
             INNER JOIN lab_test_types ltt ON lct.testTypeId = ltt.testTypeId
             WHERE lct.criticalTestId = ?`,
            [result.insertId]
        );

        res.status(201).json(newCriticalTest[0]);
    } catch (error) {
        console.error('Error creating critical test:', error);
        res.status(500).json({ message: 'Error creating critical test', error: error.message });
    }
});

/**
 * @route DELETE /api/laboratory/critical-tests/:id
 * @description Remove a test type from critical tests list
 */
router.delete('/critical-tests/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if exists
        const [existing] = await pool.execute(
            'SELECT criticalTestId FROM lab_critical_tests WHERE criticalTestId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Critical test configuration not found' });
        }

        // Delete (not soft delete for now, but could be changed to UPDATE isActive = 0)
        await pool.execute(
            'DELETE FROM lab_critical_tests WHERE criticalTestId = ?',
            [id]
        );

        res.status(200).json({ message: 'Critical test configuration removed successfully', criticalTestId: id });
    } catch (error) {
        console.error('Error deleting critical test:', error);
        res.status(500).json({ message: 'Error deleting critical test', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/critical-value-ranges
 * @description Get all critical value range configurations
 */
router.get('/critical-value-ranges', async (req, res) => {
    try {
        const query = `
            SELECT lcvr.*, ltt.testCode, ltt.testName, ltt.category
            FROM lab_critical_value_ranges lcvr
            INNER JOIN lab_test_types ltt ON lcvr.testTypeId = ltt.testTypeId
            WHERE lcvr.isActive = 1
            ORDER BY ltt.testName, lcvr.parameterName
        `;
        const [rows] = await pool.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching critical value ranges:', error);
        res.status(500).json({ message: 'Error fetching critical value ranges', error: error.message });
    }
});

/**
 * @route POST /api/laboratory/critical-value-ranges
 * @description Add a new critical value range
 */
router.post('/critical-value-ranges', async (req, res) => {
    try {
        const { testTypeId, parameterName, unit, criticalLowValue, criticalHighValue, description } = req.body;

        if (!testTypeId || !parameterName) {
            return res.status(400).json({ message: 'testTypeId and parameterName are required' });
        }

        if (criticalLowValue === null && criticalHighValue === null) {
            return res.status(400).json({ message: 'At least one of criticalLowValue or criticalHighValue must be provided' });
        }

        // Check if test type exists
        const [testType] = await pool.execute(
            'SELECT testTypeId FROM lab_test_types WHERE testTypeId = ? AND isActive = 1',
            [testTypeId]
        );

        if (testType.length === 0) {
            return res.status(404).json({ message: 'Test type not found' });
        }

        // Insert new critical value range
        const [result] = await pool.execute(
            'INSERT INTO lab_critical_value_ranges (testTypeId, parameterName, unit, criticalLowValue, criticalHighValue, description, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [testTypeId, parameterName, unit || null, criticalLowValue || null, criticalHighValue || null, description || null]
        );

        // Fetch the created record
        const [newRange] = await pool.execute(
            `SELECT lcvr.*, ltt.testCode, ltt.testName, ltt.category
             FROM lab_critical_value_ranges lcvr
             INNER JOIN lab_test_types ltt ON lcvr.testTypeId = ltt.testTypeId
             WHERE lcvr.criticalRangeId = ?`,
            [result.insertId]
        );

        res.status(201).json(newRange[0]);
    } catch (error) {
        console.error('Error creating critical value range:', error);
        res.status(500).json({ message: 'Error creating critical value range', error: error.message });
    }
});

/**
 * @route PUT /api/laboratory/critical-value-ranges/:id
 * @description Update a critical value range
 */
router.put('/critical-value-ranges/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { parameterName, unit, criticalLowValue, criticalHighValue, description, isActive } = req.body;

        // Check if exists
        const [existing] = await pool.execute(
            'SELECT criticalRangeId FROM lab_critical_value_ranges WHERE criticalRangeId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Critical value range not found' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (parameterName !== undefined) { updates.push('parameterName = ?'); values.push(parameterName); }
        if (unit !== undefined) { updates.push('unit = ?'); values.push(unit || null); }
        if (criticalLowValue !== undefined) { updates.push('criticalLowValue = ?'); values.push(criticalLowValue || null); }
        if (criticalHighValue !== undefined) { updates.push('criticalHighValue = ?'); values.push(criticalHighValue || null); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);

        await pool.execute(
            `UPDATE lab_critical_value_ranges SET ${updates.join(', ')}, updatedAt = NOW() WHERE criticalRangeId = ?`,
            values
        );

        // Fetch updated record
        const [updated] = await pool.execute(
            `SELECT lcvr.*, ltt.testCode, ltt.testName, ltt.category
             FROM lab_critical_value_ranges lcvr
             INNER JOIN lab_test_types ltt ON lcvr.testTypeId = ltt.testTypeId
             WHERE lcvr.criticalRangeId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating critical value range:', error);
        res.status(500).json({ message: 'Error updating critical value range', error: error.message });
    }
});

/**
 * @route DELETE /api/laboratory/critical-value-ranges/:id
 * @description Delete a critical value range
 */
router.delete('/critical-value-ranges/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if exists
        const [existing] = await pool.execute(
            'SELECT criticalRangeId FROM lab_critical_value_ranges WHERE criticalRangeId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Critical value range not found' });
        }

        // Delete
        await pool.execute(
            'DELETE FROM lab_critical_value_ranges WHERE criticalRangeId = ?',
            [id]
        );

        res.status(200).json({ message: 'Critical value range deleted successfully', criticalRangeId: id });
    } catch (error) {
        console.error('Error deleting critical value range:', error);
        res.status(500).json({ message: 'Error deleting critical value range', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/critical-results/:patientId
 * @description Get critical test results for a specific patient
 */
router.get('/critical-results/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const query = `
            SELECT DISTINCT
                lo.orderId,
                lo.orderNumber,
                lo.orderDate,
                ltt.testTypeId,
                ltt.testCode,
                ltt.testName,
                ltr.resultId,
                ltr.testDate,
                ltr.status as resultStatus,
                ltr.notes as resultNotes,
                lrv.valueId,
                lrv.parameterName,
                lrv.value,
                lrv.unit,
                lrv.normalRange,
                lrv.flag,
                lrv.notes
            FROM lab_test_orders lo
            INNER JOIN lab_test_order_items loi ON lo.orderId = loi.orderId
            INNER JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
            INNER JOIN lab_critical_tests lct ON ltt.testTypeId = lct.testTypeId
            INNER JOIN lab_test_results ltr ON loi.itemId = ltr.orderItemId
            INNER JOIN lab_result_values lrv ON ltr.resultId = lrv.resultId
            WHERE lo.patientId = ?
                AND lct.isActive = 1
                AND lrv.flag = 'critical'
                AND ltr.status IN ('verified', 'released')
            ORDER BY ltr.testDate DESC, ltt.testName
        `;

        const [rows] = await pool.execute(query, [patientId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching patient critical results:', error);
        res.status(500).json({ message: 'Error fetching patient critical results', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/laboratories
 * @description List laboratory units (multiple labs per facility branch)
 */
router.get('/laboratories', async (req, res) => {
    try {
        const { branchId, search, isActive } = req.query;
        let query = `
            SELECT l.*, b.branchName, b.branchCode, b.isMainBranch
            FROM laboratories l
            LEFT JOIN branches b ON l.branchId = b.branchId
            WHERE 1=1
        `;
        const params = [];

        if (branchId) {
            query += ' AND l.branchId = ?';
            params.push(branchId);
        }
        if (isActive === 'true' || isActive === '1') {
            query += ' AND l.isActive = 1';
        } else if (isActive === 'false' || isActive === '0') {
            query += ' AND l.isActive = 0';
        }
        if (search) {
            query += ' AND (l.labName LIKE ? OR l.labCode LIKE ? OR l.location LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += ' ORDER BY b.branchName ASC, l.isDefault DESC, l.labName ASC';
        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching laboratories:', error);
        res.status(500).json({ message: 'Error fetching laboratories', error: error.message });
    }
});

router.get('/laboratories/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT l.*, b.branchName, b.branchCode
             FROM laboratories l
             LEFT JOIN branches b ON l.branchId = b.branchId
             WHERE l.labId = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Laboratory not found' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching laboratory:', error);
        res.status(500).json({ message: 'Error fetching laboratory', error: error.message });
    }
});

router.post('/laboratories', async (req, res) => {
    try {
        const labData = req.body || {};
        if (!labData.labName || !labData.branchId) {
            return res.status(400).json({ message: 'labName and branchId are required' });
        }
        const labCode = labData.labCode || `LAB-${Date.now()}`;

        if (labData.isDefault && labData.branchId) {
            await pool.execute('UPDATE laboratories SET isDefault = 0 WHERE branchId = ?', [labData.branchId]);
        }

        const [result] = await pool.execute(
            `INSERT INTO laboratories (labCode, labName, branchId, isDefault, location, contactPerson, phone, email, isActive, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                labCode,
                labData.labName,
                labData.branchId,
                labData.isDefault ? 1 : 0,
                labData.location || null,
                labData.contactPerson || null,
                labData.phone || null,
                labData.email || null,
                labData.isActive !== false ? 1 : 0,
                labData.notes || null,
            ]
        );

        const [rows] = await pool.execute(
            `SELECT l.*, b.branchName FROM laboratories l LEFT JOIN branches b ON l.branchId = b.branchId WHERE l.labId = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating laboratory:', error);
        res.status(500).json({ message: 'Error creating laboratory', error: error.message });
    }
});

router.put('/laboratories/:id', async (req, res) => {
    try {
        const labData = req.body || {};
        const updates = [];
        const values = [];

        if (labData.labCode !== undefined) { updates.push('labCode = ?'); values.push(labData.labCode); }
        if (labData.labName !== undefined) { updates.push('labName = ?'); values.push(labData.labName); }
        if (labData.branchId !== undefined) { updates.push('branchId = ?'); values.push(labData.branchId); }
        if (labData.location !== undefined) { updates.push('location = ?'); values.push(labData.location || null); }
        if (labData.contactPerson !== undefined) { updates.push('contactPerson = ?'); values.push(labData.contactPerson || null); }
        if (labData.phone !== undefined) { updates.push('phone = ?'); values.push(labData.phone || null); }
        if (labData.email !== undefined) { updates.push('email = ?'); values.push(labData.email || null); }
        if (labData.isActive !== undefined) { updates.push('isActive = ?'); values.push(labData.isActive ? 1 : 0); }
        if (labData.notes !== undefined) { updates.push('notes = ?'); values.push(labData.notes || null); }

        if (labData.isDefault !== undefined) {
            updates.push('isDefault = ?');
            values.push(labData.isDefault ? 1 : 0);
            if (labData.isDefault) {
                const branchId = labData.branchId;
                if (branchId) {
                    await pool.execute('UPDATE laboratories SET isDefault = 0 WHERE branchId = ? AND labId != ?', [branchId, req.params.id]);
                } else {
                    const [current] = await pool.execute('SELECT branchId FROM laboratories WHERE labId = ?', [req.params.id]);
                    if (current[0]?.branchId) {
                        await pool.execute('UPDATE laboratories SET isDefault = 0 WHERE branchId = ? AND labId != ?', [current[0].branchId, req.params.id]);
                    }
                }
            }
        }

        if (!updates.length) return res.status(400).json({ message: 'No fields to update' });
        values.push(req.params.id);
        await pool.execute(`UPDATE laboratories SET ${updates.join(', ')}, updatedAt = NOW() WHERE labId = ?`, values);

        const [rows] = await pool.execute(
            `SELECT l.*, b.branchName FROM laboratories l LEFT JOIN branches b ON l.branchId = b.branchId WHERE l.labId = ?`,
            [req.params.id]
        );
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error updating laboratory:', error);
        res.status(500).json({ message: 'Error updating laboratory', error: error.message });
    }
});

router.delete('/laboratories/:id', async (req, res) => {
    try {
        const [orders] = await pool.execute(
            'SELECT COUNT(*) AS cnt FROM lab_test_orders WHERE labId = ? AND status NOT IN (\'cancelled\', \'completed\')',
            [req.params.id]
        );
        if (Number(orders[0]?.cnt || 0) > 0) {
            return res.status(400).json({ message: 'Cannot deactivate laboratory with active orders' });
        }
        await pool.execute('UPDATE laboratories SET isActive = 0, updatedAt = NOW() WHERE labId = ?', [req.params.id]);
        res.status(200).json({ message: 'Laboratory deactivated' });
    } catch (error) {
        console.error('Error deleting laboratory:', error);
        res.status(500).json({ message: 'Error deleting laboratory', error: error.message });
    }
});

/**
 * @route GET /api/laboratory/laboratories/:id/offerings
 * @description List test types offered by a laboratory unit
 */
router.get('/laboratories/:id/offerings', async (req, res) => {
    try {
        const labId = Number(req.params.id);
        const [labs] = await pool.execute(
            'SELECT labId, labName, branchId FROM laboratories WHERE labId = ? LIMIT 1',
            [labId]
        );
        if (!labs.length) return res.status(404).json({ message: 'Laboratory not found' });

        const [rows] = await pool.execute(
            `SELECT o.offeringId, o.labId, o.testTypeId, o.isActive, o.notes,
                    t.testCode, t.testName, t.category, t.specimenType, t.cost, t.isActive AS testIsActive
             FROM laboratory_test_offerings o
             INNER JOIN lab_test_types t ON t.testTypeId = o.testTypeId
             WHERE o.labId = ?
             ORDER BY t.category ASC, t.testName ASC`,
            [labId]
        );
        res.status(200).json({ laboratory: labs[0], offerings: rows });
    } catch (error) {
        console.error('Error fetching lab offerings:', error);
        res.status(500).json({ message: 'Error fetching lab offerings', error: error.message });
    }
});

/**
 * @route PUT /api/laboratory/laboratories/:id/offerings
 * @description Replace active test offerings for a laboratory (body: { testTypeIds: number[] })
 */
router.put('/laboratories/:id/offerings', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const labId = Number(req.params.id);
        const testTypeIds = Array.isArray(req.body?.testTypeIds)
            ? [...new Set(req.body.testTypeIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
            : null;
        if (!testTypeIds) {
            return res.status(400).json({ error: 'testTypeIds array is required' });
        }

        const [labs] = await connection.execute(
            'SELECT labId FROM laboratories WHERE labId = ? LIMIT 1',
            [labId]
        );
        if (!labs.length) {
            return res.status(404).json({ message: 'Laboratory not found' });
        }

        await connection.beginTransaction();
        await connection.execute(
            'UPDATE laboratory_test_offerings SET isActive = 0, updatedAt = NOW() WHERE labId = ?',
            [labId]
        );

        for (const testTypeId of testTypeIds) {
            await connection.execute(
                `INSERT INTO laboratory_test_offerings (labId, testTypeId, isActive)
                 VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE isActive = 1, updatedAt = NOW()`,
                [labId, testTypeId]
            );
        }
        await connection.commit();

        const [rows] = await pool.execute(
            `SELECT o.offeringId, o.labId, o.testTypeId, o.isActive,
                    t.testCode, t.testName, t.category
             FROM laboratory_test_offerings o
             INNER JOIN lab_test_types t ON t.testTypeId = o.testTypeId
             WHERE o.labId = ? AND o.isActive = 1
             ORDER BY t.testName ASC`,
            [labId]
        );
        res.status(200).json({ labId, offerings: rows });
    } catch (error) {
        try { await connection.rollback(); } catch (_) { /* ignore */ }
        console.error('Error updating lab offerings:', error);
        res.status(500).json({ message: 'Error updating lab offerings', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/laboratory/labs-for-tests
 * @description Labs at a facility that offer the requested test types, with queue load for preference
 * query: testTypeIds=1,2,3 & branchId=
 */
router.get('/labs-for-tests', async (req, res) => {
    try {
        const rawIds = String(req.query.testTypeIds || '')
            .split(',')
            .map((s) => Number(String(s).trim()))
            .filter((n) => Number.isFinite(n) && n > 0);
        const testTypeIds = [...new Set(rawIds)];
        if (!testTypeIds.length) {
            return res.status(400).json({ error: 'testTypeIds is required (comma-separated)' });
        }

        const scope = await resolveFacilityScope(pool, req);
        const branchId = Number(req.query.branchId) || scope.currentBranchId || null;
        if (!branchId) {
            return res.status(400).json({ error: 'branchId is required (or sign in with a facility context)' });
        }

        const placeholders = testTypeIds.map(() => '?').join(',');
        const requiredCount = testTypeIds.length;

        // Labs that offer ALL requested tests (preferred set)
        const [fullMatch] = await pool.execute(
            `SELECT l.labId, l.labCode, l.labName, l.branchId, l.isDefault, l.location,
                    l.contactPerson, l.phone, l.email, l.notes, b.branchName,
                    COUNT(DISTINCT o.testTypeId) AS offeredCount
             FROM laboratories l
             INNER JOIN laboratory_test_offerings o
               ON o.labId = l.labId AND o.isActive = 1 AND o.testTypeId IN (${placeholders})
             LEFT JOIN branches b ON b.branchId = l.branchId
             WHERE l.branchId = ? AND l.isActive = 1
             GROUP BY l.labId
             HAVING offeredCount = ?
             ORDER BY l.isDefault DESC, l.labName ASC`,
            [...testTypeIds, branchId, requiredCount]
        );

        // Fallback: labs offering at least one of the tests
        let labs = fullMatch;
        let matchMode = 'all';
        if (!labs.length) {
            matchMode = 'any';
            const [partial] = await pool.execute(
                `SELECT l.labId, l.labCode, l.labName, l.branchId, l.isDefault, l.location,
                        l.contactPerson, l.phone, l.email, l.notes, b.branchName,
                        COUNT(DISTINCT o.testTypeId) AS offeredCount
                 FROM laboratories l
                 INNER JOIN laboratory_test_offerings o
                   ON o.labId = l.labId AND o.isActive = 1 AND o.testTypeId IN (${placeholders})
                 LEFT JOIN branches b ON b.branchId = l.branchId
                 WHERE l.branchId = ? AND l.isActive = 1
                 GROUP BY l.labId
                 ORDER BY offeredCount DESC, l.isDefault DESC, l.labName ASC`,
                [...testTypeIds, branchId]
            );
            labs = partial;
        }

        // If offerings table empty / unmapped, fall back to all active labs at branch
        if (!labs.length) {
            matchMode = 'facility_default';
            const [allLabs] = await pool.execute(
                `SELECT l.labId, l.labCode, l.labName, l.branchId, l.isDefault, l.location,
                        l.contactPerson, l.phone, l.email, l.notes, b.branchName,
                        ? AS offeredCount
                 FROM laboratories l
                 LEFT JOIN branches b ON b.branchId = l.branchId
                 WHERE l.branchId = ? AND l.isActive = 1
                 ORDER BY l.isDefault DESC, l.labName ASC`,
                [requiredCount, branchId]
            );
            labs = allLabs;
        }

        const enriched = [];
        for (const lab of labs) {
            const openOrders = await pool.execute(
                `SELECT COUNT(*) AS c FROM lab_test_orders
                 WHERE labId = ? AND status IN ('pending', 'sample_collected', 'in_progress')`,
                [lab.labId]
            ).then(([rows]) => Number(rows[0]?.c || 0)).catch(() => 0);

            const [branchQueue] = await pool.execute(
                `SELECT COUNT(*) AS waitingCount
                 FROM queue_entries q
                 WHERE q.servicePoint = 'laboratory'
                   AND q.status IN ('waiting', 'called', 'in-progress')
                   AND (q.branchId = ? OR q.branchId IS NULL)`,
                [branchId]
            );

            enriched.push({
                ...lab,
                offeredCount: Number(lab.offeredCount || 0),
                openOrderCount: openOrders,
                facilityLabQueueWaiting: Number(branchQueue[0]?.waitingCount || 0),
                waitingCount: openOrders,
            });
        }

        enriched.sort((a, b) => {
            if (a.waitingCount !== b.waitingCount) return a.waitingCount - b.waitingCount;
            if (Boolean(b.isDefault) !== Boolean(a.isDefault)) return Number(b.isDefault) - Number(a.isDefault);
            return String(a.labName).localeCompare(String(b.labName));
        });

        const preferredLabId = enriched[0]?.labId || null;
        res.status(200).json({
            branchId,
            testTypeIds,
            matchMode,
            preferredLabId,
            labs: enriched.map((lab) => ({
                ...lab,
                isPreferred: lab.labId === preferredLabId,
            })),
        });
    } catch (error) {
        console.error('Error fetching labs for tests:', error);
        res.status(500).json({ message: 'Error fetching labs for tests', error: error.message });
    }
});

module.exports = router;
