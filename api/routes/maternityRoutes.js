// Maternity routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/maternity/admissions
 * @description Get all maternity admissions
 */
router.get('/admissions', async (req, res) => {
    try {
        const { status, page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT ma.*, 
                   a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                   pt.patientId, pt.firstName, pt.lastName, pt.patientNumber,
                   u.firstName as doctorFirstName, u.lastName as doctorLastName,
                   w.wardName, w.wardType,
                   b.bedNumber, b.bedType
            FROM maternity_admissions ma
            LEFT JOIN admissions a ON ma.admissionId = a.admissionId
            LEFT JOIN patients pt ON a.patientId = pt.patientId
            LEFT JOIN users u ON a.admittingDoctorId = u.userId
            LEFT JOIN beds b ON a.bedId = b.bedId
            LEFT JOIN wards w ON b.wardId = w.wardId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND ma.status = ?`;
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
        console.error('Error fetching maternity admissions:', error);
        res.status(500).json({ message: 'Error fetching maternity admissions', error: error.message });
    }
});

/**
 * @route GET /api/maternity/admissions/:id
 * @description Get a single maternity admission
 */
router.get('/admissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [admissions] = await pool.execute(
            `SELECT ma.*, 
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                    pt.patientId, pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName,
                    w.wardName, w.wardType, w.wardId,
                    b.bedNumber, b.bedType, b.bedId
             FROM maternity_admissions ma
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN beds b ON a.bedId = b.bedId
             LEFT JOIN wards w ON b.wardId = w.wardId
             WHERE ma.maternityAdmissionId = ?`,
            [id]
        );

        if (admissions.length === 0) {
            return res.status(404).json({ message: 'Maternity admission not found' });
        }

        res.status(200).json(admissions[0]);
    } catch (error) {
        console.error('Error fetching maternity admission:', error);
        res.status(500).json({ message: 'Error fetching maternity admission', error: error.message });
    }
});

/**
 * @route POST /api/maternity/admissions
 * @description Create a new maternity admission
 */
router.post('/admissions', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            patientId, bedId, admissionDate, admittingDoctorId, 
            gestationWeeks, expectedDeliveryDate, pregnancyNumber, previousPregnancies,
            previousDeliveries, previousComplications, bloodGroup, rhesusFactor, notes 
        } = req.body;

        // Generate admission number
        const [count] = await connection.execute('SELECT COUNT(*) as count FROM admissions');
        const admissionNumber = `MAT-${String(count[0].count + 1).padStart(6, '0')}`;

        // Insert general admission first
        const [admissionResult] = await connection.execute(
            `INSERT INTO admissions (admissionNumber, patientId, bedId, admissionDate, admittingDoctorId, admissionDiagnosis, status)
             VALUES (?, ?, ?, ?, ?, ?, 'admitted')`,
            [admissionNumber, patientId, bedId, admissionDate || new Date(), admittingDoctorId, 'Maternity', notes || null]
        );

        const admissionId = admissionResult.insertId;

        // Insert maternity admission
        const [maternityResult] = await connection.execute(
            `INSERT INTO maternity_admissions (
                admissionId, gestationWeeks, expectedDeliveryDate, pregnancyNumber,
                previousPregnancies, previousDeliveries, previousComplications,
                bloodGroup, rhesusFactor, notes, status
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admitted')`,
            [
                admissionId,
                gestationWeeks || null,
                expectedDeliveryDate || null,
                pregnancyNumber || null,
                previousPregnancies || null,
                previousDeliveries || null,
                previousComplications || null,
                bloodGroup || null,
                rhesusFactor || null,
                notes || null
            ]
        );

        const maternityAdmissionId = maternityResult.insertId;

        // Update bed status to occupied
        await connection.execute(
            'UPDATE beds SET status = ? WHERE bedId = ?',
            ['occupied', bedId]
        );

        await connection.commit();

        // Fetch created admission
        const [newAdmission] = await connection.execute(
            `SELECT ma.*, 
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName,
                    w.wardName, w.wardType,
                    b.bedNumber, b.bedType
             FROM maternity_admissions ma
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN beds b ON a.bedId = b.bedId
             LEFT JOIN wards w ON b.wardId = w.wardId
             WHERE ma.maternityAdmissionId = ?`,
            [maternityAdmissionId]
        );

        res.status(201).json(newAdmission[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating maternity admission:', error);
        res.status(500).json({ message: 'Error creating maternity admission', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/maternity/admissions/:id
 * @description Update a maternity admission
 */
router.put('/admissions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { 
            bedId, gestationWeeks, expectedDeliveryDate, pregnancyNumber,
            previousPregnancies, previousDeliveries, previousComplications,
            bloodGroup, rhesusFactor, notes, status 
        } = req.body;

        // Check if admission exists
        const [existing] = await connection.execute(
            `SELECT ma.admissionId, a.bedId, ma.status 
             FROM maternity_admissions ma
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             WHERE ma.maternityAdmissionId = ?`,
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Maternity admission not found' });
        }

        const admissionId = existing[0].admissionId;
        const oldBedId = existing[0].bedId;
        const oldStatus = existing[0].status;

        // Update general admission if bed changed
        if (bedId !== undefined && bedId !== oldBedId) {
            await connection.execute(
                'UPDATE admissions SET bedId = ?, updatedAt = NOW() WHERE admissionId = ?',
                [bedId, admissionId]
            );

            // Free old bed
            await connection.execute(
                'UPDATE beds SET status = ? WHERE bedId = ?',
                ['available', oldBedId]
            );
            // Occupy new bed
            await connection.execute(
                'UPDATE beds SET status = ? WHERE bedId = ?',
                ['occupied', bedId]
            );
        }

        // Update maternity admission
        const updates = [];
        const values = [];

        if (gestationWeeks !== undefined) {
            updates.push('gestationWeeks = ?');
            values.push(gestationWeeks || null);
        }

        if (expectedDeliveryDate !== undefined) {
            updates.push('expectedDeliveryDate = ?');
            values.push(expectedDeliveryDate || null);
        }

        if (pregnancyNumber !== undefined) {
            updates.push('pregnancyNumber = ?');
            values.push(pregnancyNumber || null);
        }

        if (previousPregnancies !== undefined) {
            updates.push('previousPregnancies = ?');
            values.push(previousPregnancies || null);
        }

        if (previousDeliveries !== undefined) {
            updates.push('previousDeliveries = ?');
            values.push(previousDeliveries || null);
        }

        if (previousComplications !== undefined) {
            updates.push('previousComplications = ?');
            values.push(previousComplications || null);
        }

        if (bloodGroup !== undefined) {
            updates.push('bloodGroup = ?');
            values.push(bloodGroup || null);
        }

        if (rhesusFactor !== undefined) {
            updates.push('rhesusFactor = ?');
            values.push(rhesusFactor || null);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes || null);
        }

        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }

        if (updates.length > 0) {
            updates.push('updatedAt = NOW()');
            values.push(id);
            await connection.execute(
                `UPDATE maternity_admissions SET ${updates.join(', ')} WHERE maternityAdmissionId = ?`,
                values
            );
        }

        await connection.commit();

        // Fetch updated admission
        const [updated] = await connection.execute(
            `SELECT ma.*, 
                    a.admissionNumber, a.admissionDate, a.expectedDischargeDate, a.notes as admissionNotes,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName,
                    w.wardName, w.wardType,
                    b.bedNumber, b.bedType
             FROM maternity_admissions ma
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON a.admittingDoctorId = u.userId
             LEFT JOIN beds b ON a.bedId = b.bedId
             LEFT JOIN wards w ON b.wardId = w.wardId
             WHERE ma.maternityAdmissionId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating maternity admission:', error);
        res.status(500).json({ message: 'Error updating maternity admission', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/maternity/admissions/:id
 * @description Delete (cancel) a maternity admission
 */
router.delete('/admissions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get admission details
        const [admission] = await connection.execute(
            `SELECT a.admissionId, a.bedId, ma.status 
             FROM maternity_admissions ma
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             WHERE ma.maternityAdmissionId = ?`,
            [id]
        );

        if (admission.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Maternity admission not found' });
        }

        const admissionId = admission[0].admissionId;
        const bedId = admission[0].bedId;

        // Update admission status to cancelled
        await connection.execute(
            'UPDATE admissions SET status = ?, updatedAt = NOW() WHERE admissionId = ?',
            ['cancelled', admissionId]
        );

        // Update maternity admission status
        await connection.execute(
            'UPDATE maternity_admissions SET status = ?, updatedAt = NOW() WHERE maternityAdmissionId = ?',
            ['discharged', id]
        );

        // Free the bed if admission was active
        if (admission[0].status === 'admitted' || admission[0].status === 'in_labor') {
            await connection.execute(
                'UPDATE beds SET status = ? WHERE bedId = ?',
                ['available', bedId]
            );
        }

        await connection.commit();

        res.status(200).json({ message: 'Maternity admission cancelled successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error cancelling maternity admission:', error);
        res.status(500).json({ message: 'Error cancelling maternity admission', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/maternity/deliveries
 * @description Get all deliveries
 */
router.get('/deliveries', async (req, res) => {
    try {
        const { page = 1, limit = 50, search, deliveryType } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT d.*, 
                   ma.maternityAdmissionId, ma.gestationWeeks,
                   pt.firstName, pt.lastName, pt.patientNumber,
                   u.firstName as doctorFirstName, u.lastName as doctorLastName
            FROM deliveries d
            LEFT JOIN maternity_admissions ma ON d.maternityAdmissionId = ma.maternityAdmissionId
            LEFT JOIN admissions a ON ma.admissionId = a.admissionId
            LEFT JOIN patients pt ON a.patientId = pt.patientId
            LEFT JOIN users u ON d.assistedBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (deliveryType) {
            query += ` AND d.deliveryType = ?`;
            params.push(deliveryType);
        }

        if (search) {
            query += ` AND (pt.firstName LIKE ? OR pt.lastName LIKE ? OR pt.patientNumber LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY d.deliveryDate DESC, d.deliveryTime DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [deliveries] = await pool.execute(query, params);

        // Get newborns for each delivery
        for (const delivery of deliveries) {
            const [newborns] = await pool.execute(
                'SELECT * FROM newborns WHERE deliveryId = ?',
                [delivery.deliveryId]
            );
            delivery.newborns = newborns;
        }

        res.status(200).json(deliveries);
    } catch (error) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({ message: 'Error fetching deliveries', error: error.message });
    }
});

/**
 * @route GET /api/maternity/deliveries/:id
 * @description Get a single delivery
 */
router.get('/deliveries/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [deliveries] = await pool.execute(
            `SELECT d.*, 
                    ma.maternityAdmissionId, ma.gestationWeeks,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM deliveries d
             LEFT JOIN maternity_admissions ma ON d.maternityAdmissionId = ma.maternityAdmissionId
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON d.assistedBy = u.userId
             WHERE d.deliveryId = ?`,
            [id]
        );

        if (deliveries.length === 0) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        const delivery = deliveries[0];

        // Get newborns
        const [newborns] = await pool.execute(
            'SELECT * FROM newborns WHERE deliveryId = ?',
            [id]
        );
        delivery.newborns = newborns;

        res.status(200).json(delivery);
    } catch (error) {
        console.error('Error fetching delivery:', error);
        res.status(500).json({ message: 'Error fetching delivery', error: error.message });
    }
});

/**
 * @route POST /api/maternity/deliveries
 * @description Create a new delivery record
 */
router.post('/deliveries', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            maternityAdmissionId, deliveryDate, deliveryTime, deliveryType,
            deliveryMode, complications, maternalOutcome, assistedBy, notes,
            newborns // Array of newborn objects
        } = req.body;

        // Insert delivery
        const [deliveryResult] = await connection.execute(
            `INSERT INTO deliveries (
                maternityAdmissionId, deliveryDate, deliveryTime, deliveryType,
                deliveryMode, complications, maternalOutcome, assistedBy, notes
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                maternityAdmissionId,
                deliveryDate || new Date(),
                deliveryTime || null,
                deliveryType || 'normal',
                deliveryMode || null,
                complications || null,
                maternalOutcome || 'good',
                assistedBy || null,
                notes || null
            ]
        );

        const deliveryId = deliveryResult.insertId;

        // Update maternity admission status to delivered
        await connection.execute(
            'UPDATE maternity_admissions SET status = ?, updatedAt = NOW() WHERE maternityAdmissionId = ?',
            ['delivered', maternityAdmissionId]
        );

        // Insert newborns if provided
        const insertedNewborns = [];
        if (newborns && Array.isArray(newborns) && newborns.length > 0) {
            // Get mother's patient ID
            const [maternityAdmission] = await connection.execute(
                `SELECT a.patientId 
                 FROM maternity_admissions ma
                 LEFT JOIN admissions a ON ma.admissionId = a.admissionId
                 WHERE ma.maternityAdmissionId = ?`,
                [maternityAdmissionId]
            );

            const motherPatientId = maternityAdmission[0].patientId;

            for (const newborn of newborns) {
                const [newbornResult] = await connection.execute(
                    `INSERT INTO newborns (
                        deliveryId, motherPatientId, gender, birthWeight,
                        birthLength, headCircumference, apgarScore1Min, apgarScore5Min,
                        healthStatus, feedingMethod, birthDefects, notes
                     )
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        deliveryId,
                        motherPatientId,
                        newborn.gender,
                        newborn.birthWeight,
                        newborn.birthLength || null,
                        newborn.headCircumference || null,
                        newborn.apgarScore1Min || null,
                        newborn.apgarScore5Min || null,
                        newborn.healthStatus || 'healthy',
                        newborn.feedingMethod || null,
                        newborn.birthDefects || null,
                        newborn.notes || null
                    ]
                );
                insertedNewborns.push({ ...newborn, newbornId: newbornResult.insertId });
            }
        }

        await connection.commit();

        // Fetch created delivery with newborns
        const [newDelivery] = await connection.execute(
            `SELECT d.*, 
                    ma.maternityAdmissionId, ma.gestationWeeks,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM deliveries d
             LEFT JOIN maternity_admissions ma ON d.maternityAdmissionId = ma.maternityAdmissionId
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON d.assistedBy = u.userId
             WHERE d.deliveryId = ?`,
            [deliveryId]
        );

        const delivery = newDelivery[0];
        delivery.newborns = insertedNewborns;

        res.status(201).json(delivery);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating delivery:', error);
        res.status(500).json({ message: 'Error creating delivery', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/maternity/deliveries/:id
 * @description Update a delivery record
 */
router.put('/deliveries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            deliveryDate, deliveryTime, deliveryType, deliveryMode,
            complications, maternalOutcome, assistedBy, notes
        } = req.body;

        // Check if delivery exists
        const [existing] = await pool.execute(
            'SELECT deliveryId FROM deliveries WHERE deliveryId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (deliveryDate !== undefined) {
            updates.push('deliveryDate = ?');
            values.push(deliveryDate);
        }

        if (deliveryTime !== undefined) {
            updates.push('deliveryTime = ?');
            values.push(deliveryTime || null);
        }

        if (deliveryType !== undefined) {
            updates.push('deliveryType = ?');
            values.push(deliveryType);
        }

        if (deliveryMode !== undefined) {
            updates.push('deliveryMode = ?');
            values.push(deliveryMode || null);
        }

        if (complications !== undefined) {
            updates.push('complications = ?');
            values.push(complications || null);
        }

        if (maternalOutcome !== undefined) {
            updates.push('maternalOutcome = ?');
            values.push(maternalOutcome);
        }

        if (assistedBy !== undefined) {
            updates.push('assistedBy = ?');
            values.push(assistedBy || null);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        updates.push('updatedAt = NOW()');
        values.push(id);

        await pool.execute(
            `UPDATE deliveries SET ${updates.join(', ')} WHERE deliveryId = ?`,
            values
        );

        // Fetch updated delivery
        const [updated] = await pool.execute(
            `SELECT d.*, 
                    ma.maternityAdmissionId, ma.gestationWeeks,
                    pt.firstName, pt.lastName, pt.patientNumber,
                    u.firstName as doctorFirstName, u.lastName as doctorLastName
             FROM deliveries d
             LEFT JOIN maternity_admissions ma ON d.maternityAdmissionId = ma.maternityAdmissionId
             LEFT JOIN admissions a ON ma.admissionId = a.admissionId
             LEFT JOIN patients pt ON a.patientId = pt.patientId
             LEFT JOIN users u ON d.assistedBy = u.userId
             WHERE d.deliveryId = ?`,
            [id]
        );

        const delivery = updated[0];

        // Get newborns
        const [newborns] = await pool.execute(
            'SELECT * FROM newborns WHERE deliveryId = ?',
            [id]
        );
        delivery.newborns = newborns;

        res.status(200).json(delivery);
    } catch (error) {
        console.error('Error updating delivery:', error);
        res.status(500).json({ message: 'Error updating delivery', error: error.message });
    }
});

/**
 * @route DELETE /api/maternity/deliveries/:id
 * @description Delete a delivery record (soft delete - not recommended, but available)
 */
router.delete('/deliveries/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if delivery exists
        const [existing] = await pool.execute(
            'SELECT deliveryId FROM deliveries WHERE deliveryId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Note: In a real system, you might want to prevent deletion of deliveries
        // For now, we'll allow it but warn in the response
        res.status(400).json({ 
            message: 'Delivery records should not be deleted. Consider marking as cancelled or voided instead.' 
        });
    } catch (error) {
        console.error('Error deleting delivery:', error);
        res.status(500).json({ message: 'Error deleting delivery', error: error.message });
    }
});

module.exports = router;

