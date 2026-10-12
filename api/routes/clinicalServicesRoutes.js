// Clinical services routes - Full CRUD operations with soft delete
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/clinical-services
 * @description Get all clinical services (non-voided)
 */
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;

        let query = 'SELECT * FROM clinical_services WHERE voided = 0';
        const params = [];

        if (search) {
            query += ` AND (serviceName LIKE ? OR description LIKE ? OR serviceCode LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }

        query += ` ORDER BY serviceName`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching clinical services:', error);
        res.status(500).json({ message: 'Error fetching clinical services', error: error.message });
    }
});

/**
 * @route GET /api/clinical-services/:id
 * @description Get a single clinical service by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM clinical_services WHERE serviceId = ? AND voided = 0',
            [req.params.id]
        );
        
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Clinical service not found' });
        }
    } catch (error) {
        console.error('Error fetching clinical service:', error);
        res.status(500).json({ message: 'Error fetching clinical service', error: error.message });
    }
});

/**
 * @route POST /api/clinical-services
 * @description Create a new clinical service
 */
router.post('/', async (req, res) => {
    try {
        const serviceData = req.body;
        const userId = req.user?.id;

        // Ensure voided is set to 0 for new records
        const [result] = await pool.execute(
            `INSERT INTO clinical_services (
                serviceCode, serviceName, description, category, 
                cost, department, status, voided, createdBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [
                serviceData.serviceCode,
                serviceData.serviceName,
                serviceData.description || null,
                serviceData.category || null,
                serviceData.cost || 0,
                serviceData.department || null,
                serviceData.status || 'Active',
                userId || serviceData.createdBy || null
            ]
        );

        const [newService] = await pool.execute(
            'SELECT * FROM clinical_services WHERE serviceId = ?',
            [result.insertId]
        );

        res.status(201).json(newService[0]);
    } catch (error) {
        console.error('Error creating clinical service:', error);
        res.status(500).json({ message: 'Error creating clinical service', error: error.message });
    }
});

/**
 * @route PUT /api/clinical-services/:id
 * @description Update a clinical service
 */
router.put('/:id', async (req, res) => {
    try {
        const serviceData = req.body;
        const updates = [];
        const values = [];

        // Ensure voided is not updated through PUT (it should remain 0)
        Object.keys(serviceData).forEach(key => {
            if (serviceData[key] !== undefined && 
                key !== 'serviceId' && 
                key !== 'createdAt' && 
                key !== 'createdBy' &&
                key !== 'voided') {
                updates.push(`${key} = ?`);
                values.push(serviceData[key]);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Ensure voided remains 0 for updates
        updates.push('voided = 0');
        values.push(req.params.id);

        await pool.execute(
            `UPDATE clinical_services SET ${updates.join(', ')}, updatedAt = NOW() 
             WHERE serviceId = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM clinical_services WHERE serviceId = ?',
            [req.params.id]
        );

        if (updated.length > 0) {
            res.status(200).json(updated[0]);
        } else {
            res.status(404).json({ message: 'Clinical service not found' });
        }
    } catch (error) {
        console.error('Error updating clinical service:', error);
        res.status(500).json({ message: 'Error updating clinical service', error: error.message });
    }
});

/**
 * @route DELETE /api/clinical-services/:id
 * @description Soft delete a clinical service (set voided to 1)
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if service exists
        const [existing] = await pool.execute(
            'SELECT * FROM clinical_services WHERE serviceId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Clinical service not found' });
        }

        // Soft delete: set voided to 1
        await pool.execute(
            `UPDATE clinical_services SET voided = 1, updatedAt = NOW() 
             WHERE serviceId = ?`,
            [req.params.id]
        );

        res.status(200).json({ 
            message: 'Clinical service deleted successfully',
            serviceId: req.params.id
        });
    } catch (error) {
        console.error('Error deleting clinical service:', error);
        res.status(500).json({ message: 'Error deleting clinical service', error: error.message });
    }
});

module.exports = router;






