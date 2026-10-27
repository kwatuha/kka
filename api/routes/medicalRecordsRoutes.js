// Medical Records routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('../lib/integrationOutbox');
const { shouldAutoPublish, publishEncounter } = require('../lib/fhirMediator');
const { attachMedicalRecordToActiveSession } = require('../lib/shrVisitSessions');
const {
    attachMedicalRecordToActiveShaSession,
    syncNationalClaimDiagnosisFromEncounter,
} = require('../lib/shaEclaimsEncounterLink');
const { evaluateAndPublish: evaluateIdsr } = require('../lib/idsrPublisher');
const { auditFromRequest } = require('../lib/auditLog');

const CLINICAL_AMENDMENT_FIELDS = [
    'diagnosis',
    'treatment',
    'chiefComplaint',
    'physicalExamination',
    'outcome',
    'historyOfPresentIllness',
];

const TB_SCREENING_RESULTS = new Set(['no_symptoms', 'presumed_tb', 'on_treatment']);

const IDSR_CLINICAL_TEXT_FIELDS = ['diagnosis', 'chiefComplaint', 'symptoms', 'notes'];

async function evaluateMedicalRecordIdsr(pool, { patientId, recordId, diagnosis, chiefComplaint, symptoms, notes }) {
    const clinicalText = [diagnosis, chiefComplaint, symptoms, notes].filter(Boolean).join(' | ');
    if (!clinicalText) return;
    let facility = { mflCode: null, branchName: null };
    try {
        const [fac] = await pool.execute(
            `SELECT b.mflCode, b.branchName
             FROM patients p
             LEFT JOIN branches b ON b.branchId = p.registeredBranchId
             WHERE p.patientId = ? LIMIT 1`,
            [patientId]
        );
        facility = fac[0] || facility;
    } catch {
        /* ignore */
    }
    await evaluateIdsr(pool, {
        text: clinicalText,
        patientId: Number(patientId),
        sourceType: 'medical_record',
        sourceId: recordId,
        facilityMflCode: facility.mflCode,
        facilityName: facility.branchName,
        summary: diagnosis || chiefComplaint || 'Clinical encounter',
    });
}

function ynFlag(value) {
    if (value === 'yes' || value === true || value === 1 || value === '1') return 1;
    if (value === 'no' || value === false || value === 0 || value === '0') return 0;
    return null;
}

function readTbScreening(body, { required = false } = {}) {
    const tbScreening = String(body.tbScreening || '').trim();
    if (required && !TB_SCREENING_RESULTS.has(tbScreening)) {
        const error = new Error('TB screening is required for every consultation');
        error.status = 400;
        throw error;
    }
    return {
        tbScreening: TB_SCREENING_RESULTS.has(tbScreening) ? tbScreening : null,
        tbScreenCough: ynFlag(body.tbScreenCough),
        tbScreenFever: ynFlag(body.tbScreenFever),
        tbScreenNightSweats: ynFlag(body.tbScreenNightSweats),
        tbScreenWeightLoss: ynFlag(body.tbScreenWeightLoss),
    };
}

/**
 * @route GET /api/medical-records
 * @description Get all medical records
 */
