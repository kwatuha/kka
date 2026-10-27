// Patient management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { resolveRegistrationFeeAmount } = require('../utils/registrationFee');
const {
  resolveFacilityScope,
  buildPatientFacilityFilter,
  patientBelongsToScope,
  buildPatientOtherFacilityError,
  resolveBranchForRequest,
  getRequestUserId,
} = require('../lib/branchContext');
const { createQueueEntry } = require('../lib/queueService');
const { isFeeExemptPatientType } = require('../lib/patientBillingPolicy');
const { auditFromRequest } = require('../lib/auditLog');
const {
  resolveClient,
  registerClient,
  shouldAutoResolve,
} = require('../lib/clientRegistry');
const { shouldAutoPublish, publishPatient } = require('../lib/fhirMediator');

async function savePatientConsents(connection, patientId, consent, userId) {
  if (!consent || typeof consent !== 'object') return;
  const rows = [
    ['treatment', consent.consentToTreatment],
    ['share_info', consent.consentToShareInfo],
    ['photos', consent.consentToPhotos],
  ];
  for (const [consentType, granted] of rows) {
    if (granted === undefined || granted === null) continue;
    await connection.execute(
      `INSERT INTO patient_consents (patientId, consentType, granted, signatureName, capturedBy)
       VALUES (?, ?, ?, ?, ?)`,
      [
        patientId,
        consentType,
        granted ? 1 : 0,
        consent.signature || null,
        userId || null,
      ]
    );
  }
}

/**
 * @route GET /api/patients
 * @description Get patients visible to the caller's facility profile
 */
router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 25, branchId } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
        const offset = (pageNum - 1) * limitNum;
        const scope = await resolveFacilityScope(pool, req);

        // Prefer columns used by the list UI over SELECT *
        let query = `
            SELECT p.patientId, p.patientNumber, p.firstName, p.lastName, p.middleName,
                   p.dateOfBirth, p.gender, p.phone, p.email, p.address, p.county, p.subcounty, p.ward,
                   p.idNumber, p.idType, p.bloodGroup, p.createdAt, p.patientType, p.registeredBranchId,
                   b.branchName AS registeredBranchName
            FROM patients p
            LEFT JOIN branches b ON b.branchId = p.registeredBranchId
            WHERE p.voided = 0
        `;
        const params = [];

        if (scope.canAccessAllBranches && branchId) {
            query += ` AND p.registeredBranchId = ?`;
            params.push(Number(branchId));
        } else {
            const filter = buildPatientFacilityFilter(scope, 'p.registeredBranchId');
            query += filter.clause;
            params.push(...filter.params);
        }

        if (search) {
            query += ` AND (
                p.firstName LIKE ? OR p.lastName LIKE ? OR p.patientNumber LIKE ? OR p.phone LIKE ? OR REPLACE(REPLACE(p.phone, ' ', ''), '-', '') LIKE ?
                OR p.email LIKE ? OR p.idNumber LIKE ? OR p.nupi LIKE ?
                OR CONCAT(p.firstName, ' ', p.lastName) LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            const compactSearchTerm = `%${String(search).replace(/[\s-]/g, '')}%`;
            params.push(
                searchTerm, searchTerm, searchTerm, searchTerm, compactSearchTerm,
                searchTerm, searchTerm, searchTerm, searchTerm
            );
        }

        query += ` ORDER BY p.createdAt DESC LIMIT ${limitNum} OFFSET ${offset}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Error fetching patients', error: error.message });
    }
});

/**
 * @route GET /api/patients/vitals/today
 * @description Get all vital signs recorded today
 */
router.get('/vitals/today', async (req, res) => {
    try {
        const query = `
            SELECT vs.*,
                   p.patientId,
                   p.patientNumber,
                   p.firstName as patientFirstName,
                   p.lastName as patientLastName,
                   CONCAT(p.firstName, ' ', p.lastName) as patientName,
                   u.firstName as recordedByFirstName,
                   u.lastName as recordedByLastName
            FROM vital_signs vs
            LEFT JOIN patients p ON vs.patientId = p.patientId
            LEFT JOIN users u ON vs.recordedBy = u.userId
            WHERE DATE(CONVERT_TZ(vs.recordedDate, @@session.time_zone, '+03:00')) =
                  DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+03:00'))
            ORDER BY vs.recordedDate DESC
        `;

        const [rows] = await pool.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching today\'s vital signs:', error);
        res.status(500).json({ message: 'Error fetching today\'s vital signs', error: error.message });
    }
});

