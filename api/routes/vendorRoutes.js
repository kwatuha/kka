// Vendor routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/procurement/vendors
 * @description Get all vendors
 */
router.get('/', async (req, res) => {
    try {
        const { search, status, category, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                v.*,
                COUNT(DISTINCT po.purchaseOrderId) as totalOrders,
                MAX(po.orderDate) as lastOrderDate,
                COALESCE(SUM(po.totalAmount), 0) as totalSpent
            FROM vendors v
            LEFT JOIN purchase_orders po ON v.vendorId = po.vendorId
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (
                v.vendorName LIKE ? OR 
                v.vendorCode LIKE ? OR
                v.contactPerson LIKE ? OR
                v.email LIKE ? OR
                v.phone LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (status) {
            query += ` AND v.status = ?`;
            params.push(status);
        }

        if (category) {
            query += ` AND v.category = ?`;
            params.push(category);
        }

        query += ` GROUP BY v.vendorId ORDER BY v.vendorName LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Error fetching vendors', error: error.message });
    }
});

/**
 * @route GET /api/procurement/vendors/performance
 * @description Get performance metrics for all vendors (calculated from ratings)
 * NOTE: This route must be defined BEFORE /:id to avoid route conflicts
 */
router.get('/performance', async (req, res) => {
    try {
        const query = `
            SELECT 
                v.vendorId,
                v.vendorName,
                v.vendorCode,
                v.rating as overallRating,
                COALESCE(AVG(vr.onTimeDeliveryScore), 0) as avgOnTimeDelivery,
                COALESCE(AVG(vr.qualityScore), 0) as avgQualityScore,
                COALESCE(AVG(vr.responseTimeScore), 0) as avgResponseTime,
                COALESCE(AVG(vr.costScore), 0) as avgCostScore,
                COUNT(vr.ratingId) as totalRatings
            FROM vendors v
            LEFT JOIN vendor_ratings vr ON v.vendorId = vr.vendorId
            WHERE v.status = 'active'
            GROUP BY v.vendorId, v.vendorName, v.vendorCode, v.rating
            ORDER BY v.vendorName
        `;
        
        const [rows] = await pool.execute(query);
        
        // Transform the data to match frontend expectations
        const performanceData = rows.map((row) => ({
            vendorId: row.vendorId,
            name: row.vendorName,
            vendorCode: row.vendorCode,
            onTimeDelivery: Math.round((parseFloat(row.avgOnTimeDelivery) / 5) * 100), // Convert 1-5 scale to percentage
            qualityScore: Math.round((parseFloat(row.avgQualityScore) / 5) * 100),
            responseTime: parseFloat(row.avgResponseTime) || 0,
            costSavings: 0, // Cost savings calculation would require additional business logic
            overallRating: parseFloat(row.overallRating) || 0,
            totalRatings: parseInt(row.totalRatings) || 0
        }));
        
        res.status(200).json(performanceData);
    } catch (error) {
        console.error('Error fetching vendor performance:', error);
        res.status(500).json({ message: 'Error fetching vendor performance', error: error.message });
    }
});

/**
 * @route GET /api/procurement/vendors/:id
 * @description Get a single vendor
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                v.*,
                COUNT(DISTINCT po.purchaseOrderId) as totalOrders,
                MAX(po.orderDate) as lastOrderDate,
                COALESCE(SUM(po.totalAmount), 0) as totalSpent
            FROM vendors v
            LEFT JOIN purchase_orders po ON v.vendorId = po.vendorId
            WHERE v.vendorId = ?
            GROUP BY v.vendorId`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({ message: 'Error fetching vendor', error: error.message });
    }
});

/**
 * @route POST /api/procurement/vendors
 * @description Create a new vendor
 */
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            vendorCode,
            vendorName,
            contactPerson,
            phone,
            email,
            address,
            city,
            country,
            taxId,
            paymentTerms,
            bankName,
            bankAccount,
            website,
            category,
            status,
            rating,
            notes
        } = req.body;

        if (!vendorName) {
            return res.status(400).json({ message: 'Vendor name is required' });
        }

        // Generate vendor code if not provided
        let finalVendorCode = vendorCode;
        if (!finalVendorCode) {
            const [lastVendor] = await connection.execute(
                'SELECT vendorCode FROM vendors ORDER BY vendorId DESC LIMIT 1'
            );
            let codeNum = 1;
            if (lastVendor.length > 0 && lastVendor[0].vendorCode) {
                const match = lastVendor[0].vendorCode.match(/\d+/);
                if (match) {
                    codeNum = parseInt(match[0]) + 1;
                }
            }
            finalVendorCode = `V${String(codeNum).padStart(3, '0')}`;
        }

        const [result] = await connection.execute(
            `INSERT INTO vendors (
                vendorCode, vendorName, contactPerson, phone, email, address, city, country,
                taxId, paymentTerms, bankName, bankAccount, website, category, status, rating, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalVendorCode,
                vendorName,
                contactPerson || null,
                phone || null,
                email || null,
                address || null,
                city || null,
                country || null,
                taxId || null,
                paymentTerms || null,
                bankName || null,
                bankAccount || null,
                website || null,
                category || null,
                status || 'active',
                rating || 0,
                notes || null
            ]
        );

        const [newVendor] = await connection.execute(
            'SELECT * FROM vendors WHERE vendorId = ?',
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newVendor[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating vendor:', error);
        res.status(500).json({ message: 'Error creating vendor', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/procurement/vendors/:id
 * @description Update a vendor
 */
router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            vendorCode,
            vendorName,
            contactPerson,
            phone,
            email,
            address,
            city,
            country,
            taxId,
            paymentTerms,
            bankName,
            bankAccount,
            website,
            category,
            status,
            rating,
            notes
        } = req.body;

        // Check if vendor exists
        const [existing] = await connection.execute(
            'SELECT * FROM vendors WHERE vendorId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Vendor not found' });
        }

        await connection.execute(
            `UPDATE vendors SET
                vendorCode = ?,
                vendorName = ?,
                contactPerson = ?,
                phone = ?,
                email = ?,
                address = ?,
                city = ?,
                country = ?,
                taxId = ?,
                paymentTerms = ?,
                bankName = ?,
                bankAccount = ?,
                website = ?,
                category = ?,
                status = ?,
                rating = ?,
                notes = ?
            WHERE vendorId = ?`,
            [
                vendorCode !== undefined ? vendorCode : existing[0].vendorCode,
                vendorName !== undefined ? vendorName : existing[0].vendorName,
                contactPerson !== undefined ? contactPerson : existing[0].contactPerson,
                phone !== undefined ? phone : existing[0].phone,
                email !== undefined ? email : existing[0].email,
                address !== undefined ? address : existing[0].address,
                city !== undefined ? city : existing[0].city,
                country !== undefined ? country : existing[0].country,
                taxId !== undefined ? taxId : existing[0].taxId,
                paymentTerms !== undefined ? paymentTerms : existing[0].paymentTerms,
                bankName !== undefined ? bankName : existing[0].bankName,
                bankAccount !== undefined ? bankAccount : existing[0].bankAccount,
                website !== undefined ? website : existing[0].website,
                category !== undefined ? category : existing[0].category,
                status !== undefined ? status : existing[0].status,
                rating !== undefined ? rating : existing[0].rating,
                notes !== undefined ? notes : existing[0].notes,
                req.params.id
            ]
        );

        const [updatedVendor] = await connection.execute(
            'SELECT * FROM vendors WHERE vendorId = ?',
            [req.params.id]
        );

        await connection.commit();
        res.status(200).json(updatedVendor[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating vendor:', error);
        res.status(500).json({ message: 'Error updating vendor', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/procurement/vendors/:id
 * @description Soft delete a vendor (set status to inactive)
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if vendor exists
        const [existing] = await pool.execute(
            'SELECT * FROM vendors WHERE vendorId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // Soft delete by setting status to inactive
        await pool.execute(
            'UPDATE vendors SET status = "inactive" WHERE vendorId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ message: 'Error deleting vendor', error: error.message });
    }
});

/**
 * @route GET /api/procurement/vendors/:id/ratings
 * @description Get all ratings for a vendor
 */
router.get('/:id/ratings', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                vr.*,
                u.firstName,
                u.lastName,
                u.department
            FROM vendor_ratings vr
            LEFT JOIN users u ON vr.ratedBy = u.userId
            WHERE vr.vendorId = ?
            ORDER BY vr.ratingDate DESC, vr.createdAt DESC`,
            [req.params.id]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendor ratings:', error);
        res.status(500).json({ message: 'Error fetching vendor ratings', error: error.message });
    }
});

