const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { resolveFacilityScope } = require('../lib/branchContext');
const {
  buildQueueBranchFilter,
  getRequestedServicePointId,
  resolveConsultationServicePointId,
  transferQueueToRoom,
} = require('../lib/queueService');

/**
 * @route GET /api/queue
 * @description Fetch active queue entries. When `servicePoint=cashier`, rows are limited to
 * patients who still have a billable reason to be at cashier (pending invoices / waivers).
 * When `servicePoint` is omitted, cashier rows are **not** filtered that way — merge
 * `?servicePoint=cashier` for correct cashier counts (see queue management page).
 */
router.get('/', async (req, res) => {
    try {
        const { servicePoint, status, includeCompleted, servicePointId, doctorId } = req.query;
        const scope = await resolveFacilityScope(pool, req);
        const branchFilter = buildQueueBranchFilter(scope, 'q.branchId');
        const resolvedServicePointId =
            Number(servicePointId) || getRequestedServicePointId(req) || null;

        // We include 'hasPendingBills' using a subquery to identify patients with unpaid invoices
        // This is crucial for the UI to show warning icons/indicators
        // For cashier queue, we also exclude patients whose consultation fees have been paid/waived
        let query = `
            SELECT q.*,
                   sp.pointName AS servicePointName, sp.pointCode AS servicePointCode,
                   p.firstName as patientFirstName, p.lastName as patientLastName,
                   p.phone as patientPhone, p.patientNumber,
                   EXISTS (
                       SELECT 1 FROM invoices i
                       WHERE i.patientId = q.patientId
                       AND i.status NOT IN ('paid', 'cancelled', 'draft')
                       AND i.balance > 0
                   ) as hasPendingBills
            FROM queue_entries q
            LEFT JOIN patients p ON q.patientId = p.patientId
            LEFT JOIN service_points sp ON q.servicePointId = sp.servicePointId
            WHERE 1=1
        `;
        const params = [];

        if (branchFilter.clause) {
            query += branchFilter.clause;
            params.push(...branchFilter.params);
        }
        // Facility-level queues share one list per service-point type. Do not hide
        // tickets created with NULL/other desk IDs when a pharmacy/lab/cashier desk
        // is selected (X-Service-Point-Id) — that made the pharmacy queue "disappear"
        // after the desk selector finished loading.
        const sharedFacilityQueues = new Set([
            'cashier',
            'billing',
            'registration',
            'triage',
            'pharmacy',
            'laboratory',
        ]);
        if (resolvedServicePointId && !sharedFacilityQueues.has(String(servicePoint || ''))) {
            query += ` AND q.servicePointId = ?`;
            params.push(resolvedServicePointId);
        }

        // For cashier queue, exclude patients whose consultation, prescription, or lab test fees are paid/waived
        // and who have no other pending bills
        if (servicePoint === 'cashier') {
            query += ` AND (
                -- Patient has bills that are NOT consultation, prescription, or lab test related
                EXISTS (
                    SELECT 1 FROM invoices i
                    WHERE i.patientId = q.patientId
                    AND i.status NOT IN ('paid', 'cancelled', 'draft')
                    AND i.balance > 0
                    AND i.notes NOT LIKE '%Consultation charge from triage%'
                    AND i.notes NOT LIKE '%Consultation%'
                    AND i.notes NOT LIKE '%Drug payment - Prescription:%'
                    AND i.notes NOT LIKE '%Lab payment - Order:%'
                )
                OR
                -- Patient has consultation bills that are NOT paid/waived
                EXISTS (
                    SELECT 1 FROM invoices i
                    LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                    WHERE i.patientId = q.patientId
                    AND (i.notes LIKE '%Consultation charge from triage%' OR i.notes LIKE '%Consultation%')
                    AND i.status NOT IN ('paid', 'cancelled', 'draft')
                    AND i.balance > 0
                    AND (bw.waiverId IS NULL OR bw.status != 'approved')
                )
                OR
                -- Patient has prescription bills that are NOT paid/waived
                EXISTS (
                    SELECT 1 FROM invoices i
                    LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                    WHERE i.patientId = q.patientId
                    AND i.notes LIKE '%Drug payment - Prescription:%'
                    AND i.status NOT IN ('paid', 'cancelled', 'draft')
                    AND i.balance > 0
                    AND (bw.waiverId IS NULL OR bw.status != 'approved')
                )
                OR
                -- Patient has lab test bills that are NOT paid/waived
                EXISTS (
                    SELECT 1 FROM invoices i
                    LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                    WHERE i.patientId = q.patientId
                    AND i.notes LIKE '%Lab payment - Order:%'
                    AND i.status NOT IN ('paid', 'cancelled', 'draft')
                    AND i.balance > 0
                    AND (bw.waiverId IS NULL OR bw.status != 'approved')
                )
            )`;
        }

        // By default, exclude completed and cancelled entries for active queue
        // Set includeCompleted=true to see all entries including completed ones
        if (includeCompleted !== 'true') {
            query += ` AND q.status NOT IN ('completed', 'cancelled')`;
        }

        if (servicePoint) {
            query += ` AND q.servicePoint = ?`;
            params.push(servicePoint);
        }
        if (status) {
            query += ` AND q.status = ?`;
            params.push(status);
        }
        if (doctorId) {
            query += ` AND q.doctorId = ?`;
            params.push(Number(doctorId));
        }

        // For pharmacy queue, only show patients who have paid pending prescription items ready for dispensing
        if (servicePoint === 'pharmacy') {
            query += ` AND EXISTS (
                SELECT 1 FROM prescription_items pi
                INNER JOIN prescriptions p ON pi.prescriptionId = p.prescriptionId
                WHERE p.patientId = q.patientId
                AND pi.status = 'pending'
                AND pi.medicationId IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM invoices i
                    INNER JOIN invoice_items ii ON i.invoiceId = ii.invoiceId
                    WHERE i.patientId = p.patientId
                    AND i.status = 'paid'
                    AND (
                        ii.description LIKE CONCAT('%', pi.medicationName, '%')
                        OR (ii.drugInventoryId IS NOT NULL AND EXISTS (
                            SELECT 1 FROM drug_inventory di_check
                            WHERE di_check.drugInventoryId = ii.drugInventoryId
                            AND di_check.medicationId = pi.medicationId
                        ))
                        OR i.notes LIKE CONCAT('%Prescription%')
                        OR i.notes LIKE CONCAT('%Drug payment%')
                    )
                )
                AND EXISTS (
                    SELECT 1 FROM drug_inventory di
                    WHERE di.medicationId = pi.medicationId
                    AND di.quantity > 0
                    AND di.status = 'active'
                    AND (di.expiryDate IS NULL OR di.expiryDate >= CURDATE())
                )
            )`;
        }

        query += ` ORDER BY q.arrivalTime ASC`;

        const [rows] = await pool.execute(query, params);

        // Convert the EXISTS result (usually 1 or 0) to a clean boolean
        const results = rows.map(row => ({
            ...row,
            hasPendingBills: !!row.hasPendingBills
        }));

        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching queue:', error);
        res.status(500).json({ message: 'Error fetching queue', error: error.message });
    }
});