/**
 * GET /api/patients/:id/household — household head + linked dependants in this facility
 */
router.get('/:id/household', async (req, res) => {
    const patientId = Number(req.params.id);
    if (!patientId) return res.status(400).json({ message: 'Invalid patient id' });
    try {
        const scope = await resolveFacilityScope(pool, req);
        const { listHouseholdMembersForPatient } = require('../lib/patientHousehold');
        const result = await listHouseholdMembersForPatient(pool, scope, patientId);
        if (!result.found) return res.status(404).json({ message: 'Patient not found' });
        if (result.forbidden) {
            return res.status(403).json({ message: 'Patient not in your facility scope' });
        }
        res.json(result);
    } catch (error) {
        if (String(error.message || '').includes('linkedParentCrId')) {
            return res.status(503).json({
                message: 'Apply migration 149_patients_linked_parent_cr.sql',
                error: error.message,
            });
        }
        console.error('patient household:', error);
        res.status(500).json({ message: 'Error loading household', error: error.message });
    }
});

/**
 * GET /api/patients/:id/data-export — portability bundle (DHA PRI-DATAPORT)
 */
router.get('/:id/data-export', async (req, res) => {
    const { id } = req.params;
    try {
        const scope = await resolveFacilityScope(pool, req);
        const { buildPatientDataExport } = require('../lib/patientDataExport');
        const pack = await buildPatientDataExport(pool, Number(id));
        if (!pack) return res.status(404).json({ message: 'Patient not found' });
        if (!patientBelongsToScope(scope, pack.patient.registeredBranchId)) {
            return res.status(403).json({ message: 'Patient not in your facility scope' });
        }
        res.setHeader('Content-Disposition', `attachment; filename="patient-${id}-data-export.json"`);
        res.json(pack);
    } catch (error) {
        console.error('patient data export:', error);
        res.status(500).json({ message: 'Export failed', error: error.message });
    }
});

const CONSENT_TYPES = new Set(['treatment', 'share_info', 'photos', 'hie_share']);

/**
 * GET /api/patients/:id/consents — chart consent history (DHA INT-CONSENT-CHART)
 */
router.get('/:id/consents', async (req, res) => {
    const patientId = Number(req.params.id);
    try {
        const scope = await resolveFacilityScope(pool, req);
        const [patients] = await pool.execute(
            'SELECT patientId, registeredBranchId FROM patients WHERE patientId = ? AND voided = 0',
            [patientId]
        );
        if (!patients.length) return res.status(404).json({ message: 'Patient not found' });
        if (!patientBelongsToScope(scope, patients[0].registeredBranchId)) {
            return res.status(403).json({ message: 'Patient not in your facility scope' });
        }
        const [rows] = await pool.execute(
            `SELECT c.consentId, c.consentType, c.granted, c.grantedAt, c.revokedAt,
                    c.signatureName, c.notes, c.capturedBy, c.createdAt,
                    u.username AS capturedByUsername,
                    u.firstName AS capturedByFirstName, u.lastName AS capturedByLastName
             FROM patient_consents c
             LEFT JOIN users u ON u.userId = c.capturedBy
             WHERE c.patientId = ?
             ORDER BY c.grantedAt DESC, c.consentId DESC`,
            [patientId]
        );
        res.json({ consents: rows });
    } catch (error) {
        console.error('patient consents list:', error);
        res.status(500).json({ message: 'Failed to load consents', error: error.message });
    }
});

/**
 * POST /api/patients/:id/consents — record consent update on chart
 */
