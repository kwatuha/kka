// Patient Family History routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/patients/:patientId/family-history
 * @description Get family history for a patient
 */
router.get('/:patientId/family-history', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const [rows] = await pool.execute(
            'SELECT * FROM patient_family_history WHERE patientId = ? ORDER BY createdAt DESC',
            [patientId]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching family history:', error);
        res.status(500).json({ message: 'Error fetching family history', error: error.message });
    }
});

/**
 * @route POST /api/patients/:patientId/family-history
 * @description Create a new family history entry
 */
router.post('/:patientId/family-history', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { relation, condition, ageAtDiagnosis, status, notes } = req.body;
        const userId = req.user?.id;
        
        if (!relation || !condition) {
            return res.status(400).json({ message: 'Relation and condition are required' });
        }
        
        const [result] = await pool.execute(
            `INSERT INTO patient_family_history (patientId, relation, \`condition\`, ageAtDiagnosis, status, notes, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [patientId, relation, condition, ageAtDiagnosis || null, status || 'Unknown', notes || null, userId || null]
        );
        
        const [newEntry] = await pool.execute(
            'SELECT * FROM patient_family_history WHERE familyHistoryId = ?',
            [result.insertId]
        );
        
        res.status(201).json(newEntry[0]);
    } catch (error) {
        console.error('Error creating family history entry:', error);
        res.status(500).json({ message: 'Error creating family history entry', error: error.message });
    }
});

/**
 * @route PUT /api/patients/:patientId/family-history/:id
 * @description Update a family history entry
 */
router.put('/:patientId/family-history/:id', async (req, res) => {
    try {
        const { patientId, id } = req.params;
        const { relation, condition, ageAtDiagnosis, status, notes } = req.body;
        
        const updates = [];
        const values = [];
        
        if (relation !== undefined) { updates.push('relation = ?'); values.push(relation); }
        if (condition !== undefined) { updates.push('`condition` = ?'); values.push(condition); }
        if (ageAtDiagnosis !== undefined) { updates.push('ageAtDiagnosis = ?'); values.push(ageAtDiagnosis || null); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
        
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        
        values.push(id, patientId);
        
        await pool.execute(
            `UPDATE patient_family_history SET ${updates.join(', ')}, updatedAt = NOW() 
             WHERE familyHistoryId = ? AND patientId = ?`,
            values
        );
        
        const [updated] = await pool.execute(
            'SELECT * FROM patient_family_history WHERE familyHistoryId = ? AND patientId = ?',
            [id, patientId]
        );
        
        if (updated.length === 0) {
            return res.status(404).json({ message: 'Family history entry not found' });
        }
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating family history entry:', error);
        res.status(500).json({ message: 'Error updating family history entry', error: error.message });
    }
});

/**
 * @route DELETE /api/patients/:patientId/family-history/:id
 * @description Delete a family history entry
 */
router.delete('/:patientId/family-history/:id', async (req, res) => {
    try {
        const { patientId, id } = req.params;
        
        const [result] = await pool.execute(
            'DELETE FROM patient_family_history WHERE familyHistoryId = ? AND patientId = ?',
            [id, patientId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Family history entry not found' });
        }
        
        res.status(200).json({ message: 'Family history entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting family history entry:', error);
        res.status(500).json({ message: 'Error deleting family history entry', error: error.message });
    }
});

module.exports = router;