/**
 * @route POST /api/procurement/vendors/:id/ratings
 * @description Create a new rating for a vendor
 */
router.post('/:id/ratings', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const vendorId = req.params.id;
        const {
            qualityRating,
            deliveryRating,
            serviceRating,
            pricingRating,
            communicationRating,
            recommendationLevel,
            feedback,
            ratedBy
        } = req.body;

        // Check if vendor exists
        const [vendor] = await connection.execute(
            'SELECT * FROM vendors WHERE vendorId = ?',
            [vendorId]
        );

        if (vendor.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // Calculate overall rating (average of all scores)
        const overallRating = (
            (qualityRating || 0) +
            (deliveryRating || 0) +
            (serviceRating || 0) +
            (pricingRating || 0) +
            (communicationRating || 0)
        ) / 5;

        // Insert rating
        // Note: Database schema has: onTimeDeliveryScore, qualityScore, responseTimeScore, costScore
        // Form provides: qualityRating, deliveryRating, serviceRating, pricingRating, communicationRating
        // We'll map: quality->qualityScore, delivery->onTimeDeliveryScore, service->responseTimeScore, pricing->costScore
        // Communication rating will be averaged into overallRating
        const [result] = await connection.execute(
            `INSERT INTO vendor_ratings (
                vendorId,
                ratedBy,
                ratingDate,
                onTimeDeliveryScore,
                qualityScore,
                responseTimeScore,
                costScore,
                overallRating,
                comments
            ) VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
            [
                vendorId,
                ratedBy || null,
                deliveryRating || null, // onTimeDeliveryScore
                qualityRating || null, // qualityScore
                serviceRating || null, // responseTimeScore
                pricingRating || null, // costScore
                overallRating,
                feedback || null
            ]
        );

        // Update vendor's overall rating (average of all ratings)
        const [allRatings] = await connection.execute(
            'SELECT overallRating FROM vendor_ratings WHERE vendorId = ?',
            [vendorId]
        );

        if (allRatings.length > 0) {
            const avgRating = allRatings.reduce((sum, r) => sum + parseFloat(r.overallRating || 0), 0) / allRatings.length;
            await connection.execute(
                'UPDATE vendors SET rating = ? WHERE vendorId = ?',
                [avgRating.toFixed(2), vendorId]
            );
        }

        // Get the created rating
        const [newRating] = await connection.execute(
            `SELECT 
                vr.*,
                u.firstName,
                u.lastName,
                u.department
            FROM vendor_ratings vr
            LEFT JOIN users u ON vr.ratedBy = u.userId
            WHERE vr.ratingId = ?`,
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newRating[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating vendor rating:', error);
        res.status(500).json({ message: 'Error creating vendor rating', error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;


