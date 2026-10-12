/**
 * Mobile clinical resilience API — bundled snapshot + idempotent consultation sync.
 * Mounted at /api/mobile
 */
const express = require('express');
const pool = require('../config/db');

const router = express.Router();

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/mobile/clinical-snapshot
 * Bundled read model for doctor/pharmacy/cashier offline cache.
 * Query: servicePoint=consultation|pharmacy|cashier|registration
 */
router.get('/clinical-snapshot', async (req, res) => {
  try {
    const servicePoint = String(req.query.servicePoint || 'consultation');
    const today = todayDateOnly();

    const [queueRows] = await pool.execute(
      `SELECT q.queueId, q.patientId, q.ticketNumber, q.servicePoint, q.status, q.priority,
              q.arrivalTime, q.calledTime, q.startTime,
              p.firstName AS patientFirstName, p.lastName AS patientLastName,
              p.phone AS patientPhone, p.patientNumber, p.gender, p.dateOfBirth,
              EXISTS (
                SELECT 1 FROM invoices i
                WHERE i.patientId = q.patientId
                  AND i.status NOT IN ('paid', 'cancelled', 'draft')
                  AND i.balance > 0
              ) AS hasPendingBills
       FROM queue_entries q
       LEFT JOIN patients p ON q.patientId = p.patientId
       WHERE DATE(q.arrivalTime) = CURDATE()
         AND q.servicePoint = ?
         AND q.status NOT IN ('cancelled')
       ORDER BY FIELD(q.status, 'serving', 'called', 'waiting', 'completed'), q.arrivalTime ASC
       LIMIT 200`,
      [servicePoint]
    );

    const patientIds = [...new Set(queueRows.map((r) => r.patientId).filter(Boolean))];

    // Cashier needs today's unpaid invoices even if patient is not yet in cashier queue
    let pendingInvoices = [];
    if (servicePoint === 'cashier') {
      const [invoiceRows] = await pool.execute(
        `SELECT i.invoiceId, i.invoiceNumber, i.patientId, i.status, i.balance, i.totalAmount,
                i.notes, i.invoiceDate,
                p.firstName AS patientFirstName, p.lastName AS patientLastName, p.patientNumber
         FROM invoices i
         LEFT JOIN patients p ON i.patientId = p.patientId
         WHERE i.status IN ('pending', 'partial')
           AND i.balance > 0
           AND (DATE(i.invoiceDate) = CURDATE() OR DATE(i.createdAt) = CURDATE())
         ORDER BY i.invoiceDate DESC
         LIMIT 500`
      );
      pendingInvoices = invoiceRows;
    } else if (patientIds.length) {
      const placeholders = patientIds.map(() => '?').join(',');
      const [invoiceRows] = await pool.execute(
        `SELECT i.invoiceId, i.invoiceNumber, i.patientId, i.status, i.balance, i.totalAmount, i.notes
         FROM invoices i
         WHERE i.patientId IN (${placeholders})
           AND i.status IN ('pending', 'partial')
           AND i.balance > 0
         ORDER BY i.invoiceDate DESC
         LIMIT 500`,
        patientIds
      );
      pendingInvoices = invoiceRows;
    }

    const [medications] = await pool.execute(
      `SELECT medicationId, medicationCode, name, genericName, dosageForm, strength, category
       FROM medications WHERE voided = 0 ORDER BY name ASC LIMIT 500`
    );

    const [drugStock] = await pool.execute(
      `SELECT di.drugInventoryId, di.medicationId, di.quantity, di.sellPrice, di.batchNumber,
              m.name AS medicationName, m.strength, m.dosageForm
       FROM drug_inventory di
       INNER JOIN medications m ON di.medicationId = m.medicationId
       WHERE di.quantity > 0 AND m.voided = 0
       ORDER BY m.name ASC, di.expiryDate ASC
       LIMIT 1000`
    );

    const [testTypes] = await pool.execute(
      `SELECT testTypeId, testCode, testName, category, cost
       FROM lab_test_types WHERE isActive = 1 ORDER BY testName ASC LIMIT 300`
    );

    const [todayRecords] = await pool.execute(
      `SELECT mr.recordId, mr.patientId, mr.visitDate, mr.diagnosis, mr.chiefComplaint, mr.doctorId
       FROM medical_records mr
       WHERE mr.visitDate = ?
       ORDER BY mr.createdAt DESC
       LIMIT 200`,
      [today]
    );

    // Pharmacy offline list: paid Rx items still pending dispense (simplified for cache size)
    let readyToDispense = [];
    if (servicePoint === 'pharmacy' || servicePoint === 'consultation') {
      const [dispenseRows] = await pool.execute(
        `SELECT
            pi.itemId,
            pi.prescriptionId,
            pi.medicationId,
            COALESCE(NULLIF(pi.medicationName, 'Unknown'), m.name, 'Unknown Medication') AS medicationName,
            pi.dosage,
            pi.frequency,
            pi.duration,
            pi.quantity AS prescribedQuantity,
            pi.instructions,
            p.prescriptionNumber,
            p.patientId,
            pt.firstName AS patientFirstName,
            pt.lastName AS patientLastName,
            pt.patientNumber,
            (
              SELECT di.drugInventoryId FROM drug_inventory di
              WHERE di.medicationId = pi.medicationId AND di.quantity > 0
              ORDER BY di.expiryDate ASC, di.createdAt ASC
              LIMIT 1
            ) AS drugInventoryId
         FROM prescription_items pi
         INNER JOIN prescriptions p ON pi.prescriptionId = p.prescriptionId
         INNER JOIN patients pt ON p.patientId = pt.patientId
         LEFT JOIN medications m ON pi.medicationId = m.medicationId
         WHERE pi.status = 'pending'
           AND pi.medicationId IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM invoices i
             WHERE i.patientId = p.patientId
               AND i.status = 'paid'
               AND (
                 i.notes LIKE CONCAT('%Prescription: ', p.prescriptionNumber, '%')
                 OR i.notes LIKE '%Drug payment%'
               )
           )
         ORDER BY p.prescriptionDate DESC, pi.itemId ASC
         LIMIT 300`
      );
      readyToDispense = dispenseRows;
    }

    // Recent payments today — useful for cashier reconciliation offline
    let todayPayments = [];
    if (servicePoint === 'cashier') {
      try {
        const [payRows] = await pool.execute(
          `SELECT p.paymentId, p.invoiceId, p.amount, p.paymentDate, p.referenceNumber,
                  pm.methodName AS paymentMethod
           FROM payments p
           LEFT JOIN payment_methods pm ON p.paymentMethodId = pm.methodId
           WHERE p.paymentDate = CURDATE()
           ORDER BY p.createdAt DESC
           LIMIT 200`
        );
        todayPayments = payRows;
      } catch {
        todayPayments = [];
      }
    }

    res.status(200).json({
      version: 2,
      generatedAt: new Date().toISOString(),
      date: today,
      servicePoint,
      queue: queueRows,
      pendingInvoices,
      medications,
      drugStock,
      testTypes,
      todayRecords,
      readyToDispense,
      todayPayments,
    });
  } catch (error) {
    console.error('clinical-snapshot:', error);
    res.status(500).json({ message: 'Error building clinical snapshot', error: error.message });
  }
});

