/**
 * Seed medication substitution demo data (prescribed vs dispensed audit trail).
 *
 * Creates three scenarios for a UAT patient:
 *   1–2) Completed substitutions with dispensations (historical)
 *   3)   Active substitution pending dispense (try Dispense Medications dialog)
 *
 * Usage:
 *   node scripts/seedMedicationSubstitutionDemo.js [patientId|patientNumber]
 *
 * Production:
 *   docker exec kakamega_api node /app/scripts/seedMedicationSubstitutionDemo.js KAK-TEST-002
 */
require('../config/load-env');
const pool = require('../config/db');

const DEMO_TAG = '[SUBSTITUTION-DEMO]';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function resolvePatient(conn, arg) {
  if (!arg) {
    const [rows] = await conn.execute(
      `SELECT patientId, patientNumber, firstName, lastName, registeredBranchId
       FROM patients WHERE patientNumber = 'KAK-TEST-002' AND voided = 0 LIMIT 1`,
    );
    if (!rows.length) throw new Error('Default patient KAK-TEST-002 not found');
    return rows[0];
  }
  if (/^\d+$/.test(String(arg))) {
    const [rows] = await conn.execute(
      `SELECT patientId, patientNumber, firstName, lastName, registeredBranchId
       FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
      [Number(arg)],
    );
    if (!rows.length) throw new Error(`Patient id ${arg} not found`);
    return rows[0];
  }
  const [rows] = await conn.execute(
    `SELECT patientId, patientNumber, firstName, lastName, registeredBranchId
     FROM patients WHERE patientNumber = ? AND voided = 0 LIMIT 1`,
    [String(arg)],
  );
  if (!rows.length) throw new Error(`Patient ${arg} not found`);
  return rows[0];
}

async function findMed(conn, pattern) {
  const [rows] = await conn.execute(
    `SELECT medicationId, name FROM medications
     WHERE COALESCE(voided, 0) = 0 AND (name LIKE ? OR genericName LIKE ?)
     ORDER BY medicationId LIMIT 1`,
    [`%${pattern}%`, `%${pattern}%`],
  );
  return rows[0] || null;
}

async function ensureMedication(conn, { code, name, genericName, form, strength, description }) {
  const [existing] = await conn.execute(
    `SELECT medicationId, name FROM medications
     WHERE medicationCode = ? OR name = ? LIMIT 1`,
    [code, name],
  );
  if (existing.length) return existing[0];

  const [result] = await conn.execute(
    `INSERT INTO medications
       (medicationCode, name, genericName, dosageForm, strength, description, voided)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [code, name, genericName, form, strength, `${DEMO_TAG} ${description}`],
  );
  return { medicationId: result.insertId, name };
}

async function ensureInventory(conn, { branchId, storeId, medicationId, batchSuffix, qty, sellPrice }) {
  const batchNumber = `SUB-DEMO-${batchSuffix}`;
  const [existing] = await conn.execute(
    `SELECT drugInventoryId, batchNumber, quantity, sellPrice, expiryDate
     FROM drug_inventory
     WHERE batchNumber = ? AND medicationId = ? LIMIT 1`,
    [batchNumber, medicationId],
  );
  if (existing.length) {
    await conn.execute(
      `UPDATE drug_inventory SET quantity = ?, status = 'active', updatedAt = NOW()
       WHERE drugInventoryId = ?`,
      [qty, existing[0].drugInventoryId],
    );
    return { ...existing[0], quantity: qty };
  }

  const [result] = await conn.execute(
    `INSERT INTO drug_inventory
       (branchId, medicationId, batchNumber, quantity, originalQuantity, status,
        unitPrice, sellPrice, expiryDate, location, storeId, notes)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, DATE_ADD(CURDATE(), INTERVAL 24 MONTH), ?, ?, ?)`,
    [
      branchId,
      medicationId,
      batchNumber,
      qty,
      qty,
      sellPrice * 0.6,
      sellPrice,
      'Pharmacy',
      storeId,
      `${DEMO_TAG} substitute stock`,
    ],
  );
  const [rows] = await conn.execute(
    `SELECT drugInventoryId, batchNumber, quantity, sellPrice, expiryDate
     FROM drug_inventory WHERE drugInventoryId = ?`,
    [result.insertId],
  );
  return rows[0];
}

async function cleanup(conn, patientId) {
  const tag = `%${DEMO_TAG}%`;

  const [rxRows] = await conn.execute(
    `SELECT prescriptionId FROM prescriptions WHERE patientId = ? AND notes LIKE ?`,
    [patientId, tag],
  );
  const rxIds = rxRows.map((r) => r.prescriptionId);
  if (!rxIds.length) return;

  const ph = rxIds.map(() => '?').join(',');
  const [items] = await conn.execute(
    `SELECT itemId FROM prescription_items WHERE prescriptionId IN (${ph})`,
    rxIds,
  );
  const itemIds = items.map((i) => i.itemId);

  if (itemIds.length) {
    const iph = itemIds.map(() => '?').join(',');
    await conn.execute(
      `DELETE FROM prescription_item_substitutions WHERE prescriptionItemId IN (${iph})`,
      itemIds,
    );
    await conn.execute(
      `DELETE FROM dispensations WHERE prescriptionItemId IN (${iph})`,
      itemIds,
    );
    await conn.execute(
      `DELETE FROM prescription_items_history WHERE itemId IN (${iph})`,
      itemIds,
    );
    await conn.execute(`DELETE FROM prescription_items WHERE itemId IN (${iph})`, itemIds);
  }

  await conn.execute(`DELETE FROM prescriptions WHERE prescriptionId IN (${ph})`, rxIds);

  const [invoices] = await conn.execute(
    `SELECT invoiceId FROM invoices WHERE patientId = ? AND notes LIKE ?`,
    [patientId, tag],
  );
  const invoiceIds = invoices.map((i) => i.invoiceId);
  if (invoiceIds.length) {
    const invPh = invoiceIds.map(() => '?').join(',');
    await conn.execute(`DELETE FROM invoice_items WHERE invoiceId IN (${invPh})`, invoiceIds);
    await conn.execute(`DELETE FROM payments WHERE invoiceId IN (${invPh})`).catch(() => {});
    await conn.execute(`DELETE FROM invoices WHERE invoiceId IN (${invPh})`, invoiceIds);
  }

  await conn.execute(`DELETE FROM drug_inventory WHERE notes LIKE ?`, [tag]);

  await conn.execute(
    `DELETE FROM queue_entries
     WHERE patientId = ? AND servicePoint = 'pharmacy'
       AND notes LIKE ?`,
    [patientId, tag],
  );
}

async function createPaidDrugInvoice(conn, {
  branchId,
  patientId,
  prescriptionNumber,
  drugInventoryId,
  medicationName,
  quantity,
  unitPrice,
  daysBack,
  userId,
}) {
  const total = Number(unitPrice) * Number(quantity);
  const invNum = `INV-SUB-DEMO-${prescriptionNumber.replace(/[^A-Z0-9-]/gi, '')}`;
  const [inv] = await conn.execute(
    `INSERT INTO invoices
       (branchId, invoiceNumber, patientId, invoiceDate, dueDate, totalAmount, paidAmount, balance,
        status, notes, createdBy, voided)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'paid', ?, ?, 0)`,
    [
      branchId,
      invNum,
      patientId,
      daysAgo(daysBack),
      daysAgo(daysBack),
      total,
      total,
      `${DEMO_TAG} Drug payment - Prescription: ${prescriptionNumber}`,
      userId,
    ],
  );
  await conn.execute(
    `INSERT INTO invoice_items
       (invoiceId, drugInventoryId, description, quantity, unitPrice, totalPrice)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      inv.insertId,
      drugInventoryId,
      `${medicationName} — ${DEMO_TAG}`,
      quantity,
      unitPrice,
      total,
    ],
  );
  return inv.insertId;
}

async function seedCompletedSubstitution(conn, {
  branchId,
  storeId,
  patientId,
  doctorId,
  pharmacistId,
  prescribedMed,
  substituteMed,
  substituteInv,
  rxNumber,
  daysBack,
  qty,
  substitutionType,
  reason,
  dosage,
  frequency,
  duration,
}) {
  const [rx] = await conn.execute(
    `INSERT INTO prescriptions
       (branchId, prescriptionNumber, patientId, doctorId, prescriptionDate, status, notes, createdBy)
     VALUES (?, ?, ?, ?, ?, 'dispensed', ?, ?)`,
    [branchId, rxNumber, patientId, doctorId, daysAgo(daysBack), `${DEMO_TAG} completed substitution`, doctorId],
  );
  const prescriptionId = rx.insertId;

  const [item] = await conn.execute(
    `INSERT INTO prescription_items
       (prescriptionId, medicationId, medicationName, dosage, frequency, duration, quantity, instructions, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dispensed')`,
    [
      prescriptionId,
      prescribedMed.medicationId,
      prescribedMed.name,
      dosage,
      frequency,
      duration,
      qty,
      `${DEMO_TAG} Prescribed line`,
    ],
  );
  const itemId = item.insertId;

  const [sub] = await conn.execute(
    `INSERT INTO prescription_item_substitutions
       (prescriptionItemId, prescriptionId, prescribedMedicationId, dispensedMedicationId,
        drugInventoryId, substitutionType, reason, status, substitutedBy, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'dispensed', ?, ?)`,
    [
      itemId,
      prescriptionId,
      prescribedMed.medicationId,
      substituteMed.medicationId,
      substituteInv.drugInventoryId,
      substitutionType,
      reason,
      pharmacistId,
      DEMO_TAG,
    ],
  );

  const dispenseNote =
    `Substituted: ${prescribedMed.name} → ${substituteMed.name} (${substitutionType}: ${reason})`;

  const [disp] = await conn.execute(
    `INSERT INTO dispensations
       (prescriptionItemId, substitutionId, storeId, dispensationDate, quantityDispensed,
        batchNumber, expiryDate, dispensedBy, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      itemId,
      sub.insertId,
      storeId,
      daysAgo(daysBack - 1),
      qty,
      substituteInv.batchNumber,
      substituteInv.expiryDate,
      pharmacistId,
      dispenseNote,
    ],
  );

  await conn.execute(
    `UPDATE prescription_item_substitutions SET dispensationId = ? WHERE substitutionId = ?`,
    [disp.insertId, sub.insertId],
  );

  await conn.execute(
    `INSERT INTO prescription_items_history
       (itemId, prescriptionId, fieldName, oldValue, newValue, changedBy, changeType, notes)
     VALUES (?, ?, 'medication_substitution', ?, ?, ?, 'update', ?)`,
    [
      itemId,
      prescriptionId,
      prescribedMed.name,
      substituteMed.name,
      pharmacistId,
      `[${substitutionType}] ${reason}`,
    ],
  );

  await conn.execute(
    `INSERT INTO prescription_items_history
       (itemId, prescriptionId, fieldName, oldValue, newValue, changedBy, changeType, notes)
     VALUES (?, ?, 'substitution_dispensed', 'active', 'dispensed', ?, 'update', ?)`,
    [itemId, prescriptionId, pharmacistId, `Dispensation #${disp.insertId}`],
  );

  await createPaidDrugInvoice(conn, {
    branchId,
    patientId,
    prescriptionNumber: rxNumber,
    drugInventoryId: substituteInv.drugInventoryId,
    medicationName: substituteMed.name,
    quantity: qty,
    unitPrice: substituteInv.sellPrice,
    daysBack,
    userId: pharmacistId,
  });

  return {
    prescriptionId,
    itemId,
    substitutionId: sub.insertId,
    dispensationId: disp.insertId,
    prescribed: prescribedMed.name,
    dispensed: substituteMed.name,
    status: 'dispensed',
  };
}

async function seedPendingSubstitution(conn, {
  branchId,
  storeId,
  patientId,
  doctorId,
  pharmacistId,
  prescribedMed,
  substituteMed,
  substituteInv,
  rxNumber,
  qty,
  substitutionType,
  reason,
}) {
  const [rx] = await conn.execute(
    `INSERT INTO prescriptions
       (branchId, prescriptionNumber, patientId, doctorId, prescriptionDate, status, notes, createdBy)
     VALUES (?, ?, ?, ?, CURDATE(), 'pending', ?, ?)`,
    [branchId, rxNumber, patientId, doctorId, `${DEMO_TAG} pending substitution`, doctorId],
  );
  const prescriptionId = rx.insertId;

  const [item] = await conn.execute(
    `INSERT INTO prescription_items
       (prescriptionId, medicationId, medicationName, dosage, frequency, duration, quantity, instructions, status)
     VALUES (?, ?, ?, '1 tab', 'TDS', '5 days', ?, ?, 'pending')`,
    [
      prescriptionId,
      prescribedMed.medicationId,
      prescribedMed.name,
      qty,
      `${DEMO_TAG} Awaiting substitute dispense`,
    ],
  );
  const itemId = item.insertId;

  const [sub] = await conn.execute(
    `INSERT INTO prescription_item_substitutions
       (prescriptionItemId, prescriptionId, prescribedMedicationId, dispensedMedicationId,
        drugInventoryId, substitutionType, reason, status, substitutedBy, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      itemId,
      prescriptionId,
      prescribedMed.medicationId,
      substituteMed.medicationId,
      substituteInv.drugInventoryId,
      substitutionType,
      reason,
      pharmacistId,
      DEMO_TAG,
    ],
  );

  await conn.execute(
    `INSERT INTO prescription_items_history
       (itemId, prescriptionId, fieldName, oldValue, newValue, changedBy, changeType, notes)
     VALUES (?, ?, 'medication_substitution', ?, ?, ?, 'update', ?)`,
    [
      itemId,
      prescriptionId,
      prescribedMed.name,
      substituteMed.name,
      pharmacistId,
      `[${substitutionType}] ${reason}`,
    ],
  );

  await createPaidDrugInvoice(conn, {
    branchId,
    patientId,
    prescriptionNumber: rxNumber,
    drugInventoryId: substituteInv.drugInventoryId,
    medicationName: substituteMed.name,
    quantity: qty,
    unitPrice: substituteInv.sellPrice,
    daysBack: 0,
    userId: pharmacistId,
  });

  const [existingQueue] = await conn.execute(
    `SELECT queueId FROM queue_entries
     WHERE patientId = ? AND servicePoint = 'pharmacy'
       AND status NOT IN ('completed', 'cancelled')`,
    [patientId],
  );
  if (!existingQueue.length) {
    const [countRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM queue_entries
       WHERE DATE(arrivalTime) = CURDATE() AND servicePoint = 'pharmacy'`,
    );
    const ticketNumber = `P-SUB-${String(Number(countRows[0].cnt) + 1).padStart(3, '0')}`;
    await conn.execute(
      `INSERT INTO queue_entries
         (patientId, ticketNumber, servicePoint, priority, status, notes, createdBy)
       VALUES (?, ?, 'pharmacy', 'normal', 'waiting', ?, ?)`,
      [patientId, ticketNumber, `Prescription: ${rxNumber} ${DEMO_TAG}`, pharmacistId],
    );
  }

  return {
    prescriptionId,
    itemId,
    substitutionId: sub.insertId,
    prescribed: prescribedMed.name,
    dispensed: substituteMed.name,
    status: 'active',
  };
}

async function main() {
  const arg = process.argv[2] || process.env.PATIENT_ID || process.env.PATIENT_NUMBER;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const patient = await resolvePatient(conn, arg);
    const branchId = patient.registeredBranchId || 1;

    const [stores] = await conn.execute(
      `SELECT storeId, storeName FROM drug_stores
       WHERE branchId = ? AND isDispensingStore = 1 AND isActive = 1
       ORDER BY storeId LIMIT 1`,
      [branchId],
    );
    const storeId = stores[0]?.storeId || 1;

    const doctorId = 1;
    const pharmacistId = 1;

    await cleanup(conn, patient.patientId);

    const amoxicillin = await findMed(conn, 'Amoxicillin');
    const amlodipine = await findMed(conn, 'Amlodipine');
    const paracetamol = await findMed(conn, 'Paracetamol');
    const ibuprofen = await findMed(conn, 'Ibuprofen');

    const azithromycin = await ensureMedication(conn, {
      code: 'MED-AZ500-DEMO',
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      form: 'Tablet',
      strength: '500mg',
      description: 'Demo substitute antibiotic',
    });

    const losartan = await ensureMedication(conn, {
      code: 'MED-LOS50-DEMO',
      name: 'Losartan 50mg',
      genericName: 'Losartan',
      form: 'Tablet',
      strength: '50mg',
      description: 'Demo substitute antihypertensive',
    });

    if (!amoxicillin || !amlodipine || !paracetamol || !ibuprofen) {
      throw new Error('Base medications missing from catalog (Amoxicillin, Amlodipine, Paracetamol, Ibuprofen)');
    }

    const azithInv = await ensureInventory(conn, {
      branchId,
      storeId,
      medicationId: azithromycin.medicationId,
      batchSuffix: 'AZITH',
      qty: 200,
      sellPrice: 35,
    });
    const losartanInv = await ensureInventory(conn, {
      branchId,
      storeId,
      medicationId: losartan.medicationId,
      batchSuffix: 'LOSART',
      qty: 150,
      sellPrice: 18,
    });
    const ibuprofenInv = await ensureInventory(conn, {
      branchId,
      storeId,
      medicationId: ibuprofen.medicationId,
      batchSuffix: 'IBUP',
      qty: 300,
      sellPrice: 12,
    });

    const completed1 = await seedCompletedSubstitution(conn, {
      branchId,
      storeId,
      patientId: patient.patientId,
      doctorId,
      pharmacistId,
      prescribedMed: amoxicillin,
      substituteMed: azithromycin,
      substituteInv: azithInv,
      rxNumber: 'RX-SUB-DEMO-1',
      daysBack: 7,
      qty: 6,
      substitutionType: 'therapeutic',
      reason: 'Penicillin allergy documented; prescriber approved macrolide alternative for URTI',
      dosage: '1 capsule',
      frequency: 'OD',
      duration: '6 days',
    });

    const completed2 = await seedCompletedSubstitution(conn, {
      branchId,
      storeId,
      patientId: patient.patientId,
      doctorId,
      pharmacistId,
      prescribedMed: amlodipine,
      substituteMed: losartan,
      substituteInv: losartanInv,
      rxNumber: 'RX-SUB-DEMO-2',
      daysBack: 14,
      qty: 30,
      substitutionType: 'stock_unavailable',
      reason: 'Amlodipine 5mg out of stock; dispensed therapeutically equivalent ARB per NCD protocol',
      dosage: '1 tablet',
      frequency: 'OD',
      duration: '30 days',
    });

    const pending = await seedPendingSubstitution(conn, {
      branchId,
      storeId,
      patientId: patient.patientId,
      doctorId,
      pharmacistId,
      prescribedMed: paracetamol,
      substituteMed: ibuprofen,
      substituteInv: ibuprofenInv,
      rxNumber: 'RX-SUB-DEMO-3',
      qty: 15,
      substitutionType: 'stock_unavailable',
      reason: 'Paracetamol 500mg batch exhausted; patient counselled on ibuprofen with food',
    });

    await conn.commit();

    console.log(JSON.stringify({
      ok: true,
      demoTag: DEMO_TAG,
      patient: {
        patientId: patient.patientId,
        patientNumber: patient.patientNumber,
        name: `${patient.firstName} ${patient.lastName}`,
      },
      storeId,
      substitutions: [completed1, completed2, pending],
      howToView: {
        dispenseDialog: `Pharmacy → dispense for patient ${patient.patientNumber} — RX-SUB-DEMO-3 shows active substitute (Paracetamol → Ibuprofen)`,
        patientProfile: `/hmis/patients/${patient.patientId} → Medications tab (dispensed lines)`,
        auditTable: 'prescription_item_substitutions + prescription_items_history',
      },
    }, null, 2));
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit(process.exitCode || 0);
  }
}

main();
