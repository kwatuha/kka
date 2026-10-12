// Patient allergies routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/patients/:patientId/allergies
 * @description Get all allergies for a patient
 */
router.get('/:patientId/allergies', async (req, res) => {
    const { patientId } = req.params;
    try {
        const [rows] = await pool.execute(
            `SELECT pa.*, u.firstName as reportedByFirstName, u.lastName as reportedByLastName
             FROM patient_allergies pa
             LEFT JOIN users u ON pa.reportedBy = u.userId
             WHERE pa.patientId = ? AND pa.status = 'active'
             ORDER BY pa.createdAt DESC`,
            [patientId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching patient allergies:', error);
        res.status(500).json({ message: 'Error fetching patient allergies', error: error.message });
    }
});

/**
 * @route GET /api/patients/:patientId/allergies/:id
 * @description Get a single allergy by ID
 */
router.get('/:patientId/allergies/:id', async (req, res) => {
    const { patientId, id } = req.params;
    try {
        const [rows] = await pool.execute(
            `SELECT pa.*, u.firstName as reportedByFirstName, u.lastName as reportedByLastName
             FROM patient_allergies pa
             LEFT JOIN users u ON pa.reportedBy = u.userId
             WHERE pa.allergyId = ? AND pa.patientId = ? AND pa.status = 'active'`,
            [id, patientId]
        );
        
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Allergy not found' });
        }
    } catch (error) {
        console.error('Error fetching allergy:', error);
        res.status(500).json({ message: 'Error fetching allergy', error: error.message });
    }
});

/**
 * @route POST /api/patients/:patientId/allergies
 * @description Create a new allergy for a patient
 */
router.post('/:patientId/allergies', async (req, res) => {
    const { patientId } = req.params;
    const allergyData = req.body;
    const userId = req.user?.id;

    try {
        const [result] = await pool.execute(
            `INSERT INTO patient_allergies (
                patientId, allergen, allergyType, severity, reaction, 
                firstObserved, lastObserved, status, notes, reportedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                allergyData.allergen,
                allergyData.allergyType || 'drug',
                allergyData.severity || 'moderate',
                allergyData.reaction || null,
                allergyData.firstObserved || null,
                allergyData.lastObserved || null,
                allergyData.status || 'active',
                allergyData.notes || null,
                userId || allergyData.reportedBy || null
            ]
        );

        const [newAllergy] = await pool.execute(
            `SELECT pa.*, u.firstName as reportedByFirstName, u.lastName as reportedByLastName
             FROM patient_allergies pa
             LEFT JOIN users u ON pa.reportedBy = u.userId
             WHERE pa.allergyId = ?`,
            [result.insertId]
        );

        res.status(201).json(newAllergy[0]);
    } catch (error) {
        console.error('Error creating allergy:', error);
        res.status(500).json({ message: 'Error creating allergy', error: error.message });
    }
});

/**
 * @route PUT /api/patients/:patientId/allergies/:id
 * @description Update an allergy
 */
router.put('/:patientId/allergies/:id', async (req, res) => {
    const { patientId, id } = req.params;
    const allergyData = req.body;

    try {
        const updates = [];
        const values = [];

        Object.keys(allergyData).forEach(key => {
            if (allergyData[key] !== undefined && 
                key !== 'allergyId' && 
                key !== 'patientId' && 
                key !== 'createdAt' && 
                key !== 'createdBy') {
                updates.push(`${key} = ?`);
                values.push(allergyData[key]);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id, patientId);

        await pool.execute(
            `UPDATE patient_allergies SET ${updates.join(', ')}, updatedAt = NOW() 
             WHERE allergyId = ? AND patientId = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT pa.*, u.firstName as reportedByFirstName, u.lastName as reportedByLastName
             FROM patient_allergies pa
             LEFT JOIN users u ON pa.reportedBy = u.userId
             WHERE pa.allergyId = ? AND pa.patientId = ?`,
            [id, patientId]
        );

        if (updated.length > 0) {
            res.status(200).json(updated[0]);
        } else {
            res.status(404).json({ message: 'Allergy not found' });
        }
    } catch (error) {
        console.error('Error updating allergy:', error);
        res.status(500).json({ message: 'Error updating allergy', error: error.message });
    }
});

/**
 * @route DELETE /api/patients/:patientId/allergies/:id
 * @description Soft delete an allergy (set status to 'voided')
 */
router.delete('/:patientId/allergies/:id', async (req, res) => {
    const { patientId, id } = req.params;

    try {
        // Check if allergy exists
        const [existing] = await pool.execute(
            'SELECT * FROM patient_allergies WHERE allergyId = ? AND patientId = ?',
            [id, patientId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Allergy not found' });
        }

        // Soft delete: update status to 'resolved' (since there's no voided field)
        // In a production system, you might want to add a voided field
        await pool.execute(
            `UPDATE patient_allergies SET status = 'resolved', updatedAt = NOW() 
             WHERE allergyId = ? AND patientId = ?`,
            [id, patientId]
        );

        res.status(200).json({ 
            message: 'Allergy deleted successfully',
            allergyId: id
        });
    } catch (error) {
        console.error('Error deleting allergy:', error);
        res.status(500).json({ message: 'Error deleting allergy', error: error.message });
    }
});

module.exports = router;