router.get('/', async (req, res) => {
    try {
        const { search, patientId, doctorId, visitType, department, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                mr.*,
                p.patientNumber,
                p.firstName as patientFirstName,
                p.lastName as patientLastName,
                CONCAT(p.firstName, ' ', p.lastName) as patientName,
                u.firstName as doctorFirstName,
                u.lastName as doctorLastName,
                CONCAT(u.firstName, ' ', u.lastName) as doctorName
            FROM medical_records mr
            LEFT JOIN patients p ON mr.patientId = p.patientId
            LEFT JOIN users u ON mr.doctorId = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (
                p.firstName LIKE ? OR 
                p.lastName LIKE ? OR 
                p.patientNumber LIKE ? OR
                mr.diagnosis LIKE ? OR
                mr.chiefComplaint LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (patientId) {
            query += ` AND mr.patientId = ?`;
            params.push(patientId);
        }

        if (doctorId) {
            query += ` AND mr.doctorId = ?`;
            params.push(doctorId);
        }

        if (visitType) {
            query += ` AND mr.visitType = ?`;
            params.push(visitType);
        }

        if (department) {
            query += ` AND mr.department = ?`;
            params.push(department);
        }

        query += ` ORDER BY mr.visitDate DESC, mr.createdAt DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching medical records:', error);
        res.status(500).json({ message: 'Error fetching medical records', error: error.message });
    }
});

/**
 * @route GET /api/medical-records/:id
 * @description Get a single medical record
 */
router.get('/:id/amendments', async (req, res) => {
    try {
        const recordId = String(req.params.id);
        const [rows] = await pool.execute(
            `SELECT auditId, occurredAt, userId, username, action, summary, beforeJson, afterJson
             FROM system_audit_log
             WHERE resourceType = 'medical_record' AND resourceId = ?
             ORDER BY occurredAt DESC
             LIMIT 50`,
            [recordId]
        );
        res.json({ recordId, amendments: rows });
    } catch (error) {
        console.error('Error loading amendments:', error);
        res.status(500).json({ message: 'Failed to load amendment trail', error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                mr.*,
                p.patientNumber,
                p.firstName as patientFirstName,
                p.lastName as patientLastName,
                CONCAT(p.firstName, ' ', p.lastName) as patientName,
                u.firstName as doctorFirstName,
                u.lastName as doctorLastName,
                CONCAT(u.firstName, ' ', u.lastName) as doctorName
            FROM medical_records mr
            LEFT JOIN patients p ON mr.patientId = p.patientId
            LEFT JOIN users u ON mr.doctorId = u.userId
            WHERE mr.recordId = ?`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Medical record not found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching medical record:', error);
        res.status(500).json({ message: 'Error fetching medical record', error: error.message });
    }
});

/**
 * @route POST /api/medical-records
 * @description Create a new medical record
 */
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            patientId,
            visitDate,
            visitType = 'Outpatient',
            department,
            chiefComplaint,
            symptoms,
            historyOfPresentIllness,
            physicalExamination,
            diagnosis,
            treatment,
            outcome,
            prescription,
            notes,
            doctorId,
            createdBy
        } = req.body;

        if (!patientId || !visitDate) {
            return res.status(400).json({ message: 'Patient ID and visit date are required' });
        }

        const saveAsDraft = req.body.saveAsDraft === true || req.body.saveAsDraft === 'true';
        const tb = readTbScreening(req.body, { required: !saveAsDraft });

        const [result] = await connection.execute(
            `INSERT INTO medical_records (
                patientId, visitDate, visitType, department, chiefComplaint,
                symptoms, historyOfPresentIllness, physicalExamination,
                diagnosis, treatment, outcome, prescription, notes,
                tbScreening, tbScreenCough, tbScreenFever, tbScreenNightSweats, tbScreenWeightLoss,
                doctorId, createdBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                visitDate,
                visitType || null,
                department || null,
                chiefComplaint || null,
                symptoms || null,
                historyOfPresentIllness || null,
                physicalExamination || null,
                diagnosis || null,
                treatment || null,
                outcome || null,
                prescription || null,
                notes || null,
                tb.tbScreening,
                tb.tbScreenCough,
                tb.tbScreenFever,
                tb.tbScreenNightSweats,
                tb.tbScreenWeightLoss,
                doctorId || null,
                createdBy || null
            ]
        );

        const [newRecord] = await connection.execute(
            `SELECT 
                mr.*,
                p.patientNumber,
                p.firstName as patientFirstName,
                p.lastName as patientLastName,
                CONCAT(p.firstName, ' ', p.lastName) as patientName,
                u.firstName as doctorFirstName,
                u.lastName as doctorLastName,
                CONCAT(u.firstName, ' ', u.lastName) as doctorName
            FROM medical_records mr
            LEFT JOIN patients p ON mr.patientId = p.patientId
            LEFT JOIN users u ON mr.doctorId = u.userId
            WHERE mr.recordId = ?`,
            [result.insertId]
        );

        try {
            await enqueueOutboxEvent(connection, {
                eventType: 'encounter.closed',
                aggregateType: 'medical_record',
                aggregateId: result.insertId,
                payload: {
                    recordId: result.insertId,
                    patientId: Number(patientId),
                    visitDate,
                    visitType,
                    diagnosis: diagnosis || null,
                    doctorId: doctorId || null,
                },
            });
        } catch (outboxErr) {
            console.warn('[medical-records] outbox enqueue skipped:', outboxErr.message || outboxErr);
        }

        await connection.commit();

        try {
            await attachMedicalRecordToActiveSession(patientId, result.insertId);
        } catch (linkErr) {
            console.warn('[medical-records] SHR session link skipped:', linkErr.message || linkErr);
        }

        let shaClaimsLink = null;
        try {
            await attachMedicalRecordToActiveShaSession(patientId, result.insertId);
            shaClaimsLink = await syncNationalClaimDiagnosisFromEncounter(pool, {
                patientId: Number(patientId),
                medicalRecordId: result.insertId,
                req,
            });
        } catch (linkErr) {
            console.warn('[medical-records] SHA claims link skipped:', linkErr.message || linkErr);
        }

        let fhirPublish = null;
        try {
            if (await shouldAutoPublish(pool)) {
                fhirPublish = await publishEncounter(pool, result.insertId);
                if (fhirPublish?.skipped && fhirPublish.reason) {
                    console.warn('[medical-records] FHIR publish skipped:', fhirPublish.reason);
                }
            }
        } catch (fhirErr) {
            fhirPublish = { status: 'failed', error: fhirErr.message || String(fhirErr) };
            console.warn('[medical-records] FHIR publish skipped:', fhirErr.message || fhirErr);
        }

        try {
            await evaluateMedicalRecordIdsr(pool, {
                patientId,
                recordId: result.insertId,
                diagnosis,
                chiefComplaint,
                symptoms,
                notes,
            });
        } catch (idsrErr) {
            console.warn('[medical-records] IDSR evaluate skipped:', idsrErr.message || idsrErr);
        }

        res.status(201).json({ ...newRecord[0], fhirPublish, shaClaimsLink });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating medical record:', error);
        res.status(error.status || 500).json({ message: error.message || 'Error creating medical record', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/medical-records/:id
 * @description Update a medical record
 */
router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            patientId,
            visitDate,
            visitType,
            department,
            chiefComplaint,
            symptoms,
            historyOfPresentIllness,
            physicalExamination,
            diagnosis,
            treatment,
            outcome,
            prescription,
            notes,
            doctorId,
            amendmentReason
        } = req.body;

        const encounterInProgress =
            req.body.encounterInProgress === true || req.body.encounterInProgress === 'true';
        const tb = readTbScreening(req.body, { required: req.body.tbScreening !== undefined && !encounterInProgress });

        // Check if record exists
        const [existing] = await connection.execute(
            'SELECT * FROM medical_records WHERE recordId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Medical record not found' });
        }

        const prior = existing[0];
        const clinicalChanged = CLINICAL_AMENDMENT_FIELDS.some((key) => {
            if (req.body[key] === undefined) return false;
            return String(req.body[key] ?? '') !== String(prior[key] ?? '');
        });
        const idsrTextChanged = IDSR_CLINICAL_TEXT_FIELDS.some((key) => {
            if (req.body[key] === undefined) return false;
            return String(req.body[key] ?? '') !== String(prior[key] ?? '');
        });
        const reasonText = String(amendmentReason || '').trim();
        const visitAlreadyCompleted = Boolean(String(prior.outcome || '').trim());
        const sameDayInProgressEncounter =
            encounterInProgress &&
            prior.visitDate &&
            String(prior.visitDate).slice(0, 10) === new Date().toISOString().slice(0, 10) &&
            !visitAlreadyCompleted;
        const exemptFromAmendmentReason = !visitAlreadyCompleted || sameDayInProgressEncounter;

        if (clinicalChanged && !reasonText && !exemptFromAmendmentReason) {
            await connection.rollback();
            return res.status(400).json({
                code: 'AMENDMENT_REASON_REQUIRED',
                message:
                    'This visit was already completed. Enter a brief amendment reason (for the audit log) when changing diagnosis, treatment, or other clinical notes.',
            });
        }

        const userId = req.user?.id || req.user?.userId || null;
        const setAmendment = clinicalChanged && reasonText;

        await connection.execute(
            `UPDATE medical_records SET
                patientId = ?,
                visitDate = ?,
                visitType = ?,
                department = ?,
                chiefComplaint = ?,
                symptoms = ?,
                historyOfPresentIllness = ?,
                physicalExamination = ?,
                diagnosis = ?,
                treatment = ?,
                outcome = ?,
                prescription = ?,
                notes = ?,
                tbScreening = COALESCE(?, tbScreening),
                tbScreenCough = COALESCE(?, tbScreenCough),
                tbScreenFever = COALESCE(?, tbScreenFever),
                tbScreenNightSweats = COALESCE(?, tbScreenNightSweats),
                tbScreenWeightLoss = COALESCE(?, tbScreenWeightLoss),
                doctorId = ?,
                amendmentReason = COALESCE(?, amendmentReason),
                amendedAt = CASE WHEN ? IS NOT NULL THEN NOW() ELSE amendedAt END,
                amendedBy = CASE WHEN ? IS NOT NULL THEN ? ELSE amendedBy END
            WHERE recordId = ?`,
            [
                patientId !== undefined ? patientId : existing[0].patientId,
                visitDate !== undefined ? visitDate : existing[0].visitDate,
                visitType !== undefined ? visitType : existing[0].visitType,
                department !== undefined ? department : existing[0].department,
                chiefComplaint !== undefined ? chiefComplaint : existing[0].chiefComplaint,
                symptoms !== undefined ? symptoms : (existing[0].symptoms || null),
                historyOfPresentIllness !== undefined ? historyOfPresentIllness : (existing[0].historyOfPresentIllness || null),
                physicalExamination !== undefined ? physicalExamination : (existing[0].physicalExamination || null),
                diagnosis !== undefined ? diagnosis : existing[0].diagnosis,
                treatment !== undefined ? treatment : existing[0].treatment,
                outcome !== undefined ? outcome : (existing[0].outcome || null),
                prescription !== undefined ? prescription : existing[0].prescription,
                notes !== undefined ? notes : existing[0].notes,
                tb.tbScreening,
                tb.tbScreenCough,
                tb.tbScreenFever,
                tb.tbScreenNightSweats,
                tb.tbScreenWeightLoss,
                doctorId !== undefined ? doctorId : existing[0].doctorId,
                setAmendment ? reasonText : null,
                setAmendment ? reasonText : null,
                setAmendment ? reasonText : null,
                setAmendment ? userId : null,
                req.params.id
            ]
        );

        if (clinicalChanged) {
            const beforeSnap = {};
            const afterSnap = {};
            for (const key of CLINICAL_AMENDMENT_FIELDS) {
                beforeSnap[key] = prior[key] ?? null;
                afterSnap[key] =
                    req.body[key] !== undefined ? req.body[key] : prior[key] ?? null;
            }
            await auditFromRequest(req, {
                action: 'AMEND',
                resourceType: 'medical_record',
                resourceId: String(req.params.id),
                patientId: Number(prior.patientId),
                summary: reasonText.slice(0, 500),
                before: beforeSnap,
                after: afterSnap,
            });
        }

        const [updatedRecord] = await connection.execute(
            `SELECT 
                mr.*,
                p.patientNumber,
                p.firstName as patientFirstName,
                p.lastName as patientLastName,
                CONCAT(p.firstName, ' ', p.lastName) as patientName,
                u.firstName as doctorFirstName,
                u.lastName as doctorLastName,
                CONCAT(u.firstName, ' ', u.lastName) as doctorName
            FROM medical_records mr
            LEFT JOIN patients p ON mr.patientId = p.patientId
            LEFT JOIN users u ON mr.doctorId = u.userId
            WHERE mr.recordId = ?`,
            [req.params.id]
        );

        await connection.commit();

        let shaClaimsLink = null;
        try {
            const row = updatedRecord[0];
            await attachMedicalRecordToActiveShaSession(row.patientId, row.recordId);
            shaClaimsLink = await syncNationalClaimDiagnosisFromEncounter(pool, {
                patientId: row.patientId,
                medicalRecordId: row.recordId,
                req,
            });
        } catch (linkErr) {
            console.warn('[medical-records] SHA claims sync skipped:', linkErr.message || linkErr);
        }

        if (idsrTextChanged) {
            try {
                const row = updatedRecord[0];
                await evaluateMedicalRecordIdsr(pool, {
                    patientId: row.patientId,
                    recordId: row.recordId,
                    diagnosis: row.diagnosis,
                    chiefComplaint: row.chiefComplaint,
                    symptoms: row.symptoms,
                    notes: row.notes,
                });
            } catch (idsrErr) {
                console.warn('[medical-records] IDSR evaluate on amend skipped:', idsrErr.message || idsrErr);
            }
        }

        let fhirPublish = null;
        const closingEncounter =
            !encounterInProgress &&
            (outcome !== undefined ? Boolean(outcome) : Boolean(updatedRecord[0]?.outcome));
        if (closingEncounter) {
            try {
                if (await shouldAutoPublish(pool)) {
                    fhirPublish = await publishEncounter(pool, Number(req.params.id));
                    if (fhirPublish?.skipped && fhirPublish.reason) {
                        console.warn('[medical-records] FHIR publish skipped:', fhirPublish.reason);
                    }
                }
            } catch (fhirErr) {
                fhirPublish = { status: 'failed', error: fhirErr.message || String(fhirErr) };
                console.warn('[medical-records] FHIR publish on update:', fhirErr.message || fhirErr);
            }
        }

        res.status(200).json({ ...updatedRecord[0], fhirPublish, shaClaimsLink });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating medical record:', error);
        res.status(500).json({ message: 'Error updating medical record', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/medical-records/:id
 * @description Delete a medical record (soft delete by setting a flag or hard delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if record exists
        const [existing] = await pool.execute(
            'SELECT * FROM medical_records WHERE recordId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Medical record not found' });
        }

        // Hard delete (medical records are typically kept for legal reasons, but we'll allow deletion)
        await pool.execute(
            'DELETE FROM medical_records WHERE recordId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Medical record deleted successfully' });
    } catch (error) {
        console.error('Error deleting medical record:', error);
        res.status(500).json({ message: 'Error deleting medical record', error: error.message });
    }
});

module.exports = router;

