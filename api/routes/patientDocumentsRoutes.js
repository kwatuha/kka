// Patient Documents routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PATIENT_DOC_UPLOAD_DIR = path.join(__dirname, '../uploads/patient-documents');
try {
    if (!fs.existsSync(PATIENT_DOC_UPLOAD_DIR)) {
        fs.mkdirSync(PATIENT_DOC_UPLOAD_DIR, { recursive: true, mode: 0o775 });
    }
} catch (error) {
    console.error('Error creating patient-documents upload directory:', error);
}

/** Avoid information_schema round-trip on every list request. */
let patientDocumentsTableReady = null;

async function ensurePatientDocumentsTable(pool) {
    if (patientDocumentsTableReady === true) return true;
    if (patientDocumentsTableReady === false) return false;
    try {
        await pool.execute(
            `SELECT documentId FROM patient_documents LIMIT 1`
        );
        patientDocumentsTableReady = true;
        return true;
    } catch (err) {
        if (err?.code === 'ER_NO_SUCH_TABLE') {
            patientDocumentsTableReady = false;
            return false;
        }
        throw err;
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, PATIENT_DOC_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `patient-${req.params.patientId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedExt = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|webp|txt|csv|dicom)$/i;
        const allowedMime = /pdf|word|excel|spreadsheet|image\/|text\/|dicom|octet-stream/i;
        const extOk = allowedExt.test(path.extname(file.originalname || ''));
        const mimeOk = allowedMime.test(file.mimetype || '');
        if (extOk || mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: PDF, Office docs, images, text, DICOM.'));
        }
    }
});

/**
 * @route GET /api/patients/:patientId/documents
 * @description Get all documents for a patient
 */
router.get('/:patientId/documents', async (req, res) => {
    try {
        const tableOk = await ensurePatientDocumentsTable(pool);
        if (!tableOk) {
            return res.status(200).json([]);
        }

        const [rows] = await pool.execute(
            `SELECT
                d.*,
                u.firstName as uploadedByFirstName,
                u.lastName as uploadedByLastName
            FROM patient_documents d
            LEFT JOIN users u ON d.uploadedBy = u.userId
            WHERE d.patientId = ?
            ORDER BY d.uploadDate DESC`,
            [req.params.patientId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching patient documents:', error);
        res.status(200).json([]);
    }
});

/**
 * @route POST /api/patients/:patientId/documents
 * @description Upload a new patient document
 */
router.post('/:patientId/documents', upload.single('file'), async (req, res) => {
    try {
        const { documentName, documentType, category, uploadDate, notes, uploadedBy } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'File is required' });
        }

        if (!documentName) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Document name is required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO patient_documents (
                patientId, documentName, documentType, category, filePath, fileSize, mimeType,
                uploadDate, uploadedBy, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.patientId,
                documentName,
                documentType || null,
                category || documentType || null,
                req.file.path,
                req.file.size,
                req.file.mimetype,
                uploadDate || new Date().toISOString().split('T')[0],
                uploadedBy || null,
                notes || null
            ]
        );

        const [newDocument] = await pool.execute(
            `SELECT
                d.*,
                u.firstName as uploadedByFirstName,
                u.lastName as uploadedByLastName
            FROM patient_documents d
            LEFT JOIN users u ON d.uploadedBy = u.userId
            WHERE d.documentId = ?`,
            [result.insertId]
        );

        res.status(201).json(newDocument[0]);
    } catch (error) {
        // Delete uploaded file if database insert fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error creating patient document:', error);
        res.status(500).json({ message: 'Error creating patient document', error: error.message });
    }
});

/**
 * @route PUT /api/patients/:patientId/documents/:id
 * @description Update a patient document (metadata only)
 */
router.put('/:patientId/documents/:id', async (req, res) => {
    try {
        const { patientId, id } = req.params;
        const { documentName, documentType, category, notes } = req.body;

        const updates = [];
        const values = [];

        if (documentName !== undefined) { updates.push('documentName = ?'); values.push(documentName); }
        if (documentType !== undefined) { updates.push('documentType = ?'); values.push(documentType); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id, patientId);

        await pool.execute(
            `UPDATE patient_documents SET ${updates.join(', ')}, updatedAt = NOW()
             WHERE documentId = ? AND patientId = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT
                d.*,
                u.firstName as uploadedByFirstName,
                u.lastName as uploadedByLastName
            FROM patient_documents d
            LEFT JOIN users u ON d.uploadedBy = u.userId
            WHERE d.documentId = ? AND d.patientId = ?`,
            [id, patientId]
        );

        if (updated.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating patient document:', error);
        res.status(500).json({ message: 'Error updating patient document', error: error.message });
    }
});

/**
 * @route DELETE /api/patients/:patientId/documents/:id
 * @description Delete a patient document
 */
router.delete('/:patientId/documents/:id', async (req, res) => {
    try {
        const { patientId, id } = req.params;

        // Get document to delete file
        const [docRows] = await pool.execute(
            'SELECT filePath FROM patient_documents WHERE documentId = ? AND patientId = ?',
            [id, patientId]
        );

        if (docRows.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = docRows[0];

        // Delete from database
        const [result] = await pool.execute(
            'DELETE FROM patient_documents WHERE documentId = ? AND patientId = ?',
            [id, patientId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Delete file from filesystem
        if (document.filePath && fs.existsSync(document.filePath)) {
            try {
                fs.unlinkSync(document.filePath);
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
                // Continue even if file deletion fails
            }
        }

        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting patient document:', error);
        res.status(500).json({ message: 'Error deleting patient document', error: error.message });
    }
});

/**
 * @route GET /api/patients/:patientId/documents/:id/download
 * @description Download a patient document
 */
router.get('/:patientId/documents/:id/download', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM patient_documents WHERE documentId = ? AND patientId = ?',
            [req.params.id, req.params.patientId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = rows[0];
        if (!document.filePath || !fs.existsSync(document.filePath)) {
            return res.status(404).json({ message: 'Document file not found' });
        }

        const stat = fs.statSync(document.filePath);
        const etag = `"pd-${document.documentId}-${stat.size}-${Math.floor(stat.mtimeMs)}"`;
        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();
        }

        const inline = String(req.query.inline || '') === '1';
        const safeName = String(document.documentName || 'document').replace(/"/g, '');
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.setHeader(
            'Content-Type',
            document.mimeType || 'application/octet-stream'
        );
        res.setHeader(
            'Content-Disposition',
            inline
                ? `inline; filename="${encodeURIComponent(safeName)}"`
                : `attachment; filename="${encodeURIComponent(safeName)}"`
        );
        res.setHeader('Content-Length', stat.size);

        const stream = fs.createReadStream(document.filePath);
        stream.on('error', (err) => {
            console.error('Error streaming patient document:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error streaming document' });
            }
        });
        stream.pipe(res);
    } catch (error) {
        console.error('Error downloading patient document:', error);
        res.status(500).json({ message: 'Error downloading patient document', error: error.message });
    }
});

module.exports = router;
