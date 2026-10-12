// Diagnoses routes - ICD-10 codes and diagnoses catalog
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/diagnoses
 * @description Get all diagnoses with optional search
 */
router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 100 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM diagnoses WHERE isActive = 1';
        const params = [];

        if (search) {
            // Case-insensitive search across multiple fields
            query += ` AND (
                LOWER(diagnosisName) LIKE LOWER(?) OR
                LOWER(icd10Code) LIKE LOWER(?) OR
                LOWER(category) LIKE LOWER(?) OR
                LOWER(description) LIKE LOWER(?)
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY diagnosisName LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching diagnoses:', error);
        res.status(500).json({ message: 'Error fetching diagnoses', error: error.message });
    }
});

/**
 * @route GET /api/diagnoses/:id
 * @description Get a single diagnosis by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM diagnoses WHERE diagnosisId = ? AND isActive = 1',
            [req.params.id]
        );

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Diagnosis not found' });
        }
    } catch (error) {
        console.error('Error fetching diagnosis:', error);
        res.status(500).json({ message: 'Error fetching diagnosis', error: error.message });
    }
});

/**
 * @route POST /api/diagnoses
 * @description Create a new diagnosis
 */
router.post('/', async (req, res) => {
    try {
        const { icd10Code, diagnosisName, category, description } = req.body;

        if (!diagnosisName) {
            return res.status(400).json({ message: 'Diagnosis name is required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO diagnoses (icd10Code, diagnosisName, category, description)
             VALUES (?, ?, ?, ?)`,
            [
                icd10Code || null,
                diagnosisName,
                category || null,
                description || null
            ]
        );

        const [newDiagnosis] = await pool.execute(
            'SELECT * FROM diagnoses WHERE diagnosisId = ?',
            [result.insertId]
        );

        res.status(201).json(newDiagnosis[0]);
    } catch (error) {
        console.error('Error creating diagnosis:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Diagnosis with this ICD-10 code already exists' });
        } else {
            res.status(500).json({ message: 'Error creating diagnosis', error: error.message });
        }
    }
});

/**
 * @route PUT /api/diagnoses/:id
 * @description Update a diagnosis
 */
router.put('/:id', async (req, res) => {
    try {
        const { icd10Code, diagnosisName, category, description, isActive } = req.body;

        const updates = [];
        const values = [];

        if (icd10Code !== undefined) {
            updates.push('icd10Code = ?');
            values.push(icd10Code);
        }
        if (diagnosisName !== undefined) {
            updates.push('diagnosisName = ?');
            values.push(diagnosisName);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (isActive !== undefined) {
            updates.push('isActive = ?');
            values.push(isActive);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(req.params.id);

        await pool.execute(
            `UPDATE diagnoses SET ${updates.join(', ')} WHERE diagnosisId = ?`,
            values
        );

        const [updatedDiagnosis] = await pool.execute(
            'SELECT * FROM diagnoses WHERE diagnosisId = ?',
            [req.params.id]
        );

        if (updatedDiagnosis.length === 0) {
            return res.status(404).json({ message: 'Diagnosis not found' });
        }

        res.status(200).json(updatedDiagnosis[0]);
    } catch (error) {
        console.error('Error updating diagnosis:', error);
        res.status(500).json({ message: 'Error updating diagnosis', error: error.message });
    }
});

/**
 * @route DELETE /api/diagnoses/:id
 * @description Soft delete a diagnosis (set isActive = 0)
 */
router.delete('/:id', async (req, res) => {
    try {
        await pool.execute(
            'UPDATE diagnoses SET isActive = 0 WHERE diagnosisId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Diagnosis deleted successfully' });
    } catch (error) {
        console.error('Error deleting diagnosis:', error);
        res.status(500).json({ message: 'Error deleting diagnosis', error: error.message });
    }
});

module.exports = router;