/**
 * POST /api/mobile/consultations/sync
 * Idempotent consultation save: medical record + optional prescription + queue status.
 */
router.post('/consultations/sync', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      clientActionId,
      queueId,
      patientId,
      doctorId,
      visitDate,
      chiefComplaint,
      symptoms,
      historyOfPresentIllness,
      physicalExamination,
      diagnosis,
      treatment,
      outcome,
      notes,
      visitType = 'Outpatient',
      completeQueue = false,
      prescriptionItems = [],
    } = req.body;

    if (!clientActionId || !patientId || !visitDate) {
      return res.status(400).json({ message: 'clientActionId, patientId, and visitDate are required' });
    }

    await connection.beginTransaction();

    const [existing] = await connection.execute(
      'SELECT clientActionId, recordId, prescriptionId, queueId FROM mobile_consultation_sync WHERE clientActionId = ?',
      [clientActionId]
    );
    if (existing.length) {
      await connection.commit();
      return res.status(200).json({
        duplicate: true,
        recordId: existing[0].recordId,
        prescriptionId: existing[0].prescriptionId,
        queueId: existing[0].queueId,
      });
    }

    if (queueId) {
      await connection.execute(
        `UPDATE queue_entries SET status = 'serving', startTime = COALESCE(startTime, NOW()) WHERE queueId = ?`,
        [queueId]
      );
    }

    const [recordResult] = await connection.execute(
      `INSERT INTO medical_records (
        patientId, visitDate, visitType, chiefComplaint, symptoms,
        historyOfPresentIllness, physicalExamination, diagnosis, treatment,
        outcome, notes, doctorId, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        visitDate,
        visitType,
        chiefComplaint || null,
        symptoms || null,
        historyOfPresentIllness || null,
        physicalExamination || null,
        diagnosis || null,
        treatment || null,
        outcome || null,
        notes || null,
        doctorId || null,
        doctorId || null,
      ]
    );
    const recordId = recordResult.insertId;

    let prescriptionId = null;
    const items = Array.isArray(prescriptionItems) ? prescriptionItems.filter((i) => i?.medicationId) : [];
    if (items.length && diagnosis) {
      const [count] = await connection.execute('SELECT COUNT(*) AS count FROM prescriptions');
      const prescNumber = `PRES-${String(count[0].count + 1).padStart(6, '0')}`;

      const [prescResult] = await connection.execute(
        `INSERT INTO prescriptions (prescriptionNumber, patientId, doctorId, prescriptionDate, status, notes)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [prescNumber, patientId, doctorId || null, visitDate, diagnosis]
      );
      prescriptionId = prescResult.insertId;

      for (const item of items) {
        await connection.execute(
          `INSERT INTO prescription_items
           (prescriptionId, medicationId, dosage, frequency, duration, quantity, instructions)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            prescriptionId,
            item.medicationId,
            item.dosage || '',
            item.frequency || '',
            item.duration || '',
            item.quantity || 1,
            item.instructions || null,
          ]
        );
      }
    }

    if (completeQueue && queueId) {
      await connection.execute(
        `UPDATE queue_entries SET status = 'completed', endTime = NOW() WHERE queueId = ?`,
        [queueId]
      );
    }

    await connection.execute(
      `INSERT INTO mobile_consultation_sync
       (clientActionId, recordId, prescriptionId, queueId, patientId, doctorId, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clientActionId,
        recordId,
        prescriptionId,
        queueId || null,
        patientId,
        doctorId || null,
        JSON.stringify({ chiefComplaint, diagnosis, outcome }),
      ]
    );

    await connection.commit();
    res.status(201).json({ recordId, prescriptionId, queueId: queueId || null, duplicate: false });
  } catch (error) {
    await connection.rollback();
    console.error('consultations/sync:', error);
    res.status(500).json({ message: 'Error syncing consultation', error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
