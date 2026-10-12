// ICU routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/icu/admissions
 * @description Get all ICU admissions
 */
router.get('/admissions', async (req, res) => {
    try {
        const { status, page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT ia.*,
                   a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes, a.admittingDoctorId,
                   pt.patientId, pt.firstName, pt.lastName, pt.patientNumber,
                   u.firstName as doctorFirstName, u.lastName as doctorLastName, u.userId as doctorUserId,
                   ib.bedNumber, ib.bedType, ib.equipmentList, ib.icuBedId
            FROM icu_admissions ia
            LEFT JOIN admissions a ON ia.admissionId = a.admissionId
            LEFT JOIN patients pt ON a.patientId = pt.patientId
            LEFT JOIN users u ON a.admittingDoctorId = u.userId
            LEFT JOIN icu_beds ib ON ia.icuBedId = ib.icuBedId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND ia.status = ?`;
            params.push(status);
        }

        if (search) {
            query += ` AND (a.admissionNumber LIKE ? OR pt.firstName LIKE ? OR pt.lastName LIKE ? OR pt.patientNumber LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY a.admissionDate DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [admissions] = await pool.execute(query, params);

        res.status(200).json(admissions);
    } catch (error) {
        console.error('Error fetching ICU admissions:', error);
        res.status(500).json({ message: 'Error fetching ICU admissions', error: error.message });
    }
});

/**
 * @route GET /api/icu/admissions/:id
 * @description Get a single ICU admission
 */
router.get('/admissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [admissions] = await pool.execute(
            `SELECT ia.*,
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes, a.admittingDoctorId,
                    pt.patientId, pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName, u.userId as doctorUserId,
                    ib.bedNumber, ib.bedType, ib.equipmentList, ib.icuBedId
             FROM icu_admissions ia
             LEFT JOIN admissions a ON ia.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN icu_beds ib ON ia.icuBedId = ib.icuBedId
             WHERE ia.icuAdmissionId = ?`,
            [id]
        );

        if (admissions.length === 0) {
            return res.status(404).json({ message: 'ICU admission not found' });
        }

        res.status(200).json(admissions[0]);
    } catch (error) {
        console.error('Error fetching ICU admission:', error);
        res.status(500).json({ message: 'Error fetching ICU admission', error: error.message });
    }
});

/**
 * @route POST /api/icu/admissions
 * @description Create a new ICU admission
 */