/**
 * @route POST /api/queue
 * @description Create a new queue entry
 */
router.post('/', async (req, res) => {
    try {
        const queueData = req.body;
        const userId = req.user?.id || null;

        // Check for duplicate entry if adding to cashier queue
        if (queueData.servicePoint === 'cashier') {
            // First check if patient already exists in queue
            const [existingQueue] = await pool.execute(
                `SELECT queueId FROM queue_entries
                 WHERE patientId = ? AND servicePoint = 'cashier'
                 AND status IN ('waiting', 'called', 'serving')`,
                [queueData.patientId]
            );

            if (existingQueue.length > 0) {
                // Patient already in cashier queue, return existing entry
                const [existingEntry] = await pool.execute(
                    `SELECT q.*,
                            p.firstName as patientFirstName, p.lastName as patientLastName,
                            p.phone as patientPhone, p.patientNumber
                     FROM queue_entries q
                     LEFT JOIN patients p ON q.patientId = p.patientId
                     WHERE q.queueId = ?`,
                    [existingQueue[0].queueId]
                );
                return res.status(200).json({
                    ...existingEntry[0],
                    message: 'Patient already exists in cashier queue',
                    isDuplicate: true
                });
            }

            // Validate that patient has pending bills before adding to cashier queue
            // Exclude consultation, prescription, and lab test bills that are paid/waived
            const [pendingBills] = await pool.execute(
                `SELECT COUNT(*) as unpaidCount FROM invoices i
                 LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                 WHERE i.patientId = ?
                 AND i.status NOT IN ('paid', 'cancelled', 'draft')
                 AND i.balance > 0
                 AND NOT (
                     (i.notes LIKE '%Consultation charge from triage%' OR i.notes LIKE '%Consultation%')
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )
                 AND NOT (
                     i.notes LIKE '%Drug payment - Prescription:%'
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )
                 AND NOT (
                     i.notes LIKE '%Lab payment - Order:%'
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )`,
                [queueData.patientId]
            );

            if (pendingBills[0].unpaidCount === 0) {
                return res.status(400).json({
                    message: 'Cannot add patient to cashier queue: Patient has no pending bills (all bills are paid or waived).',
                    error: 'NO_PENDING_BILLS'
                });
            }
        }

        // Check for duplicate entry and validate pending prescriptions if adding to pharmacy queue
        if (queueData.servicePoint === 'pharmacy') {
            // First check if patient already exists in queue
            const [existingQueue] = await pool.execute(
                `SELECT queueId FROM queue_entries
                 WHERE patientId = ? AND servicePoint = 'pharmacy'
                 AND status IN ('waiting', 'called', 'serving')`,
                [queueData.patientId]
            );

            if (existingQueue.length > 0) {
                // Patient already in pharmacy queue, return existing entry
                const [existingEntry] = await pool.execute(
                    `SELECT q.*,
                            p.firstName as patientFirstName, p.lastName as patientLastName,
                            p.phone as patientPhone, p.patientNumber
                     FROM queue_entries q
                     LEFT JOIN patients p ON q.patientId = p.patientId
                     WHERE q.queueId = ?`,
                    [existingQueue[0].queueId]
                );
                return res.status(200).json({
                    ...existingEntry[0],
                    message: 'Patient already exists in pharmacy queue',
                    isDuplicate: true
                });
            }

            // Validate that patient has pending prescriptions before adding to pharmacy queue
            const [pendingPrescriptions] = await pool.execute(
                `SELECT COUNT(*) as pendingCount FROM prescriptions
                 WHERE patientId = ? AND status = 'pending'`,
                [queueData.patientId]
            );

            if (pendingPrescriptions[0].pendingCount === 0) {
                return res.status(400).json({
                    message: 'Cannot add patient to pharmacy queue: Patient has no pending prescriptions to dispense.',
                    error: 'NO_PENDING_PRESCRIPTIONS'
                });
            }
        }

        // Generate ticket number if not provided by client
        const scope = await resolveFacilityScope(pool, req);
        const branchId = Number(queueData.branchId) || scope.currentBranchId || null;
        let servicePointId =
            Number(queueData.servicePointId) || getRequestedServicePointId(req, queueData) || null;

        if (queueData.servicePoint === 'consultation' && !servicePointId) {
            servicePointId = await resolveConsultationServicePointId(pool, {
                consultationServicePointId: queueData.consultationServicePointId,
                doctorId: queueData.doctorId,
                branchId,
                patientId: queueData.patientId,
            });
        }

        if (!queueData.ticketNumber) {
            const connection = await pool.getConnection();
            try {
                queueData.ticketNumber = await require('../lib/queueService').generateTicketNumber(connection, {
                    branchId,
                    servicePoint: queueData.servicePoint || 'general',
                    servicePointId,
                });
            } finally {
                connection.release();
            }
        }

        // Detailed explicit null/undefined checks from original file
        const estimatedWaitTime = queueData.estimatedWaitTime !== undefined && queueData.estimatedWaitTime !== null && queueData.estimatedWaitTime !== ''
            ? parseInt(queueData.estimatedWaitTime)
            : null;
        const notes = queueData.notes !== undefined && queueData.notes !== null && queueData.notes !== ''
            ? queueData.notes
            : null;
        const doctorId = queueData.doctorId !== undefined && queueData.doctorId !== null && queueData.doctorId !== ''
            ? parseInt(queueData.doctorId)
            : null;

        const [result] = await pool.execute(
            `INSERT INTO queue_entries
            (branchId, servicePointId, patientId, doctorId, ticketNumber, servicePoint, priority, status, estimatedWaitTime, notes, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                branchId,
                servicePointId,
                queueData.patientId,
                doctorId,
                queueData.ticketNumber,
                queueData.servicePoint,
                queueData.priority || 'normal',
                queueData.status || 'waiting',
                estimatedWaitTime,
                notes,
                userId
            ]
        );

        const [newEntry] = await pool.execute(
            `SELECT q.*,
                    sp.pointName AS servicePointName,
                    p.firstName as patientFirstName, p.lastName as patientLastName,
                    p.phone as patientPhone, p.patientNumber
             FROM queue_entries q
             LEFT JOIN service_points sp ON q.servicePointId = sp.servicePointId
             LEFT JOIN patients p ON q.patientId = p.patientId
             WHERE q.queueId = ?`,
            [result.insertId]
        );

        res.status(201).json(newEntry[0]);
    } catch (error) {
        console.error('Error creating queue entry:', error);
        res.status(500).json({ message: 'Error creating queue entry', error: error.message });
    }
});

/**
 * @route POST /api/queue/:id/transfer-room
 * @description Move a consultation queue entry to another consultation room
 */
router.post('/:id/transfer-room', async (req, res) => {
    try {
        const { id } = req.params;
        const { servicePointId } = req.body;
        const userId = req.user?.id || null;

        if (!servicePointId) {
            return res.status(400).json({ message: 'servicePointId is required' });
        }

        const updated = await transferQueueToRoom(pool, id, servicePointId, userId);
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error transferring queue entry:', error);
        const status = error.message?.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message || 'Error transferring queue entry' });
    }
});

/**
 * @route GET /api/queue/history
 * @description Get archived queue entries (history) with filtering and pagination.
 * IMPORTANT: must be registered before GET /:id so "history" is not treated as a queueId.
 */
router.get('/history', async (req, res) => {
    try {
        const { servicePoint, status, patientId, startDate, endDate, page = 1, limit = 50 } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
        const offsetNum = (pageNum - 1) * limitNum;

        let query = `
            SELECT qh.*,
                   p.firstName as patientFirstName, p.lastName as patientLastName,
                   p.phone as patientPhone, p.patientNumber,
                   cu.firstName as staffFirstName, cu.lastName as staffLastName,
                   TRIM(CONCAT(COALESCE(cu.firstName, ''), ' ', COALESCE(cu.lastName, ''))) as staffName,
                   TRIM(CONCAT(COALESCE(cu.firstName, ''), ' ', COALESCE(cu.lastName, ''))) as createdByName,
                   b.branchName,
                   sp.pointName as servicePointName
            FROM queue_history qh
            LEFT JOIN patients p ON qh.patientId = p.patientId
            LEFT JOIN users cu ON qh.createdBy = cu.userId
            LEFT JOIN branches b ON qh.branchId = b.branchId
            LEFT JOIN service_points sp ON qh.servicePointId = sp.servicePointId
            WHERE 1=1
        `;
        const params = [];

        if (servicePoint) {
            query += ` AND qh.servicePoint = ?`;
            params.push(servicePoint);
        }
        if (status) {
            query += ` AND qh.status = ?`;
            params.push(status);
        }
        if (patientId) {
            query += ` AND qh.patientId = ?`;
            params.push(patientId);
        }
        if (startDate) {
            query += ` AND DATE(qh.endTime) >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND DATE(qh.endTime) <= ?`;
            params.push(endDate);
        }

        // LIMIT/OFFSET cannot be prepared placeholders on some MySQL versions (ER_WRONG_ARGUMENTS)
        query += ` ORDER BY qh.endTime DESC, qh.archivedAt DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching queue history:', error);
        res.status(500).json({ message: 'Error fetching queue history', error: error.message });
    }
});

/**
 * @route GET /api/queue/:id
 * @description Get specific queue entry details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute(
            `SELECT q.*,
                   p.firstName as patientFirstName, p.lastName as patientLastName,
                   p.phone as patientPhone, p.patientNumber,
                   du.firstName as doctorFirstName, du.lastName as doctorLastName,
                   TRIM(CONCAT(COALESCE(du.firstName, ''), ' ', COALESCE(du.lastName, ''))) as doctorName,
                   cu.firstName as staffFirstName, cu.lastName as staffLastName,
                   TRIM(CONCAT(COALESCE(cu.firstName, ''), ' ', COALESCE(cu.lastName, ''))) as staffName,
                   TRIM(CONCAT(COALESCE(cu.firstName, ''), ' ', COALESCE(cu.lastName, ''))) as createdByName,
                   b.branchName,
                   sp.pointName as servicePointName
            FROM queue_entries q
            LEFT JOIN patients p ON q.patientId = p.patientId
            LEFT JOIN users du ON q.doctorId = du.userId
            LEFT JOIN users cu ON q.createdBy = cu.userId
            LEFT JOIN branches b ON q.branchId = b.branchId
            LEFT JOIN service_points sp ON q.servicePointId = sp.servicePointId
            WHERE q.queueId = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Queue entry not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching queue entry:', error);
        res.status(500).json({ message: 'Error fetching queue entry', error: error.message });
    }
});

/**
 * @route PUT /api/queue/:id
 * @description General update for queue details (priority, doctor, etc)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { patientId, servicePoint, priority, estimatedWaitTime, notes, doctorId, servicePointId } = req.body;

        const updates = [];
        const values = [];

        if (patientId !== undefined) {
            updates.push('patientId = ?');
            values.push(patientId);
        }
        if (servicePoint !== undefined) {
            updates.push('servicePoint = ?');
            values.push(servicePoint);
        }
        if (priority !== undefined) {
            updates.push('priority = ?');
            values.push(priority);
        }
        if (doctorId !== undefined) {
            updates.push('doctorId = ?');
            values.push(doctorId !== null && doctorId !== '' ? parseInt(doctorId) : null);
        }
        if (servicePointId !== undefined) {
            const parsedSpId = Number(servicePointId);
            updates.push('servicePointId = ?');
            values.push(Number.isFinite(parsedSpId) && parsedSpId > 0 ? parsedSpId : null);
        }
        if (estimatedWaitTime !== undefined) {
            updates.push('estimatedWaitTime = ?');
            values.push(estimatedWaitTime !== null && estimatedWaitTime !== '' ? parseInt(estimatedWaitTime) : null);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes !== null && notes !== '' ? notes : null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        updates.push('updatedAt = NOW()');
        values.push(id);

        await pool.execute(
            `UPDATE queue_entries SET ${updates.join(', ')} WHERE queueId = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT q.*,
                   p.firstName as patientFirstName, p.lastName as patientLastName,
                   p.phone as patientPhone, p.patientNumber
            FROM queue_entries q
            LEFT JOIN patients p ON q.patientId = p.patientId
            WHERE q.queueId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating queue entry:', error);
        res.status(500).json({ message: 'Error updating queue entry', error: error.message });
    }
});

/**
 * @route PUT /api/queue/:id/status
 * @description Update queue status with a specific block for Cashier point if bills are unpaid
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // 1. Fetch current entry to check servicePoint and patientId
        const [current] = await pool.execute('SELECT * FROM queue_entries WHERE queueId = ?', [id]);
        if (current.length === 0) return res.status(404).json({ message: 'Queue entry not found' });

        const entry = current[0];

        // 2. NEW LOGIC: If trying to complete a Cashier entry, check for unpaid bills
        // Exclude consultation, prescription, and lab test fees that have been paid or waived
        if (status === 'completed' && entry.servicePoint === 'cashier') {
            const [bills] = await pool.execute(
                `SELECT COUNT(*) as unpaidCount FROM invoices i
                 LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                 WHERE i.patientId = ?
                 AND i.status NOT IN ('paid', 'cancelled', 'draft')
                 AND i.balance > 0
                 AND NOT (
                     (i.notes LIKE '%Consultation charge from triage%' OR i.notes LIKE '%Consultation%')
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )
                 AND NOT (
                     i.notes LIKE '%Drug payment - Prescription:%'
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )
                 AND NOT (
                     i.notes LIKE '%Lab payment - Order:%'
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )`,
                [entry.patientId]
            );

            if (bills[0].unpaidCount > 0) {
                return res.status(400).json({
                    message: 'Cannot complete cashier queue: Patient has pending bills.',
                    unpaidCount: bills[0].unpaidCount
                });
            }
        }

        const updates = ['status = ?'];
        const values = [status];

        // Timestamp updates based on state transition
        if (status === 'called') {
            updates.push('calledTime = NOW()');
        } else if (status === 'serving') {
            updates.push('startTime = NOW()');
        } else if (status === 'completed' || status === 'cancelled') {
            updates.push('endTime = NOW()');
        }

        values.push(id);

        await pool.execute(
            `UPDATE queue_entries SET ${updates.join(', ')}, updatedAt = NOW() WHERE queueId = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT q.*,
                   p.firstName as patientFirstName, p.lastName as patientLastName,
                   p.phone as patientPhone, p.patientNumber
            FROM queue_entries q
            LEFT JOIN patients p ON q.patientId = p.patientId
            WHERE q.queueId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating queue status:', error);
        res.status(500).json({ message: 'Error updating queue status', error: error.message });
    }
});

/**
 * @route POST /api/queue/:id/archive
 * @description Archive a completed queue entry to history table with metric calculation
 */
router.post('/:id/archive', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get the queue entry
        const [queueEntries] = await connection.execute(
            'SELECT * FROM queue_entries WHERE queueId = ?',
            [id]
        );

        if (queueEntries.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Queue entry not found' });
        }

        const queue = queueEntries[0];

        // NEW LOGIC: Block archiving for cashier point if patient still owes money
        // Exclude consultation, prescription, and lab test fees that have been paid or waived
        if (queue.servicePoint === 'cashier') {
            const [bills] = await connection.execute(
                `SELECT COUNT(*) as unpaidCount FROM invoices i
                 LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                 WHERE i.patientId = ?
                 AND i.status NOT IN ('paid', 'cancelled', 'draft')
                 AND i.balance > 0
                 AND NOT (
                     (i.notes LIKE '%Consultation charge from triage%' OR i.notes LIKE '%Consultation%')
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )
                 AND NOT (
                     i.notes LIKE '%Drug payment - Prescription:%'
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )
                 AND NOT (
                     i.notes LIKE '%Lab payment - Order:%'
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )`,
                [queue.patientId]
            );

            if (bills[0].unpaidCount > 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Cannot archive: Patient still has pending bills at Cashier.',
                    unpaidCount: bills[0].unpaidCount
                });
            }
        }

        // Detailed Metrics calculation from original file
        let waitTimeMinutes = null;
        let serviceTimeMinutes = null;
        let totalTimeMinutes = null;

        if (queue.arrivalTime) {
            const arrival = new Date(queue.arrivalTime);

            if (queue.calledTime) {
                const called = new Date(queue.calledTime);
                waitTimeMinutes = Math.floor((called - arrival) / 60000);
            }

            if (queue.startTime && queue.endTime) {
                const start = new Date(queue.startTime);
                const end = new Date(queue.endTime);
                serviceTimeMinutes = Math.floor((end - start) / 60000);
            }

            if (queue.endTime) {
                const end = new Date(queue.endTime);
                totalTimeMinutes = Math.floor((end - arrival) / 60000);
            }
        }

        // Insert into history table
        await connection.execute(
            `INSERT INTO queue_history
            (queueId, patientId, ticketNumber, servicePoint, priority, status,
             estimatedWaitTime, arrivalTime, calledTime, startTime, endTime, notes, createdBy,
             waitTimeMinutes, serviceTimeMinutes, totalTimeMinutes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                queue.queueId,
                queue.patientId,
                queue.ticketNumber,
                queue.servicePoint,
                queue.priority,
                queue.status || 'completed',
                queue.estimatedWaitTime,
                queue.arrivalTime,
                queue.calledTime,
                queue.startTime,
                queue.endTime,
                queue.notes,
                queue.createdBy,
                waitTimeMinutes,
                serviceTimeMinutes,
                totalTimeMinutes
            ]
        );

        // Delete from active queue
        await connection.execute(
            'DELETE FROM queue_entries WHERE queueId = ?',
            [id]
        );

        await connection.commit();
        res.status(200).json({
            message: 'Queue entry archived successfully',
            waitTimeMinutes,
            serviceTimeMinutes,
            totalTimeMinutes
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving queue entry:', error);
        res.status(500).json({ message: 'Error archiving queue entry', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route POST /api/queue/archive-completed
 * @description Archive all completed queue entries (batch operation)
 */
router.post('/archive-completed', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get all completed entries
        const [completedEntries] = await connection.execute(
            `SELECT * FROM queue_entries
             WHERE status IN ('completed', 'cancelled')`
        );

        let archivedCount = 0;

        for (const queue of completedEntries) {
            // Note: Batch archive usually skips the bill check as items are already 'completed' status
            let waitTimeMinutes = null, serviceTimeMinutes = null, totalTimeMinutes = null;

            if (queue.arrivalTime) {
                const arrival = new Date(queue.arrivalTime);
                if (queue.calledTime) waitTimeMinutes = Math.floor((new Date(queue.calledTime) - arrival) / 60000);
                if (queue.startTime && queue.endTime) serviceTimeMinutes = Math.floor((new Date(queue.endTime) - new Date(queue.startTime)) / 60000);
                if (queue.endTime) totalTimeMinutes = Math.floor((new Date(queue.endTime) - arrival) / 60000);
            }

            // Insert into history
            await connection.execute(
                `INSERT INTO queue_history
                (queueId, patientId, ticketNumber, servicePoint, priority, status,
                 estimatedWaitTime, arrivalTime, calledTime, startTime, endTime, notes, createdBy,
                 waitTimeMinutes, serviceTimeMinutes, totalTimeMinutes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    queue.queueId, queue.patientId, queue.ticketNumber, queue.servicePoint, queue.priority, queue.status,
                    queue.estimatedWaitTime, queue.arrivalTime, queue.calledTime, queue.startTime, queue.endTime, queue.notes, queue.createdBy,
                    waitTimeMinutes, serviceTimeMinutes, totalTimeMinutes
                ]
            );

            // Delete from active queue
            await connection.execute('DELETE FROM queue_entries WHERE queueId = ?', [queue.queueId]);
            archivedCount++;
        }

        await connection.commit();
        res.status(200).json({ message: `Successfully archived ${archivedCount} entries`, archivedCount });
    } catch (error) {
        await connection.rollback();
        console.error('Error batch archiving:', error);
        res.status(500).json({ message: 'Batch archive failed', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/queue/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute('SELECT * FROM queue_entries WHERE queueId = ?', [id]);

        if (existing.length === 0) return res.status(404).json({ message: 'Queue entry not found' });

        if (existing[0].status === 'completed' || existing[0].status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot delete completed entries. Use archive instead.' });
        }

        await pool.execute('DELETE FROM queue_entries WHERE queueId = ?', [id]);
        res.status(200).json({ message: 'Queue entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting queue entry:', error);
        res.status(500).json({ message: 'Error deleting queue entry', error: error.message });
    }
});

/**
 * @route POST /api/queue/cashier/check-and-complete
 * @description Manual check to complete cashier queue if payment was confirmed
 */
router.post('/cashier/check-and-complete', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { patientId, patientNumber } = req.body;
        let targetPatientId = patientId;

        if (!targetPatientId && patientNumber) {
            const [p] = await connection.execute('SELECT patientId FROM patients WHERE patientNumber = ?', [patientNumber]);
            if (p.length > 0) targetPatientId = p[0].patientId;
        }

        if (!targetPatientId) {
            await connection.rollback();
            return res.status(400).json({ message: 'patientId or patientNumber is required' });
        }

        const [invoices] = await connection.execute(
            `SELECT invoiceId, status, balance FROM invoices
             WHERE patientId = ? AND status NOT IN ('draft', 'cancelled')`,
            [targetPatientId]
        );

        let allPaid = invoices.length > 0 ? invoices.every(i => parseFloat(i.balance) <= 0 || i.status === 'paid') : true;

        const completedQueues = [];
        if (allPaid) {
            const [cashierQueues] = await connection.execute(
                `SELECT queueId FROM queue_entries
                 WHERE patientId = ? AND servicePoint = 'cashier' AND status NOT IN ('completed', 'cancelled')`,
                [targetPatientId]
            );

            for (const q of cashierQueues) {
                await connection.execute(
                    `UPDATE queue_entries SET status = 'completed', endTime = NOW(), updatedAt = NOW() WHERE queueId = ?`,
                    [q.queueId]
                );
                completedQueues.push(q.queueId);
            }
        }

        await connection.commit();
        res.status(200).json({ allInvoicesPaid: allPaid, completedQueueIds: completedQueues });
    } catch (error) {
        await connection.rollback();
        console.error('Error in manual cashier check:', error);
        res.status(500).json({ message: 'Error in manual cashier check', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route POST /api/queue/cashier/cleanup
 * @description Remove patients from cashier queue who have no pending bills
 */
router.post('/cashier/cleanup', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Find all active cashier queue entries
        const [cashierQueues] = await connection.execute(
            `SELECT queueId, patientId, ticketNumber
             FROM queue_entries
             WHERE servicePoint = 'cashier'
               AND status NOT IN ('completed', 'cancelled')`
        );

        const removedQueues = [];
        const keptQueues = [];

        for (const queue of cashierQueues) {
            // Check if patient has pending bills (excluding consultation fees that are paid/waived)
            const [pendingBills] = await connection.execute(
                `SELECT COUNT(*) as unpaidCount FROM invoices i
                 LEFT JOIN bill_waivers bw ON i.invoiceId = bw.invoiceId AND bw.status = 'approved'
                 WHERE i.patientId = ?
                 AND i.status NOT IN ('paid', 'cancelled', 'draft')
                 AND i.balance > 0
                 AND NOT (
                     (i.notes LIKE '%Consultation charge from triage%' OR i.notes LIKE '%Consultation%')
                     AND (
                         (i.status = 'paid' AND i.balance <= 0)
                         OR (bw.waiverId IS NOT NULL AND bw.status = 'approved')
                     )
                 )`,
                [queue.patientId]
            );

            if (pendingBills[0].unpaidCount === 0) {
                // Patient has no pending bills, cancel this queue entry
                await connection.execute(
                    `UPDATE queue_entries
                     SET status = 'cancelled', endTime = NOW(), updatedAt = NOW(),
                         notes = CONCAT(COALESCE(notes, ''), ' - Auto-cancelled: No pending bills')
                     WHERE queueId = ?`,
                    [queue.queueId]
                );
                removedQueues.push({
                    queueId: queue.queueId,
                    ticketNumber: queue.ticketNumber,
                    patientId: queue.patientId
                });
            } else {
                keptQueues.push({
                    queueId: queue.queueId,
                    ticketNumber: queue.ticketNumber,
                    patientId: queue.patientId
                });
            }
        }

        await connection.commit();
        res.status(200).json({
            message: `Cleanup completed. Removed ${removedQueues.length} entries, kept ${keptQueues.length} entries.`,
            removed: removedQueues,
            kept: keptQueues,
            removedCount: removedQueues.length,
            keptCount: keptQueues.length
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error cleaning up cashier queue:', error);
        res.status(500).json({ message: 'Error cleaning up cashier queue', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route POST /api/queue/pharmacy/cleanup
 * @description Remove patients from pharmacy queue who have no pending prescriptions
 */
router.post('/pharmacy/cleanup', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Find all active pharmacy queue entries
        const [pharmacyQueues] = await connection.execute(
            `SELECT queueId, patientId, ticketNumber
             FROM queue_entries
             WHERE servicePoint = 'pharmacy'
               AND status NOT IN ('completed', 'cancelled')`
        );

        const removedQueues = [];
        const keptQueues = [];

        for (const queue of pharmacyQueues) {
            // Check if patient has pending prescriptions
            const [pendingPrescriptions] = await connection.execute(
                `SELECT COUNT(*) as pendingCount FROM prescriptions
                 WHERE patientId = ? AND status = 'pending'`,
                [queue.patientId]
            );

            if (pendingPrescriptions[0].pendingCount === 0) {
                // Patient has no pending prescriptions, cancel this queue entry
                await connection.execute(
                    `UPDATE queue_entries
                     SET status = 'cancelled', endTime = NOW(), updatedAt = NOW(),
                         notes = CONCAT(COALESCE(notes, ''), ' - Auto-cancelled: No pending prescriptions')
                     WHERE queueId = ?`,
                    [queue.queueId]
                );
                removedQueues.push({
                    queueId: queue.queueId,
                    ticketNumber: queue.ticketNumber,
                    patientId: queue.patientId
                });
            } else {
                keptQueues.push({
                    queueId: queue.queueId,
                    ticketNumber: queue.ticketNumber,
                    patientId: queue.patientId
                });
            }
        }

        await connection.commit();
        res.status(200).json({
            message: `Cleanup completed. Removed ${removedQueues.length} entries, kept ${keptQueues.length} entries.`,
            removed: removedQueues,
            kept: keptQueues,
            removedCount: removedQueues.length,
            keptCount: keptQueues.length
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error cleaning up pharmacy queue:', error);
        res.status(500).json({ message: 'Error cleaning up pharmacy queue', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route POST /api/queue/cleanup-old
 * @description Complete queue entries that have been in the queue for more than 48 hours
 * @access Admin only (should be protected by middleware)
 */
router.post('/cleanup-old', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { dryRun } = req.body;
        const isDryRun = dryRun === true || dryRun === 'true';

        console.log(`[QUEUE CLEANUP API] Starting cleanup${isDryRun ? ' (DRY RUN)' : ''}...`);

        // Find queue entries that are older than 48 hours and not already completed/cancelled
        const [oldQueues] = await connection.execute(
            `SELECT queueId, patientId, ticketNumber, servicePoint, status, arrivalTime, createdAt
             FROM queue_entries
             WHERE status NOT IN ('completed', 'cancelled')
             AND (
                 (arrivalTime IS NOT NULL AND arrivalTime < DATE_SUB(NOW(), INTERVAL 48 HOUR))
                 OR (arrivalTime IS NULL AND createdAt < DATE_SUB(NOW(), INTERVAL 48 HOUR))
             )
             ORDER BY arrivalTime ASC, createdAt ASC`
        );

        console.log(`[QUEUE CLEANUP API] Found ${oldQueues.length} queue entries older than 48 hours`);

        if (oldQueues.length === 0) {
            await connection.rollback();
            return res.status(200).json({
                message: 'No old queue entries to clean up.',
                dryRun: isDryRun,
                totalFound: 0,
                completed: 0,
                errors: 0,
                summary: {}
            });
        }

        // Calculate summary by service point
        const summary = {};
        for (const queue of oldQueues) {
            const servicePoint = queue.servicePoint || 'unknown';
            summary[servicePoint] = (summary[servicePoint] || 0) + 1;
        }

        if (isDryRun) {
            await connection.rollback();
            return res.status(200).json({
                message: 'Dry run completed. No changes were made.',
                dryRun: true,
                totalFound: oldQueues.length,
                completed: 0,
                errors: 0,
                summary: summary,
                entries: oldQueues.slice(0, 50) // Return first 50 for preview
            });
        }

        // Update each queue entry
        let completedCount = 0;
        let errorCount = 0;
        const completedEntries = [];
        const errors = [];

        for (const queue of oldQueues) {
            try {
                const ageHours = queue.arrivalTime
                    ? Math.round((new Date() - new Date(queue.arrivalTime)) / (1000 * 60 * 60))
                    : Math.round((new Date() - new Date(queue.createdAt)) / (1000 * 60 * 60));

                await connection.execute(
                    `UPDATE queue_entries
                     SET status = 'completed',
                         endTime = NOW(),
                         updatedAt = NOW(),
                         notes = CONCAT(
                             COALESCE(notes, ''),
                             CASE WHEN notes IS NOT NULL AND notes != '' THEN ' | ' ELSE '' END,
                             'Auto-completed: Queue entry older than 48 hours (', ?, ' hours old)'
                         )
                     WHERE queueId = ?`,
                    [ageHours, queue.queueId]
                );

                completedCount++;
                completedEntries.push({
                    queueId: queue.queueId,
                    ticketNumber: queue.ticketNumber,
                    servicePoint: queue.servicePoint,
                    ageHours: ageHours
                });
            } catch (error) {
                errorCount++;
                errors.push({
                    queueId: queue.queueId,
                    error: error.message
                });
                console.error(`[QUEUE CLEANUP API] Error completing queue ${queue.queueId}:`, error.message);
            }
        }

        await connection.commit();

        console.log(`[QUEUE CLEANUP API] Cleanup completed: ${completedCount} entries completed, ${errorCount} errors`);

        res.status(200).json({
            message: `Cleanup completed successfully. ${completedCount} entries completed, ${errorCount} errors.`,
            dryRun: false,
            totalFound: oldQueues.length,
            completed: completedCount,
            errors: errorCount,
            summary: summary,
            completedEntries: completedEntries.slice(0, 100), // Return first 100
            errors: errors
        });

    } catch (error) {
        await connection.rollback();
        console.error('[QUEUE CLEANUP API] Error during cleanup:', error);
        res.status(500).json({
            message: 'Error during queue cleanup',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;