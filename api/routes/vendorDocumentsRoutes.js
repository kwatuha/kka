// Vendor Documents routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/vendor-documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `vendor-${req.params.vendorId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG are allowed.'));
        }
    }
});

/**
 * @route GET /api/procurement/vendors/:vendorId/documents
 * @description Get all documents for a vendor
 */
router.get('/:vendorId/documents', async (req, res) => {
    try {
        // Check if table exists first
        const [tables] = await pool.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vendor_documents'",
            [process.env.DB_NAME || 'kiplombe_hmis']
        );
        
        if (tables.length === 0) {
            return res.status(200).json([]);
        }
        
        const [rows] = await pool.execute(
            `SELECT 
                d.*,
                u.firstName as uploadedByFirstName,
                u.lastName as uploadedByLastName
            FROM vendor_documents d
            LEFT JOIN users u ON d.uploadedBy = u.userId
            WHERE d.vendorId = ?
            ORDER BY d.uploadDate DESC`,
            [req.params.vendorId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendor documents:', error);
        res.status(200).json([]);
    }
});

/**
 * @route POST /api/procurement/vendors/:vendorId/documents
 * @description Upload a new vendor document
 */
router.post('/:vendorId/documents', upload.single('file'), async (req, res) => {
    try {
        const { documentName, documentType, uploadDate, expiryDate, notes, uploadedBy } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'File is required' });
        }

        if (!documentName) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Document name is required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO vendor_documents (
                vendorId, documentName, documentType, filePath, fileSize, mimeType,
                uploadDate, expiryDate, uploadedBy, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.vendorId,
                documentName,
                documentType || null,
                req.file.path,
                req.file.size,
                req.file.mimetype,
                uploadDate || new Date().toISOString().split('T')[0],
                expiryDate || null,
                uploadedBy || null,
                notes || null
            ]
        );

        const [newDocument] = await pool.execute(
            'SELECT * FROM vendor_documents WHERE documentId = ?',
            [result.insertId]
        );

        res.status(201).json(newDocument[0]);
    } catch (error) {
        // Delete uploaded file if database insert fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error creating vendor document:', error);
        res.status(500).json({ message: 'Error creating vendor document', error: error.message });
    }
});

/**
 * @route PUT /api/procurement/vendors/:vendorId/documents/:id
 * @description Update a vendor document
 */
router.put('/:vendorId/documents/:id', async (req, res) => {
    try {
        const { documentName, documentType, expiryDate, notes } = req.body;

        const [existing] = await pool.execute(
            'SELECT * FROM vendor_documents WHERE documentId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        await pool.execute(
            `UPDATE vendor_documents SET
                documentName = ?,
                documentType = ?,
                expiryDate = ?,
                notes = ?
            WHERE documentId = ? AND vendorId = ?`,
            [
                documentName !== undefined ? documentName : existing[0].documentName,
                documentType !== undefined ? documentType : existing[0].documentType,
                expiryDate !== undefined ? expiryDate : existing[0].expiryDate,
                notes !== undefined ? notes : existing[0].notes,
                req.params.id,
                req.params.vendorId
            ]
        );

        const [updatedDocument] = await pool.execute(
            'SELECT * FROM vendor_documents WHERE documentId = ?',
            [req.params.id]
        );

        res.status(200).json(updatedDocument[0]);
    } catch (error) {
        console.error('Error updating vendor document:', error);
        res.status(500).json({ message: 'Error updating vendor document', error: error.message });
    }
});

/**
 * @route DELETE /api/procurement/vendors/:vendorId/documents/:id
 * @description Delete a vendor document
 */
router.delete('/:vendorId/documents/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT * FROM vendor_documents WHERE documentId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Delete file from filesystem
        if (existing[0].filePath && fs.existsSync(existing[0].filePath)) {
            fs.unlinkSync(existing[0].filePath);
        }

        await pool.execute(
            'DELETE FROM vendor_documents WHERE documentId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor document:', error);
        res.status(500).json({ message: 'Error deleting vendor document', error: error.message });
    }
});

/**
 * @route GET /api/procurement/vendors/:vendorId/documents/:id/download
 * @description Download a vendor document
 */
router.get('/:vendorId/documents/:id/download', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM vendor_documents WHERE documentId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = rows[0];
        if (!document.filePath || !fs.existsSync(document.filePath)) {
            return res.status(404).json({ message: 'Document file not found' });
        }

        res.download(document.filePath, document.documentName);
    } catch (error) {
        console.error('Error downloading vendor document:', error);
        res.status(500).json({ message: 'Error downloading vendor document', error: error.message });
    }
});

module.exports = router;