router.post('/admissions', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            patientId, icuBedId, admissionDate, admittingDoctorId,
            admissionReason, initialCondition, status, expectedDischargeDate, notes
        } = req.body;

        console.log('ICU Admission Request:', {
            patientId, icuBedId, admissionDate, admittingDoctorId,
            admissionReason, initialCondition, status, notes
        });

        // Validate required fields
        if (!patientId || !icuBedId || !admittingDoctorId) {
            await connection.rollback();
            return res.status(400).json({ message: 'Missing required fields: patientId, icuBedId, admittingDoctorId' });
        }

        // Parse and validate admissionDate
        // MySQL prefers DATETIME strings in format: 'YYYY-MM-DD HH:MM:SS'
        let parsedAdmissionDate;
        if (admissionDate) {
            if (typeof admissionDate === 'string') {
                // Validate the format is YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
                const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

                if (datetimeRegex.test(admissionDate)) {
                    // Already in correct format, use as-is
                    parsedAdmissionDate = admissionDate;
                } else if (dateRegex.test(admissionDate)) {
                    // Only date provided, add default time
                    parsedAdmissionDate = admissionDate + ' 00:00:00';
                } else {
                    // Try to parse and reformat
                    const dateObj = new Date(admissionDate.replace(' ', 'T'));
                    if (isNaN(dateObj.getTime())) {
                        await connection.rollback();
                        return res.status(400).json({ message: 'Invalid admissionDate format', received: admissionDate });
                    }
                    // Format as MySQL DATETIME string
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                    parsedAdmissionDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                }
            } else if (admissionDate instanceof Date) {
                // Format Date object as MySQL DATETIME string
                const year = admissionDate.getFullYear();
                const month = String(admissionDate.getMonth() + 1).padStart(2, '0');
                const day = String(admissionDate.getDate()).padStart(2, '0');
                const hours = String(admissionDate.getHours()).padStart(2, '0');
                const minutes = String(admissionDate.getMinutes()).padStart(2, '0');
                const seconds = String(admissionDate.getSeconds()).padStart(2, '0');
                parsedAdmissionDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            } else {
                // Default to current date/time
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                parsedAdmissionDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
        } else {
            // Default to current date/time
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            parsedAdmissionDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        console.log('Parsed admission date (string format):', parsedAdmissionDate);

        // Generate admission number
        const [count] = await connection.query('SELECT COUNT(*) as count FROM admissions');
        const admissionNumber = `ICU-${String(count[0].count + 1).padStart(6, '0')}`;

        // Insert general admission first
        // Note: admissions table requires bedId NOT NULL, but ICU uses icu_beds
        // For ICU admissions, we'll use a placeholder bedId
        // First, get a placeholder bedId - use a simple query to avoid connection issues
        let bedIdForAdmission = 1; // Default fallback

        try {
            const [bedCheck] = await connection.query(
                'SELECT bedId FROM beds ORDER BY bedId LIMIT 1'
            );
            if (Array.isArray(bedCheck) && bedCheck.length > 0 && bedCheck[0].bedId) {
                bedIdForAdmission = bedCheck[0].bedId;
            }
        } catch (bedError) {
            console.error('Error finding placeholder bed, using default bedId=1:', bedError.message);
            // Continue with default bedId = 1
        }

        console.log('Using bedId for admission:', bedIdForAdmission);
        console.log('Inserting admission with values:', {
            admissionNumber: String(admissionNumber),
            patientId: Number(patientId),
            bedId: Number(bedIdForAdmission),
            admissionDate: String(parsedAdmissionDate),
            admittingDoctorId: Number(admittingDoctorId),
            notes: notes ? String(notes) : null
        });

        // Use query instead of execute to see if that helps
        const [admissionResult] = await connection.query(
            `INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, status)
             VALUES (?, ?, ?, ?, ?, ?, 'admitted')`,
            [admissionNumber, patientId, bedIdForAdmission, parsedAdmissionDate, admittingDoctorId, 'ICU Admission', notes || null]
        );

        const admissionId = admissionResult.insertId;

        // Insert ICU admission
        const [icuResult] = await connection.query(
            `INSERT INTO icu_admissions (
                admissionId, icuBedId, admissionReason, initialCondition, status, expectedDischargeDate, notes
             )
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                admissionId,
                icuBedId,
                admissionReason || null,
                initialCondition || null,
                status || 'critical',
                expectedDischargeDate || null,
                notes || null
            ]
        );

        const icuAdmissionId = icuResult.insertId;

        // Update ICU bed status to occupied
        await connection.query(
            'UPDATE icu_beds SET status = ? WHERE icuBedId = ?',
            ['occupied', icuBedId]
        );

        await connection.commit();

        // Fetch created admission
        const [newAdmission] = await connection.execute(
            `SELECT ia.*,
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName,
                    ib.bedNumber, ib.bedType, ib.equipmentList
             FROM icu_admissions ia
             LEFT JOIN admissions a ON ia.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN icu_beds ib ON ia.icuBedId = ib.icuBedId
             WHERE ia.icuAdmissionId = ?`,
            [icuAdmissionId]
        );

        res.status(201).json(newAdmission[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating ICU admission:', error);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        console.error('Error sqlState:', error.sqlState);
        console.error('Error sqlMessage:', error.sqlMessage);

        // Return more detailed error information
        const errorMessage = error.sqlMessage || error.message || 'Unknown error';
        const errorCode = error.code || 'UNKNOWN';

        res.status(500).json({
            message: 'Error creating ICU admission',
            error: errorMessage,
            code: errorCode,
            sqlState: error.sqlState
        });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/icu/admissions/:id
 * @description Update an ICU admission
 */
router.put('/admissions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            icuBedId, admissionReason, initialCondition, status, expectedDischargeDate, notes
        } = req.body;

        // Check if admission exists
        const [existing] = await connection.execute(
            `SELECT ia.icuBedId, ia.status
             FROM icu_admissions ia
             WHERE ia.icuAdmissionId = ?`,
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ICU admission not found' });
        }

        const oldBedId = existing[0].icuBedId;
        const oldStatus = existing[0].status;

        // Update ICU bed if changed
        if (icuBedId !== undefined && icuBedId !== oldBedId) {
            // Free old bed
            await connection.execute(
                'UPDATE icu_beds SET status = ? WHERE icuBedId = ?',
                ['available', oldBedId]
            );
            // Occupy new bed
            await connection.execute(
                'UPDATE icu_beds SET status = ? WHERE icuBedId = ?',
                ['occupied', icuBedId]
            );
        }

        // Update ICU admission
        const updates = [];
        const values = [];

        if (icuBedId !== undefined) {
            updates.push('icuBedId = ?');
            values.push(icuBedId);
        }
        if (admissionReason !== undefined) {
            updates.push('admissionReason = ?');
            values.push(admissionReason || null);
        }
        if (initialCondition !== undefined) {
            updates.push('initialCondition = ?');
            values.push(initialCondition || null);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (expectedDischargeDate !== undefined) {
            updates.push('expectedDischargeDate = ?');
            values.push(expectedDischargeDate || null);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes || null);
        }

        if (updates.length > 0) {
            updates.push('updatedAt = NOW()');
            values.push(id);
            await connection.execute(
                `UPDATE icu_admissions SET ${updates.join(', ')} WHERE icuAdmissionId = ?`,
                values
            );
        }

        await connection.commit();

        // Fetch updated admission
        const [updated] = await connection.execute(
            `SELECT ia.*,
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName,
                    ib.bedNumber, ib.bedType, ib.equipmentList
             FROM icu_admissions ia
             LEFT JOIN admissions a ON ia.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN icu_beds ib ON ia.icuBedId = ib.icuBedId
             WHERE ia.icuAdmissionId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating ICU admission:', error);
        res.status(500).json({ message: 'Error updating ICU admission', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/icu/admissions/:id
 * @description Delete (discharge) an ICU admission
 */
router.delete('/admissions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get admission details
        const [admission] = await connection.execute(
            `SELECT ia.icuBedId, ia.admissionId, ia.status
             FROM icu_admissions ia
             WHERE ia.icuAdmissionId = ?`,
            [id]
        );

        if (admission.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ICU admission not found' });
        }

        const icuBedId = admission[0].icuBedId;
        const admissionId = admission[0].admissionId;

        // Update admission status to discharged
        await connection.execute(
            'UPDATE admissions SET status = ?, updatedAt = NOW() WHERE admissionId = ?',
            ['discharged', admissionId]
        );

        // Free the ICU bed
        await connection.execute(
            'UPDATE icu_beds SET status = ? WHERE icuBedId = ?',
            ['available', icuBedId]
        );

        await connection.commit();

        res.status(200).json({ message: 'ICU admission discharged successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error discharging ICU admission:', error);
        res.status(500).json({ message: 'Error discharging ICU admission', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/icu/beds
 * @description Get all ICU beds
 */
router.get('/beds', async (req, res) => {
    try {
        const { status, page = 1, limit = 100 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT ib.*,
                   ia.icuAdmissionId,
                   a.admissionNumber,
                   pt.firstName, pt.lastName, pt.patientNumber
            FROM icu_beds ib
            LEFT JOIN icu_admissions ia ON ib.icuBedId = ia.icuBedId
                AND ia.status IN ('critical', 'serious', 'stable', 'improving')
            LEFT JOIN admissions a ON ia.admissionId = a.admissionId
            LEFT JOIN patients pt ON a.patientId = pt.patientId
            WHERE ib.isActive = 1
        `;
        const params = [];

        if (status) {
            query += ` AND ib.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ib.bedNumber LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [beds] = await pool.execute(query, params);

        res.status(200).json(beds);
    } catch (error) {
        console.error('Error fetching ICU beds:', error);
        res.status(500).json({ message: 'Error fetching ICU beds', error: error.message });
    }
});

/**
 * @route GET /api/icu/beds/:id
 * @description Get a single ICU bed
 */
router.get('/beds/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [beds] = await pool.execute(
            `SELECT ib.*,
                    ia.icuAdmissionId,
                    a.admissionNumber,
                    pt.firstName, pt.lastName, pt.patientNumber
             FROM icu_beds ib
             LEFT JOIN icu_admissions ia ON ib.icuBedId = ia.icuBedId
                 AND ia.status IN ('critical', 'serious', 'stable', 'improving')
             LEFT JOIN admissions a ON ia.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             WHERE ib.icuBedId = ?`,
            [id]
        );

        if (beds.length === 0) {
            return res.status(404).json({ message: 'ICU bed not found' });
        }

        res.status(200).json(beds[0]);
    } catch (error) {
        console.error('Error fetching ICU bed:', error);
        res.status(500).json({ message: 'Error fetching ICU bed', error: error.message });
    }
});

/**
 * @route POST /api/icu/beds
 * @description Create a new ICU bed
 */
router.post('/beds', async (req, res) => {
    try {
        const { bedNumber, bedType, status, equipmentList } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO icu_beds (bedNumber, bedType, status, equipmentList)
             VALUES (?, ?, ?, ?)`,
            [bedNumber, bedType || 'standard', status || 'available', equipmentList || null]
        );

        const [newBed] = await pool.execute(
            'SELECT * FROM icu_beds WHERE icuBedId = ?',
            [result.insertId]
        );

        res.status(201).json(newBed[0]);
    } catch (error) {
        console.error('Error creating ICU bed:', error);
        res.status(500).json({ message: 'Error creating ICU bed', error: error.message });
    }
});

/**
 * @route PUT /api/icu/beds/:id
 * @description Update an ICU bed
 */
router.put('/beds/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { bedNumber, bedType, status, equipmentList, isActive } = req.body;

        const updates = [];
        const values = [];

        if (bedNumber !== undefined) {
            updates.push('bedNumber = ?');
            values.push(bedNumber);
        }
        if (bedType !== undefined) {
            updates.push('bedType = ?');
            values.push(bedType);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (equipmentList !== undefined) {
            updates.push('equipmentList = ?');
            values.push(equipmentList || null);
        }
        if (isActive !== undefined) {
            updates.push('isActive = ?');
            values.push(isActive);
        }

        if (updates.length > 0) {
            updates.push('updatedAt = NOW()');
            values.push(id);
            await pool.execute(
                `UPDATE icu_beds SET ${updates.join(', ')} WHERE icuBedId = ?`,
                values
            );
        }

        const [updated] = await pool.execute(
            'SELECT * FROM icu_beds WHERE icuBedId = ?',
            [id]
        );

        if (updated.length === 0) {
            return res.status(404).json({ message: 'ICU bed not found' });
        }

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating ICU bed:', error);
        res.status(500).json({ message: 'Error updating ICU bed', error: error.message });
    }
});

/**
 * @route DELETE /api/icu/beds/:id
 * @description Delete (deactivate) an ICU bed
 */
router.delete('/beds/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if bed is occupied
        const [check] = await pool.execute(
            'SELECT COUNT(*) as count FROM icu_admissions WHERE icuBedId = ? AND status IN (?, ?, ?, ?)',
            [id, 'critical', 'serious', 'stable', 'improving']
        );

        if (check[0].count > 0) {
            return res.status(400).json({ message: 'Cannot delete bed that is currently occupied' });
        }

        // Deactivate instead of deleting
        await pool.execute(
            'UPDATE icu_beds SET isActive = 0, updatedAt = NOW() WHERE icuBedId = ?',
            [id]
        );

        res.status(200).json({ message: 'ICU bed deactivated successfully' });
    } catch (error) {
        console.error('Error deleting ICU bed:', error);
        res.status(500).json({ message: 'Error deleting ICU bed', error: error.message });
    }
});

/**
 * @route GET /api/icu/equipment
 * @description Get all ICU equipment
 */
router.get('/equipment', async (req, res) => {
    try {
        const { status, page = 1, limit = 100 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT e.*,
                   ia.icuAdmissionId,
                   a.admissionNumber,
                   pt.firstName, pt.lastName, pt.patientNumber
            FROM icu_equipment e
            LEFT JOIN icu_admissions ia ON e.assignedToAdmissionId = ia.icuAdmissionId
            LEFT JOIN admissions a ON ia.admissionId = a.admissionId
            LEFT JOIN patients pt ON a.patientId = pt.patientId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND e.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY e.equipmentName LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [equipment] = await pool.execute(query, params);

        res.status(200).json(equipment);
    } catch (error) {
        console.error('Error fetching ICU equipment:', error);
        res.status(500).json({ message: 'Error fetching ICU equipment', error: error.message });
    }
});

/**
 * @route GET /api/icu/equipment/:id
 * @description Get a single ICU equipment
 */
router.get('/equipment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [equipment] = await pool.execute(
            `SELECT e.*,
                    ia.icuAdmissionId,
                    a.admissionNumber,
                    pt.firstName, pt.lastName, pt.patientNumber
             FROM icu_equipment e
             LEFT JOIN icu_admissions ia ON e.assignedToAdmissionId = ia.icuAdmissionId
             LEFT JOIN admissions a ON ia.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             WHERE e.equipmentId = ?`,
            [id]
        );

        if (equipment.length === 0) {
            return res.status(404).json({ message: 'ICU equipment not found' });
        }

        res.status(200).json(equipment[0]);
    } catch (error) {
        console.error('Error fetching ICU equipment:', error);
        res.status(500).json({ message: 'Error fetching ICU equipment', error: error.message });
    }
});

/**
 * @route POST /api/icu/equipment
 * @description Create a new ICU equipment
 */
router.post('/equipment', async (req, res) => {
    try {
        const { equipmentName, equipmentType, serialNumber, status, lastMaintenanceDate, nextMaintenanceDate, notes } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO icu_equipment (equipmentName, equipmentType, serialNumber, status, lastMaintenanceDate, nextMaintenanceDate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                equipmentName,
                equipmentType || null,
                serialNumber || null,
                status || 'available',
                lastMaintenanceDate || null,
                nextMaintenanceDate || null,
                notes || null
            ]
        );

        const [newEquipment] = await pool.execute(
            'SELECT * FROM icu_equipment WHERE equipmentId = ?',
            [result.insertId]
        );

        res.status(201).json(newEquipment[0]);
    } catch (error) {
        console.error('Error creating ICU equipment:', error);
        res.status(500).json({ message: 'Error creating ICU equipment', error: error.message });
    }
});

/**
 * @route PUT /api/icu/equipment/:id
 * @description Update an ICU equipment
 */
router.put('/equipment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { equipmentName, equipmentType, serialNumber, status, assignedToAdmissionId, lastMaintenanceDate, nextMaintenanceDate, notes } = req.body;

        const updates = [];
        const values = [];

        if (equipmentName !== undefined) {
            updates.push('equipmentName = ?');
            values.push(equipmentName);
        }
        if (equipmentType !== undefined) {
            updates.push('equipmentType = ?');
            values.push(equipmentType || null);
        }
        if (serialNumber !== undefined) {
            updates.push('serialNumber = ?');
            values.push(serialNumber || null);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (assignedToAdmissionId !== undefined) {
            updates.push('assignedToAdmissionId = ?');
            values.push(assignedToAdmissionId || null);
        }
        if (lastMaintenanceDate !== undefined) {
            updates.push('lastMaintenanceDate = ?');
            values.push(lastMaintenanceDate || null);
        }
        if (nextMaintenanceDate !== undefined) {
            updates.push('nextMaintenanceDate = ?');
            values.push(nextMaintenanceDate || null);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes || null);
        }

        if (updates.length > 0) {
            updates.push('updatedAt = NOW()');
            values.push(id);
            await pool.execute(
                `UPDATE icu_equipment SET ${updates.join(', ')} WHERE equipmentId = ?`,
                values
            );
        }

        const [updated] = await pool.execute(
            'SELECT * FROM icu_equipment WHERE equipmentId = ?',
            [id]
        );

        if (updated.length === 0) {
            return res.status(404).json({ message: 'ICU equipment not found' });
        }

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating ICU equipment:', error);
        res.status(500).json({ message: 'Error updating ICU equipment', error: error.message });
    }
});

/**
 * @route DELETE /api/icu/equipment/:id
 * @description Delete (retire) an ICU equipment
 */
router.delete('/equipment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if equipment is in use
        const [check] = await pool.execute(
            'SELECT COUNT(*) as count FROM icu_equipment WHERE equipmentId = ? AND status = ?',
            [id, 'in_use']
        );

        if (check[0].count > 0) {
            return res.status(400).json({ message: 'Cannot delete equipment that is currently in use' });
        }

        // Mark as retired instead of deleting
        await pool.execute(
            'UPDATE icu_equipment SET status = ?, updatedAt = NOW() WHERE equipmentId = ?',
            ['retired', id]
        );

        res.status(200).json({ message: 'ICU equipment retired successfully' });
    } catch (error) {
        console.error('Error deleting ICU equipment:', error);
        res.status(500).json({ message: 'Error deleting ICU equipment', error: error.message });
    }
});

/**
 * @route GET /api/icu/admissions/:id/overview
 * @description Get comprehensive overview of an ICU admission (monitoring, reviews, equipment, etc.)
 */
router.get('/admissions/:id/overview', async (req, res) => {
    try {
        const { id } = req.params;

        // Get ICU admission details
        const [icuAdmissions] = await pool.execute(
            `SELECT ia.*,
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                    a.admittingDoctorId, a.patientId, a.admissionDiagnosis, a.admissionReason,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName,
                    ib.bedNumber, ib.bedType, ib.equipmentList, ib.icuBedId
             FROM icu_admissions ia
             LEFT JOIN admissions a ON ia.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN icu_beds ib ON ia.icuBedId = ib.icuBedId
             WHERE ia.icuAdmissionId = ?`,
            [id]
        );

        if (icuAdmissions.length === 0) {
            return res.status(404).json({ message: 'ICU admission not found' });
        }

        const icuAdmission = icuAdmissions[0];

        // Get ICU monitoring records
        const [monitoring] = await pool.execute(
            `SELECT m.*,
                    u.firstName as recordedByFirstName, u.lastName as recordedByLastName
             FROM icu_monitoring m
             LEFT JOIN users u ON m.recordedBy = u.userId
             WHERE m.icuAdmissionId = ?
             ORDER BY m.monitoringDateTime DESC`,
            [id]
        );

        // Get equipment assigned to this admission
        const [equipment] = await pool.execute(
            `SELECT e.*
             FROM icu_equipment e
             WHERE e.assignedToAdmissionId = ?
             ORDER BY e.equipmentName`,
            [id]
        );

        // Get procedures linked to the general admission
        const [procedures] = await pool.execute(
            `SELECT pp.*,
                    p.procedureName, p.procedureCode,
                    u.firstName as performedByFirstName, u.lastName as performedByLastName
             FROM patient_procedures pp
             LEFT JOIN procedures p ON pp.procedureId = p.procedureId
             LEFT JOIN users u ON pp.performedBy = u.userId
             WHERE pp.admissionId = ?
             ORDER BY pp.procedureDate DESC`,
            [icuAdmission.admissionId]
        );

        // Get lab orders linked to the general admission with test names
        const [labOrdersRaw] = await pool.execute(
            `SELECT lo.*,
                    u.firstName as orderedByFirstName, u.lastName as orderedByLastName
             FROM lab_test_orders lo
             LEFT JOIN users u ON lo.orderedBy = u.userId
             WHERE lo.admissionId = ?
             ORDER BY lo.orderDate DESC`,
            [icuAdmission.admissionId]
        );

        // Get lab order items with test names for each order
        const labOrders = await Promise.all(labOrdersRaw.map(async (order) => {
            const [items] = await pool.execute(
                `SELECT loi.*, ltt.testName, ltt.testCode
                 FROM lab_test_order_items loi
                 LEFT JOIN lab_test_types ltt ON loi.testTypeId = ltt.testTypeId
                 WHERE loi.orderId = ?
                 ORDER BY loi.itemId`,
                [order.orderId]
            );
            // For display, use the first test name or join all if multiple
            const testNames = items.map((item) => item.testName).filter(Boolean);
            return {
                ...order,
                items: items || [],
                testName: testNames.length > 0 ? testNames.join(', ') : null
            };
        }));

        // Get prescriptions linked to the general admission with medication items
        const [prescriptionsRaw] = await pool.execute(
            `SELECT p.*,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM prescriptions p
             LEFT JOIN users u ON p.doctorId = u.userId
             WHERE p.admissionId = ?
             ORDER BY p.prescriptionDate DESC`,
            [icuAdmission.admissionId]
        );

        // Get prescription items with medication names for each prescription
        const prescriptions = await Promise.all(prescriptionsRaw.map(async (prescription) => {
            const [items] = await pool.execute(
                `SELECT pi.*, m.name as medicationNameFromCatalog
                 FROM prescription_items pi
                 LEFT JOIN medications m ON pi.medicationId = m.medicationId
                 WHERE pi.prescriptionId = ?
                 ORDER BY pi.itemId`,
                [prescription.prescriptionId]
            );
            // For display, use medication names from items or catalog
            const medicationNames = items.map((item) =>
                item.medicationNameFromCatalog || item.medicationName
            ).filter(Boolean);
            return {
                ...prescription,
                items: items || [],
                medicationNames: medicationNames.length > 0 ? medicationNames.join(', ') : null
            };
        }));

        // Get orders/consumables (invoices with consumables linked to this admission)
        const [ordersInvoices] = await pool.execute(
            `SELECT i.*,
                    p.firstName as patientFirstName, p.lastName as patientLastName
             FROM invoices i
             LEFT JOIN patients p ON i.patientId = p.patientId
             WHERE i.patientId = ?
             AND (i.notes LIKE '%Consumables ordered%' OR i.notes LIKE '%consumables ordered%' OR i.notes LIKE '%ICU%' OR i.notes LIKE '%icu%')
             AND DATE(i.invoiceDate) >= DATE(?)
             ORDER BY i.invoiceDate DESC`,
            [icuAdmission.patientId, icuAdmission.admissionDate || new Date().toISOString().split('T')[0]]
        );

        // Get invoice items for orders
        const ordersWithItems = await Promise.all(ordersInvoices.map(async (invoice) => {
            const [items] = await pool.execute(
                `SELECT ii.*, sc.name as chargeName, sc.chargeCode
                 FROM invoice_items ii
                 LEFT JOIN service_charges sc ON ii.chargeId = sc.chargeId
                 WHERE ii.invoiceId = ?
                 ORDER BY ii.itemId`,
                [invoice.invoiceId]
            );
            return {
                ...invoice,
                items: items || []
            };
        }));

        res.status(200).json({
            icuAdmission,
            monitoring,
            equipment,
            procedures,
            labOrders,
            prescriptions,
            orders: ordersWithItems,
        });
    } catch (error) {
        console.error('Error fetching ICU admission overview:', error);
        res.status(500).json({ message: 'Error fetching ICU admission overview', error: error.message });
    }
});

/**
 * @route GET /api/icu/admissions/:id/monitoring
 * @description Get ICU monitoring records for an admission
 */
router.get('/admissions/:id/monitoring', async (req, res) => {
    try {
        const { id } = req.params;
        const [monitoring] = await pool.execute(
            `SELECT m.*,
                    u.firstName as recordedByFirstName, u.lastName as recordedByLastName
             FROM icu_monitoring m
             LEFT JOIN users u ON m.recordedBy = u.userId
             WHERE m.icuAdmissionId = ?
             ORDER BY m.monitoringDateTime DESC`,
            [id]
        );
        res.status(200).json(monitoring);
    } catch (error) {
        console.error('Error fetching ICU monitoring:', error);
        res.status(500).json({ message: 'Error fetching ICU monitoring', error: error.message });
    }
});

/**
 * @route POST /api/icu/admissions/:id/monitoring
 * @description Create a new ICU monitoring record
 */
router.post('/admissions/:id/monitoring', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            monitoringDateTime, heartRate, systolicBP, diastolicBP, meanArterialPressure,
            respiratoryRate, oxygenSaturation, temperature, glasgowComaScale,
            centralVenousPressure, urineOutput, ventilatorSettings, medicationInfusions, notes, recordedBy
        } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO icu_monitoring
             (icuAdmissionId, monitoringDateTime, heartRate, systolicBP, diastolicBP, meanArterialPressure,
              respiratoryRate, oxygenSaturation, temperature, glasgowComaScale, centralVenousPressure,
              urineOutput, ventilatorSettings, medicationInfusions, notes, recordedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, monitoringDateTime || new Date(), heartRate || null, systolicBP || null, diastolicBP || null,
             meanArterialPressure || null, respiratoryRate || null, oxygenSaturation || null, temperature || null,
             glasgowComaScale || null, centralVenousPressure || null, urineOutput || null,
             ventilatorSettings || null, medicationInfusions || null, notes || null, recordedBy || null]
        );

        const [newMonitoring] = await pool.execute(
            `SELECT m.*,
                    u.firstName as recordedByFirstName, u.lastName as recordedByLastName
             FROM icu_monitoring m
             LEFT JOIN users u ON m.recordedBy = u.userId
             WHERE m.monitoringId = ?`,
            [result.insertId]
        );

        res.status(201).json(newMonitoring[0]);
    } catch (error) {
        console.error('Error creating ICU monitoring:', error);
        res.status(500).json({ message: 'Error creating ICU monitoring', error: error.message });
    }
});

/**
 * @route PUT /api/icu/admissions/:id/monitoring/:monitoringId
 * @description Update an ICU monitoring record
 */
router.put('/admissions/:id/monitoring/:monitoringId', async (req, res) => {
    try {
        const { id, monitoringId } = req.params;
        const updates = [];
        const values = [];

        const fields = ['monitoringDateTime', 'heartRate', 'systolicBP', 'diastolicBP', 'meanArterialPressure',
                       'respiratoryRate', 'oxygenSaturation', 'temperature', 'glasgowComaScale',
                       'centralVenousPressure', 'urineOutput', 'ventilatorSettings', 'medicationInfusions', 'notes'];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field] || null);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(monitoringId, id);

        await pool.execute(
            `UPDATE icu_monitoring SET ${updates.join(', ')} WHERE monitoringId = ? AND icuAdmissionId = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT m.*,
                    u.firstName as recordedByFirstName, u.lastName as recordedByLastName
             FROM icu_monitoring m
             LEFT JOIN users u ON m.recordedBy = u.userId
             WHERE m.monitoringId = ?`,
            [monitoringId]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating ICU monitoring:', error);
        res.status(500).json({ message: 'Error updating ICU monitoring', error: error.message });
    }
});

/**
 * @route DELETE /api/icu/admissions/:id/monitoring/:monitoringId
 * @description Delete an ICU monitoring record
 */
router.delete('/admissions/:id/monitoring/:monitoringId', async (req, res) => {
    try {
        const { id, monitoringId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM icu_monitoring WHERE monitoringId = ? AND icuAdmissionId = ?',
            [monitoringId, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Monitoring record not found' });
        }

        res.status(200).json({ message: 'Monitoring record deleted successfully' });
    } catch (error) {
        console.error('Error deleting ICU monitoring:', error);
        res.status(500).json({ message: 'Error deleting ICU monitoring', error: error.message });
    }
});

module.exports = router;