router.post('/:id/consents', async (req, res) => {
    const patientId = Number(req.params.id);
    try {
        const userId = getRequestUserId(req);
        const scope = await resolveFacilityScope(pool, req);
        const [patients] = await pool.execute(
            'SELECT patientId, registeredBranchId FROM patients WHERE patientId = ? AND voided = 0',
            [patientId]
        );
        if (!patients.length) return res.status(404).json({ message: 'Patient not found' });
        if (!patientBelongsToScope(scope, patients[0].registeredBranchId)) {
            return res.status(403).json({ message: 'Patient not in your facility scope' });
        }

        const { consentType, granted, signatureName, notes } = req.body || {};
        const type = String(consentType || '').trim();
        if (!CONSENT_TYPES.has(type)) {
            return res.status(400).json({
                message: 'Invalid consentType',
                allowed: [...CONSENT_TYPES],
            });
        }
        if (granted === undefined || granted === null) {
            return res.status(400).json({ message: 'granted is required (boolean)' });
        }

        const [ins] = await pool.execute(
            `INSERT INTO patient_consents (patientId, consentType, granted, signatureName, notes, capturedBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                type,
                granted ? 1 : 0,
                signatureName ? String(signatureName).slice(0, 200) : null,
                notes ? String(notes).slice(0, 2000) : null,
                userId || null,
            ]
        );

        await auditFromRequest(req, {
            action: 'CONSENT_CAPTURE',
            resourceType: 'patient_consent',
            resourceId: String(ins.insertId),
            patientId,
            summary: `Consent ${type}: ${granted ? 'granted' : 'declined'}`,
        });

        res.status(201).json({
            consentId: ins.insertId,
            patientId,
            consentType: type,
            granted: Boolean(granted),
            message: 'Consent recorded',
        });
    } catch (error) {
        console.error('patient consent create:', error);
        res.status(500).json({ message: 'Failed to record consent', error: error.message });
    }
});

/**
 * POST /api/patients/:id/consents/revoke — withdraw latest active consent of a type
 */
router.post('/:id/consents/revoke', async (req, res) => {
    const patientId = Number(req.params.id);
    try {
        const scope = await resolveFacilityScope(pool, req);
        const [patients] = await pool.execute(
            'SELECT patientId, registeredBranchId FROM patients WHERE patientId = ? AND voided = 0',
            [patientId]
        );
        if (!patients.length) return res.status(404).json({ message: 'Patient not found' });
        if (!patientBelongsToScope(scope, patients[0].registeredBranchId)) {
            return res.status(403).json({ message: 'Patient not in your facility scope' });
        }

        const { consentType, reason, signatureName } = req.body || {};
        const type = String(consentType || '').trim();
        if (!CONSENT_TYPES.has(type)) {
            return res.status(400).json({ message: 'Invalid consentType', allowed: [...CONSENT_TYPES] });
        }

        const [active] = await pool.execute(
            `SELECT consentId FROM patient_consents
             WHERE patientId = ? AND consentType = ? AND granted = 1 AND revokedAt IS NULL
             ORDER BY grantedAt DESC, consentId DESC LIMIT 1`,
            [patientId, type]
        );
        if (!active.length) {
            return res.status(404).json({ message: 'No active granted consent for this type' });
        }

        await pool.execute(
            `UPDATE patient_consents SET revokedAt = CURRENT_TIMESTAMP WHERE consentId = ?`,
            [active[0].consentId]
        );

        const userId = getRequestUserId(req);
        const [ins] = await pool.execute(
            `INSERT INTO patient_consents (patientId, consentType, granted, signatureName, notes, capturedBy)
             VALUES (?, ?, 0, ?, ?, ?)`,
            [
                patientId,
                type,
                signatureName ? String(signatureName).slice(0, 200) : null,
                reason ? `Revoked: ${String(reason).slice(0, 1900)}` : 'Consent withdrawn',
                userId || null,
            ]
        );

        await auditFromRequest(req, {
            action: 'CONSENT_REVOKE',
            resourceType: 'patient_consent',
            resourceId: String(ins.insertId),
            patientId,
            summary: `Consent withdrawn: ${type}`,
        });

        res.json({
            message: 'Consent withdrawn',
            patientId,
            consentType: type,
            revokedConsentId: active[0].consentId,
            newConsentId: ins.insertId,
        });
    } catch (error) {
        console.error('patient consent revoke:', error);
        res.status(500).json({ message: 'Failed to revoke consent', error: error.message });
    }
});

/**
 * @route GET /api/patients/:id
 * @description Get a single patient by ID
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const scope = await resolveFacilityScope(pool, req);
        const [rows] = await pool.execute(
            `SELECT p.*, b.branchName AS registeredBranchName
             FROM patients p
             LEFT JOIN branches b ON b.branchId = p.registeredBranchId
             WHERE p.patientId = ? AND p.voided = 0`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        if (!patientBelongsToScope(scope, rows[0].registeredBranchId)) {
            // Doctors may open patients booked for them (or open bookings) from other facilities
            const rn = String(scope.roleName || '').toLowerCase();
            const isDoctorLike =
                rn === 'doctor' ||
                rn.includes('telemedicine') ||
                rn.includes('clinical_officer') ||
                rn.includes('medical_officer') ||
                rn.includes('clinician');
            let allowedViaBooking = false;
            if (isDoctorLike && scope.userId) {
                const [bookingRows] = await pool.execute(
                    `SELECT appointmentId
                     FROM appointments
                     WHERE patientId = ?
                       AND (doctorId = ? OR doctorId IS NULL)
                       AND status NOT IN ('cancelled', 'no_show')
                     LIMIT 1`,
                    [id, scope.userId]
                );
                allowedViaBooking = Boolean(bookingRows[0]);
            }
            if (!allowedViaBooking) {
                return res.status(403).json(buildPatientOtherFacilityError(scope, rows[0]));
            }
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ message: 'Error fetching patient', error: error.message });
    }
});

/**
 * @route POST /api/patients
 * @description Create a new patient
 */
router.post('/', async (req, res) => {
    const patientData = req.body;
    const userId = getRequestUserId(req) || req.user?.id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Generate patient number if not provided
        if (!patientData.patientNumber) {
            const [count] = await connection.execute('SELECT COUNT(*) as count FROM patients');
            patientData.patientNumber = `P-${String(count[0].count + 1).padStart(6, '0')}`;
        }

        // Stamp registration facility from request body or X-Branch-Id header (multi-facility).
        // Facility-scoped users are forced onto their current/assigned facility.
        const scope = await resolveFacilityScope(connection, req, { userId, body: patientData });
        let registeredBranchId =
            Number(patientData.registeredBranchId || patientData.branchId || patientData.currentBranchId) || null;
        if (!registeredBranchId) {
            registeredBranchId = scope.currentBranchId || null;
        }
        if (!scope.canAccessAllBranches) {
            registeredBranchId = scope.currentBranchId || scope.branchIds[0] || registeredBranchId;
            if (registeredBranchId && !patientBelongsToScope(scope, registeredBranchId)) {
                await connection.rollback();
                return res.status(403).json({
                    message: 'You can only register patients to your assigned facility.',
                });
            }
        }
        if (!registeredBranchId) {
            const branch = await resolveBranchForRequest(connection, req, { userId, body: patientData });
            registeredBranchId = branch?.branchId || null;
        }

        const [result] = await connection.execute(
            `INSERT INTO patients (
                registeredBranchId, patientNumber, firstName, lastName, middleName, dateOfBirth, gender, patientType, insuranceCompanyId, insuranceNumber,
                phone, email, address, county, subcounty, ward, idNumber, idType, nupi, nupiStatus, crReference, nupiResolvedAt,
                nextOfKinName, nextOfKinPhone, nextOfKinRelationship,
                bloodGroup, allergies, medicalHistory, createdBy, voided
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                registeredBranchId,
                patientData.patientNumber || null,
                patientData.firstName,
                patientData.lastName,
                patientData.middleName || null,
                patientData.dateOfBirth || null,
                patientData.gender || null,
                patientData.patientType || 'paying',
                patientData.insuranceCompanyId || null,
                patientData.insuranceNumber || null,
                patientData.phone || null,
                patientData.email || null,
                patientData.address || null,
                patientData.county || null,
                patientData.subcounty || null,
                patientData.ward || null,
                patientData.idNumber || null,
                patientData.idType || null,
                patientData.nupi || null,
                patientData.nupi ? 'resolved' : 'unresolved',
                patientData.crReference || null,
                patientData.nupi ? new Date() : null,
                patientData.nextOfKinName || null,
                patientData.nextOfKinPhone || null,
                patientData.nextOfKinRelationship || null,
                patientData.bloodGroup || null,
                patientData.allergies || null,
                patientData.medicalHistory || null,
                userId || null
            ]
        );

        const patientId = result.insertId;

        // After patient registration: optional registration fee invoice + cashier (only if REG-FEE amount > 0)
        try {
            const registeredType = patientData.patientType || 'paying';
            if (isFeeExemptPatientType(registeredType)) {
                console.log(
                    `[REGISTRATION] Skipping registration fee for non-paying patient ${patientId}`
                );
            } else {
            const { amount: registrationFeeAmount, chargeId } = await resolveRegistrationFeeAmount(connection);

            if (registrationFeeAmount <= 0) {
                console.log(
                    `[REGISTRATION] No registration fee invoice for patient ${patientId} ` +
                        `(REG-FEE missing, inactive, or amount is 0 — set charge > 0 in service charges to enable).`
                );
            }

            if (registrationFeeAmount > 0 && chargeId) {
            // Generate invoice number (same approach as triage numbers to avoid duplicates)
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const datePrefix = `INV-${today}-`;

            // Get the maximum invoice number for today (extract the numeric part after last dash)
            const [maxResult] = await connection.execute(
                `SELECT MAX(CAST(SUBSTRING_INDEX(invoiceNumber, '-', -1) AS UNSIGNED)) as maxNum
                 FROM invoices
                 WHERE invoiceNumber LIKE CONCAT(?, '%')`,
                [datePrefix]
            );

            let nextNum = (maxResult[0]?.maxNum || 0) + 1;
            let invoiceNumber = `${datePrefix}${String(nextNum).padStart(4, '0')}`;

            // Check if this number already exists (safety check for race conditions)
            let attempts = 0;
            while (attempts < 100) {
                const [existing] = await connection.execute(
                    'SELECT invoiceId FROM invoices WHERE invoiceNumber = ?',
                    [invoiceNumber]
                );

                if (existing.length === 0) {
                    break; // Number is available
                }
                // Number exists, try next one
                nextNum++;
                invoiceNumber = `${datePrefix}${String(nextNum).padStart(4, '0')}`;
                attempts++;
            }

            if (attempts >= 100) {
                await connection.rollback();
                connection.release();
                return res.status(500).json({
                    message: 'Failed to generate unique invoice number',
                    error: 'Please try again.'
                });
            }

            // Create invoice for registration fee (with retry on duplicate key error)
            let invoiceResult;
            try {
                [invoiceResult] = await connection.execute(
                    `INSERT INTO invoices (invoiceNumber, patientId, invoiceDate, totalAmount, balance, status, notes, createdBy)
                     VALUES (?, ?, CURDATE(), ?, ?, 'pending', ?, ?)`,
                    [
                        invoiceNumber,
                        patientId,
                        registrationFeeAmount,
                        registrationFeeAmount, // balance = totalAmount initially
                        'Registration fee payment',
                        userId || null
                    ]
                );
            } catch (insertError) {
                // Handle duplicate key error - find next available number
                if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
                    // Get max number and find next available
                    const [retryMaxResult] = await connection.execute(
                        `SELECT MAX(CAST(SUBSTRING_INDEX(invoiceNumber, '-', -1) AS UNSIGNED)) as maxNum
                         FROM invoices
                         WHERE invoiceNumber LIKE CONCAT(?, '%')`,
                        [datePrefix]
                    );

                    let retryNum = (retryMaxResult[0]?.maxNum || 0) + 1;
                    let foundAvailable = false;
                    let retryAttempts = 0;

                    while (!foundAvailable && retryAttempts < 100) {
                        const testNumber = `${datePrefix}${String(retryNum).padStart(4, '0')}`;
                        const [existing] = await connection.execute(
                            'SELECT invoiceId FROM invoices WHERE invoiceNumber = ?',
                            [testNumber]
                        );

                        if (existing.length === 0) {
                            invoiceNumber = testNumber;
                            foundAvailable = true;
                        } else {
                            retryNum++;
                            retryAttempts++;
                        }
                    }

                    if (!foundAvailable) {
                        await connection.rollback();
                        connection.release();
                        return res.status(500).json({
                            message: 'Failed to generate unique invoice number',
                            error: 'Please try again.'
                        });
                    }

                    // Retry insert with new number
                    [invoiceResult] = await connection.execute(
                        `INSERT INTO invoices (invoiceNumber, patientId, invoiceDate, totalAmount, balance, status, notes, createdBy)
                         VALUES (?, ?, CURDATE(), ?, ?, 'pending', ?, ?)`,
                        [
                            invoiceNumber,
                            patientId,
                            registrationFeeAmount,
                            registrationFeeAmount,
                            'Registration fee payment',
                            userId || null
                        ]
                    );
                } else {
                    throw insertError; // Re-throw if it's not a duplicate key error
                }
            }

            const invoiceId = invoiceResult.insertId;

            // Create invoice item
            await connection.execute(
                `INSERT INTO invoice_items (invoiceId, chargeId, description, quantity, unitPrice, totalPrice)
                 VALUES (?, ?, ?, 1, ?, ?)`,
                [
                    invoiceId,
                    chargeId,
                    'Patient Registration Fee',
                    registrationFeeAmount,
                    registrationFeeAmount
                ]
            );

            // Check if patient already exists in cashier queue (unlikely for new patients, but check anyway)
            const cashierQueueId = await createQueueEntry(connection, {
                patientId,
                servicePoint: 'cashier',
                priority: 'normal',
                notes: 'Registration fees payment',
                userId: userId || null,
                branchId: registeredBranchId,
                checkDuplicate: true,
            });
            if (cashierQueueId) {
                console.log(`Patient ${patientId} cashier queue entry: ${cashierQueueId}`);
            }

            } // end registration fee invoice + cashier (amount > 0)
            } // end: paying/insurance registration fee path

            // Add patient to triage queue after registration (always when registration succeeds)
            try {
                const triageQueueId = await createQueueEntry(connection, {
                    patientId,
                    servicePoint: 'triage',
                    priority: 'normal',
                    notes: 'New patient registration - requires triage',
                    userId: userId || null,
                    branchId: registeredBranchId,
                    checkDuplicate: true,
                });
                if (triageQueueId) {
                    console.log(`Patient ${patientId} added to triage queue (queueId: ${triageQueueId})`);
                }
            } catch (triageQueueError) {
                // Log error but don't fail patient registration if triage queue creation fails
                console.error('Error adding patient to triage queue after registration:', triageQueueError);
                // Continue with patient registration even if triage queue creation fails
            }
        } catch (queueError) {
            // Log error but don't fail patient registration if queue/invoice creation fails
            console.error('Error creating invoice and cashier queue after patient registration:', queueError);
            // Rollback only the invoice/queue creation, but keep patient registration
            // We'll let the transaction continue since patient registration is the main operation
        }

        // If patient is registered as insurance, create insurance policy automatically
        if (patientData.patientType === 'insurance' && patientData.insuranceCompanyId) {
            try {
                // Check if policy already exists for this patient and provider
                const [existingPolicy] = await connection.execute(
                    'SELECT patientInsuranceId FROM patient_insurance WHERE patientId = ? AND providerId = ?',
                    [patientId, patientData.insuranceCompanyId]
                );

                if (existingPolicy.length === 0) {
                    // Create insurance policy automatically
                    const policyNumber = patientData.insuranceNumber || `POL-${patientId}`;
                    const memberId = patientData.insuranceNumber || null;

                    await connection.execute(
                        `INSERT INTO patient_insurance (
                            patientId, providerId, policyNumber, memberId,
                            coverageStartDate, isActive, notes
                        ) VALUES (?, ?, ?, ?, CURDATE(), 1, ?)`,
                        [
                            patientId,
                            patientData.insuranceCompanyId,
                            policyNumber,
                            memberId,
                            `Auto-created policy from patient registration. Insurance Number: ${patientData.insuranceNumber || 'N/A'}`
                        ]
                    );
                    console.log(`Auto-created insurance policy for patient ${patientId}`);
                }
            } catch (insuranceError) {
                // Log error but don't fail patient registration
                console.error('Error auto-creating insurance policy:', insuranceError);
                // Continue with patient registration even if policy creation fails
            }
        }

        await savePatientConsents(connection, patientId, patientData.consent, userId);

        // Phase 2: auto-resolve / register NUPI when identity present
        let nupiPayload = null;
        try {
          const auto = await shouldAutoResolve(connection);
          if (auto && !patientData.nupi && (patientData.idNumber || patientData.phone)) {
            let cr = await resolveClient(connection, {
              idNumber: patientData.idNumber,
              idType: patientData.idType,
              phone: patientData.phone,
              firstName: patientData.firstName,
              lastName: patientData.lastName,
              middleName: patientData.middleName,
              dateOfBirth: patientData.dateOfBirth,
              gender: patientData.gender,
            });
            let status = 'resolved';
            if (!cr.found || !cr.nupi) {
              cr = await registerClient(connection, {
                ...patientData,
                facilityMflCode: null,
              });
              status = cr.skipped ? 'skipped' : 'registered';
            }
            if (cr.nupi) {
              const linkedParent =
                cr.patient?.linkedParentCrId ||
                cr.dependant?.linkedParentCrId ||
                null;
              await connection.execute(
                `UPDATE patients
                 SET nupi = ?, nupiStatus = ?, crReference = ?, nupiResolvedAt = NOW(),
                     linkedParentCrId = COALESCE(?, linkedParentCrId)
                 WHERE patientId = ?`,
                [cr.nupi, status, cr.crReference || null, linkedParent, patientId]
              );
              nupiPayload = {
                nupi: cr.nupi,
                nupiStatus: status,
                crReference: cr.crReference || null,
                mode: cr.mode,
              };
            }
          } else if (patientData.nupi) {
            nupiPayload = {
              nupi: patientData.nupi,
              nupiStatus: 'resolved',
              crReference: patientData.crReference || null,
              mode: 'client-provided',
            };
          }
        } catch (nupiErr) {
          console.warn('[patients] NUPI resolve skipped:', nupiErr.message || nupiErr);
          try {
            await connection.execute(
              `UPDATE patients SET nupiStatus = 'failed' WHERE patientId = ?`,
              [patientId]
            );
          } catch {
            /* ignore */
          }
        }

        // Phase 1 prep: enqueue patient.registered for national adapters / RabbitMQ
        try {
          await connection.execute(
            `INSERT INTO integration_outbox (eventType, aggregateType, aggregateId, payloadJson, status)
             VALUES ('patient.registered', 'patient', ?, ?, 'pending')`,
            [
              String(patientId),
              JSON.stringify({
                patientId,
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                idNumber: patientData.idNumber || null,
                phone: patientData.phone || null,
                registeredBranchId,
                ...(nupiPayload || {}),
              }),
            ]
          );
          if (nupiPayload?.nupi) {
            await connection.execute(
              `INSERT INTO integration_outbox (eventType, aggregateType, aggregateId, payloadJson, status)
               VALUES (?, 'patient', ?, ?, 'pending')`,
              [
                nupiPayload.nupiStatus === 'registered'
                  ? 'patient.nupi.registered'
                  : 'patient.nupi.resolved',
                String(patientId),
                JSON.stringify({ patientId, ...nupiPayload }),
              ]
            );
          }
        } catch (outboxErr) {
          console.warn('[patients] outbox enqueue skipped:', outboxErr.message || outboxErr);
        }

        await connection.commit();

        const [newPatient] = await connection.execute(
            'SELECT * FROM patients WHERE patientId = ?',
            [patientId]
        );

        connection.release();

        // Phase 3: FHIR Patient publish (after commit so reads see the row)
        try {
          if (await shouldAutoPublish(pool)) {
            await publishPatient(pool, patientId);
          }
        } catch (fhirErr) {
          console.warn('[patients] FHIR publish skipped:', fhirErr.message || fhirErr);
        }

        await auditFromRequest(req, {
          action: 'create',
          resourceType: 'patient',
          resourceId: String(patientId),
          patientId,
          summary: `Registered patient ${patientData.firstName} ${patientData.lastName}`,
          after: {
            patientId,
            patientNumber: newPatient[0]?.patientNumber,
            consent: patientData.consent
              ? {
                  treatment: Boolean(patientData.consent.consentToTreatment),
                  shareInfo: Boolean(patientData.consent.consentToShareInfo),
                  photos: Boolean(patientData.consent.consentToPhotos),
                }
              : null,
          },
        });

        res.status(201).json(newPatient[0]);
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error creating patient:', error);
        res.status(500).json({ message: 'Error creating patient', error: error.message });
    }
});

/**
 * @route PUT /api/patients/:id
 * @description Update a patient
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const patientData = req.body;

    try {
        const updates = [];
        const values = [];

        Object.keys(patientData).forEach(key => {
            // Prevent updating voided, patientId, createdAt, createdBy through this endpoint
            // voided should only be changed via DELETE endpoint
            if (patientData[key] !== undefined &&
                key !== 'patientId' &&
                key !== 'voided' &&
                key !== 'createdAt' &&
                key !== 'createdBy') {
                updates.push(`${key} = ?`);
                values.push(patientData[key]);
            }
        });

        // Ensure voided is always 0 on update
        updates.push('voided = 0');

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        await pool.execute(
            `UPDATE patients SET ${updates.join(', ')}, updatedAt = NOW() WHERE patientId = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM patients WHERE patientId = ?',
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ message: 'Error updating patient', error: error.message });
    }
});

/**
 * @route DELETE /api/patients/:id
 * @description Soft delete a patient (set voided = 1)
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        // Check if patient exists and is not already voided
        const [existing] = await pool.execute(
            'SELECT * FROM patients WHERE patientId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        if (existing[0].voided === 1) {
            return res.status(400).json({ message: 'Patient is already deleted' });
        }

        // Soft delete: set voided = 1
        await pool.execute(
            'UPDATE patients SET voided = 1, updatedAt = NOW() WHERE patientId = ?',
            [id]
        );

        res.status(200).json({
            message: 'Patient deleted successfully',
            patientId: id
        });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ message: 'Error deleting patient', error: error.message });
    }
});

/**
 * @route GET /api/patients/:id/vitals
 * @description Get patient vital signs (optionally filtered by date)
 */
router.get('/:id/vitals', async (req, res) => {
    const { id } = req.params;
    const { date, today } = req.query;

    try {
        let query = `
            SELECT vs.*,
                   u.firstName as recordedByFirstName,
                   u.lastName as recordedByLastName
            FROM vital_signs vs
            LEFT JOIN users u ON vs.recordedBy = u.userId
            WHERE vs.patientId = ?
        `;
        const params = [id];

        if (today === 'true' || date) {
            if (today === 'true') {
                // Use Africa/Nairobi calendar day so overnight triage (UTC previous day) still shows in consult
                query += ` AND DATE(CONVERT_TZ(vs.recordedDate, @@session.time_zone, '+03:00')) =
                                 DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+03:00'))`;
            } else {
                query += ` AND DATE(CONVERT_TZ(vs.recordedDate, @@session.time_zone, '+03:00')) = ?`;
                params.push(date);
            }
        }

        // Enough rows for trend charts on patient detail (was 10)
        query += ` ORDER BY vs.recordedDate DESC LIMIT 200`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching patient vitals:', error);
        res.status(500).json({ message: 'Error fetching patient vitals', error: error.message });
    }
});

module.exports = router;

