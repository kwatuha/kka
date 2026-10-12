/**
 * Seed comprehensive profile demo data for a single patient (vitals charts, NCD, labs, etc.).
 *
 * Usage:
 *   node scripts/seedPatientProfileDemo.js [patientId]
 *   PATIENT_ID=318 node scripts/seedPatientProfileDemo.js
 *
 * On VPS:
 *   docker exec kakamega_api node /app/scripts/seedPatientProfileDemo.js 318
 */
require('../config/load-env');
const pool = require('../config/db');

const DEMO_TAG = '[PATIENT-PROFILE-DEMO]';
const PATIENT_ID = Number(process.argv[2] || process.env.PATIENT_ID || 318);

function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateOnly(daysBack) {
  return daysAgo(daysBack).toISOString().slice(0, 10);
}

function dateFromNow(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function cleanup(conn, patientId) {
  const tag = `%${DEMO_TAG}%`;

  const [inv] = await conn.execute(
    `SELECT invoiceId FROM invoices WHERE patientId = ? AND notes LIKE ?`,
    [patientId, tag],
  );
  const invoiceIds = inv.map((r) => r.invoiceId);
  if (invoiceIds.length) {
    const ph = invoiceIds.map(() => '?').join(',');
    await conn.execute(`DELETE FROM invoice_items WHERE invoiceId IN (${ph})`, invoiceIds);
    await conn.execute(`DELETE FROM payments WHERE invoiceId IN (${ph})`, invoiceIds).catch(() => {});
    await conn.execute(`DELETE FROM invoices WHERE invoiceId IN (${ph})`, invoiceIds);
  }

  const [orders] = await conn.execute(
    `SELECT orderId FROM lab_test_orders WHERE patientId = ? AND notes LIKE ?`,
    [patientId, tag],
  );
  for (const o of orders) {
    const [items] = await conn.execute(
      `SELECT itemId FROM lab_test_order_items WHERE orderId = ?`,
      [o.orderId],
    );
    for (const item of items) {
      const [results] = await conn.execute(
        `SELECT resultId FROM lab_test_results WHERE orderItemId = ?`,
        [item.itemId],
      );
      for (const res of results) {
        await conn.execute(`DELETE FROM lab_result_values WHERE resultId = ?`, [res.resultId]);
        await conn.execute(`DELETE FROM lab_test_results WHERE resultId = ?`, [res.resultId]);
      }
      await conn.execute(`DELETE FROM lab_test_order_items WHERE itemId = ?`, [item.itemId]);
    }
    await conn.execute(`DELETE FROM lab_test_orders WHERE orderId = ?`, [o.orderId]);
  }

  const [radOrders] = await conn.execute(
    `SELECT orderId FROM radiology_exam_orders WHERE patientId = ? AND notes LIKE ?`,
    [patientId, tag],
  );
  for (const ro of radOrders) {
    const [exams] = await conn.execute(`SELECT examId FROM radiology_exams WHERE orderId = ?`, [ro.orderId]);
    for (const ex of exams) {
      await conn.execute(`DELETE FROM radiology_reports WHERE examId = ?`, [ex.examId]);
      await conn.execute(`DELETE FROM radiology_exams WHERE examId = ?`, [ex.examId]);
    }
    await conn.execute(`DELETE FROM radiology_exam_orders WHERE orderId = ?`, [ro.orderId]);
  }

  const [rx] = await conn.execute(
    `SELECT prescriptionId FROM prescriptions WHERE patientId = ? AND notes LIKE ?`,
    [patientId, tag],
  );
  for (const r of rx) {
    await conn.execute(`DELETE FROM prescription_items WHERE prescriptionId = ?`, [r.prescriptionId]).catch(() => {});
    await conn.execute(`DELETE FROM prescriptions WHERE prescriptionId = ?`, [r.prescriptionId]);
  }

  await conn.execute(`DELETE FROM patient_ncd_follow_ups WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]).catch(() => {});
  await conn.execute(`DELETE FROM patient_ncd_conditions WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]).catch(() => {});
  await conn.execute(`DELETE FROM vital_signs WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]);
  await conn.execute(`DELETE FROM patient_allergies WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]);
  await conn.execute(`DELETE FROM patient_family_history WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]);
  await conn.execute(`DELETE FROM medical_records WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]);
  await conn.execute(`DELETE FROM appointments WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]);
  await conn.execute(`DELETE FROM triage_assessments WHERE patientId = ? AND notes LIKE ?`, [patientId, tag]).catch(() => {});
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [patients] = await conn.execute(
      `SELECT patientId, patientNumber, firstName, lastName, registeredBranchId, voided
       FROM patients WHERE patientId = ? LIMIT 1`,
      [PATIENT_ID],
    );
    if (!patients.length || patients[0].voided) {
      throw new Error(`Patient ${PATIENT_ID} not found or voided`);
    }
    const patient = patients[0];
    const branchId = patient.registeredBranchId || 1;

    const [users] = await conn.execute(
      `SELECT u.userId FROM users u
       LEFT JOIN roles r ON u.roleId = r.roleId
       WHERE COALESCE(u.voided,0)=0
       ORDER BY CASE WHEN LOWER(COALESCE(r.roleName,'')) LIKE '%doctor%' THEN 0 ELSE 1 END, u.userId
       LIMIT 1`,
    );
    const doctorId = users[0]?.userId || 1;

    console.log(`==> Seeding profile demo for ${patient.firstName} ${patient.lastName} (#${patient.patientNumber}, id=${PATIENT_ID})`);
    await cleanup(conn, PATIENT_ID);

    await conn.execute(
      `UPDATE patients SET
         bloodGroup = 'O+',
         allergies = 'Penicillin (severe), Sulfa drugs (moderate)',
         idNumber = '28451234',
         idType = 'National ID',
         email = 'grace.nafula.uat@kakamega.hmis',
         nextOfKinName = 'David Nafula',
         nextOfKinPhone = '0718000000',
         nextOfKinRelationship = 'Spouse',
         medicalHistory = CONCAT(COALESCE(medicalHistory,''), IF(medicalHistory IS NULL OR medicalHistory='', '', ' '), ?)
       WHERE patientId = ?`,
      [`${DEMO_TAG} Hypertension and type 2 diabetes under NCD clinic follow-up.`, PATIENT_ID],
    );

    // Vitals — 12 points over ~90 days (BP + glucose trends for charts)
    const vitalSeries = [
      { days: 84, sys: 148, dia: 94, hr: 82, temp: 36.8, spo2: 97, glucose: 9.2, weight: 68.5 },
      { days: 77, sys: 142, dia: 90, hr: 80, temp: 36.7, spo2: 98, glucose: 8.8, weight: 68.2 },
      { days: 70, sys: 138, dia: 88, hr: 78, temp: 36.6, spo2: 98, glucose: 8.1, weight: 67.9 },
      { days: 63, sys: 136, dia: 86, hr: 76, temp: 36.7, spo2: 99, glucose: 7.6, weight: 67.6 },
      { days: 56, sys: 132, dia: 84, hr: 74, temp: 36.5, spo2: 98, glucose: 7.2, weight: 67.4 },
      { days: 49, sys: 130, dia: 82, hr: 72, temp: 36.6, spo2: 99, glucose: 6.9, weight: 67.1 },
      { days: 42, sys: 128, dia: 80, hr: 72, temp: 36.7, spo2: 98, glucose: 6.5, weight: 66.8 },
      { days: 35, sys: 126, dia: 79, hr: 70, temp: 36.6, spo2: 99, glucose: 6.2, weight: 66.5 },
      { days: 28, sys: 124, dia: 78, hr: 70, temp: 36.5, spo2: 98, glucose: 5.9, weight: 66.3 },
      { days: 21, sys: 122, dia: 76, hr: 68, temp: 36.6, spo2: 99, glucose: 5.6, weight: 66.0 },
      { days: 14, sys: 120, dia: 75, hr: 68, temp: 36.7, spo2: 98, glucose: 5.4, weight: 65.8 },
      { days: 7, sys: 118, dia: 74, hr: 66, temp: 36.6, spo2: 99, glucose: 5.2, weight: 65.5 },
    ];

    for (const v of vitalSeries) {
      const when = daysAgo(v.days, 9 + (v.days % 4), 15);
      await conn.execute(
        `INSERT INTO vital_signs
           (patientId, recordedDate, systolicBP, diastolicBP, heartRate, respiratoryRate, temperature,
            oxygenSaturation, weight, height, bloodGlucose, context, recordedBy, notes)
         VALUES (?, ?, ?, ?, ?, 18, ?, ?, ?, 162.0, ?, 'monitoring', ?, ?)`,
        [
          PATIENT_ID, when, v.sys, v.dia, v.hr, v.temp, v.spo2, v.weight, v.glucose, doctorId,
          `${DEMO_TAG} NCD clinic vitals`,
        ],
      );
    }

    // NCD conditions + follow-ups (HbA1c / glucose chart data)
    const [ncdRes] = await conn.execute(
      `INSERT INTO patient_ncd_conditions
         (patientId, conditionType, conditionName, diagnosisDate, icd10Code, status, riskFactors,
          treatmentPlan, targetBp, targetGlucose, smokingStatus, enrolledDate, nextReviewDate, notes, managedBy)
       VALUES (?, 'hypertension', 'Essential Hypertension', ?, 'I10', 'controlled', 'Family history, overweight',
               'Low-salt diet, daily amlodipine, monthly BP review', '<130/80', NULL, 'never', ?, ?, ?, ?)`,
      [PATIENT_ID, dateOnly(400), dateOnly(400), dateOnly(14), `${DEMO_TAG} NCD hypertension`, doctorId],
    );
    const htnNcdId = ncdRes.insertId;

    const [dmRes] = await conn.execute(
      `INSERT INTO patient_ncd_conditions
         (patientId, conditionType, conditionName, diagnosisDate, icd10Code, status, riskFactors,
          treatmentPlan, targetBp, targetGlucose, smokingStatus, enrolledDate, nextReviewDate, notes, managedBy)
       VALUES (?, 'diabetes_type_2', 'Type 2 Diabetes Mellitus', ?, 'E11', 'controlled', 'Sedentary lifestyle',
               'Metformin, dietary counselling, HbA1c every 3 months', NULL, '4.0-7.0 mmol/L fasting', 'never', ?, ?, ?, ?)`,
      [PATIENT_ID, dateOnly(380), dateOnly(380), dateOnly(14), `${DEMO_TAG} NCD diabetes`, doctorId],
    );
    const dmNcdId = dmRes.insertId;

    const ncdFollowUps = [
      { days: 84, sys: 148, dia: 94, glucose: 9.2, hba1c: 8.4, status: 'uncontrolled' },
      { days: 63, sys: 136, dia: 86, glucose: 7.6, hba1c: 7.8, status: 'improved' },
      { days: 42, sys: 128, dia: 80, glucose: 6.5, hba1c: 7.1, status: 'stable' },
      { days: 21, sys: 122, dia: 76, glucose: 5.6, hba1c: 6.6, status: 'controlled' },
      { days: 7, sys: 118, dia: 74, glucose: 5.2, hba1c: 6.3, status: 'controlled' },
    ];
    for (const f of ncdFollowUps) {
      await conn.execute(
        `INSERT INTO patient_ncd_follow_ups
           (ncdId, patientId, followUpDate, controlStatus, bpSystolic, bpDiastolic, bloodGlucose, hba1c,
            adherenceNotes, planAdjustment, nextReviewDate, notes, recordedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Good medication adherence', 'Continue current regimen', ?, ?, ?)`,
        [
          dmNcdId, PATIENT_ID, dateOnly(f.days), f.status, f.sys, f.dia, f.glucose, f.hba1c,
          dateOnly(Math.max(f.days - 30, 7)), `${DEMO_TAG} NCD follow-up`, doctorId,
        ],
      );
    }

    await conn.execute(
      `INSERT INTO patient_allergies (patientId, allergen, allergyType, severity, reaction, firstObserved, status, notes, reportedBy)
       VALUES (?, 'Penicillin', 'drug', 'severe', 'Rash and facial swelling', ?, 'active', ?, ?),
              (?, 'Sulfa drugs', 'drug', 'moderate', 'Generalized itch', ?, 'active', ?, ?)`,
      [
        PATIENT_ID, dateOnly(800), `${DEMO_TAG} allergy`, doctorId,
        PATIENT_ID, dateOnly(600), `${DEMO_TAG} allergy`, doctorId,
      ],
    );

    await conn.execute(
      `INSERT INTO patient_family_history (patientId, relation, \`condition\`, ageAtDiagnosis, status, notes, createdBy)
       VALUES (?, 'Father', 'Hypertension', 48, 'Living', ?, ?),
              (?, 'Mother', 'Type 2 Diabetes', 52, 'Living', ?, ?),
              (?, 'Sister', 'Asthma', 30, 'Living', ?, ?)`,
      [
        PATIENT_ID, `${DEMO_TAG} family history`, doctorId,
        PATIENT_ID, `${DEMO_TAG} family history`, doctorId,
        PATIENT_ID, `${DEMO_TAG} family history`, doctorId,
      ],
    );

    const visits = [
      { days: 75, complaint: 'Headache and dizziness', diagnosis: 'Uncontrolled hypertension', treatment: 'Started amlodipine 5mg OD' },
      { days: 45, complaint: 'Polyuria and thirst', diagnosis: 'Type 2 diabetes — suboptimal control', treatment: 'Metformin 500mg BD, diet advice' },
      { days: 21, complaint: 'NCD review', diagnosis: 'Hypertension and DM — improving control', treatment: 'Continue meds, repeat labs in 4 weeks' },
      { days: 3, complaint: 'Routine follow-up', diagnosis: 'Stable NCD patient', treatment: 'Continue current plan' },
    ];
    for (const visit of visits) {
      await conn.execute(
        `INSERT INTO medical_records
           (branchId, patientId, visitDate, visitType, department, chiefComplaint, diagnosis, treatment, doctorId, notes, createdBy)
         VALUES (?, ?, ?, 'Outpatient', 'NCD Clinic', ?, ?, ?, ?, ?, ?)`,
        [branchId, PATIENT_ID, dateOnly(visit.days), visit.complaint, visit.diagnosis, visit.treatment, doctorId, `${DEMO_TAG} visit`, doctorId],
      );
    }

    await conn.execute(
      `INSERT INTO appointments
         (branchId, patientId, doctorId, appointmentDate, appointmentTime, department, reason, status, notes, createdBy)
       VALUES
         (?, ?, ?, ?, '09:00:00', 'NCD Clinic', 'Quarterly diabetes review', 'completed', ?, ?),
         (?, ?, ?, ?, '10:30:00', 'Outpatient', 'BP check', 'completed', ?, ?),
         (?, ?, ?, ?, '11:00:00', 'Laboratory', 'Fasting blood sugar & HbA1c', 'completed', ?, ?),
         (?, ?, ?, ?, '09:30:00', 'NCD Clinic', 'Next NCD review', 'scheduled', ?, ?)`,
      [
        branchId, PATIENT_ID, doctorId, dateOnly(30), `${DEMO_TAG} appointment`, doctorId,
        branchId, PATIENT_ID, doctorId, dateOnly(14), `${DEMO_TAG} appointment`, doctorId,
        branchId, PATIENT_ID, doctorId, dateOnly(7), `${DEMO_TAG} appointment`, doctorId,
        branchId, PATIENT_ID, doctorId, dateFromNow(14), `${DEMO_TAG} appointment`, doctorId,
      ],
    );

    const [meds] = await conn.execute(
      `SELECT medicationId, name FROM medications WHERE COALESCE(voided,0)=0 ORDER BY medicationId LIMIT 3`,
    );
    const rxMeds = meds.length ? meds : [{ medicationId: 1, name: 'Metformin 500mg' }, { medicationId: 1, name: 'Amlodipine 5mg' }];

    const [rx1] = await conn.execute(
      `INSERT INTO prescriptions
         (branchId, prescriptionNumber, patientId, doctorId, prescriptionDate, status, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, 'dispensed', ?, ?)`,
      [branchId, `RX-${PATIENT_ID}-DEMO-1`, PATIENT_ID, doctorId, dateOnly(21), `${DEMO_TAG} prescription`, doctorId],
    );
    await conn.execute(
      `INSERT INTO prescription_items
         (prescriptionId, medicationId, medicationName, dosage, frequency, duration, quantity, instructions, status)
       VALUES (?, ?, ?, '1 tab', 'BD', '90 days', 180, 'Take with meals', 'dispensed')`,
      [rx1.insertId, rxMeds[0].medicationId, rxMeds[0].name],
    );

    const [rx2] = await conn.execute(
      `INSERT INTO prescriptions
         (branchId, prescriptionNumber, patientId, doctorId, prescriptionDate, status, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, 'dispensed', ?, ?)`,
      [branchId, `RX-${PATIENT_ID}-DEMO-2`, PATIENT_ID, doctorId, dateOnly(60), `${DEMO_TAG} prescription`, doctorId],
    );
    await conn.execute(
      `INSERT INTO prescription_items
         (prescriptionId, medicationId, medicationName, dosage, frequency, duration, quantity, instructions, status)
       VALUES (?, ?, ?, '1 tab', 'OD', '30 days', 30, 'Take in the morning', 'dispensed')`,
      [rx2.insertId, rxMeds[1]?.medicationId || rxMeds[0].medicationId, rxMeds[1]?.name || 'Amlodipine 5mg'],
    );

    const [labTypes] = await conn.execute(
      `SELECT testTypeId, testName FROM lab_test_types ORDER BY testTypeId LIMIT 2`,
    );
    const labIdRow = await conn.execute(
      `SELECT labId FROM laboratories WHERE branchId = ? AND isActive = 1 ORDER BY isDefault DESC, labId LIMIT 1`,
      [branchId],
    );
    const labId = labIdRow[0][0]?.labId || null;

    const orderNumber = `LAB-${PATIENT_ID}-DEMO-1`;
    const [labOrder] = await conn.execute(
      `INSERT INTO lab_test_orders
         (orderNumber, patientId, orderedBy, orderDate, priority, status, clinicalIndication, branchId, labId, notes)
       VALUES (?, ?, ?, ?, 'routine', 'completed', 'NCD monitoring — fasting glucose and HbA1c', ?, ?, ?)`,
      [orderNumber, PATIENT_ID, doctorId, dateOnly(7), branchId, labId, `${DEMO_TAG} lab order`],
    );
    const orderId = labOrder.insertId;
    const testTypeId = labTypes[0]?.testTypeId || 2;
    const [orderItem] = await conn.execute(
      `INSERT INTO lab_test_order_items (orderId, testTypeId, notes, status)
       VALUES (?, ?, ?, 'completed')`,
      [orderId, testTypeId, `${DEMO_TAG} lab item`],
    );
    const [labResult] = await conn.execute(
      `INSERT INTO lab_test_results (orderItemId, testDate, status, notes, performedBy)
       VALUES (?, ?, 'verified', ?, ?)`,
      [orderItem.insertId, dateOnly(6), `${DEMO_TAG} lab result`, doctorId],
    );
    const resultId = labResult.insertId;
    const labValues = [
      ['Fasting Blood Glucose', '5.2', 'mmol/L', '3.9-5.5', 'normal'],
      ['HbA1c', '6.3', '%', '4.0-6.0', 'high'],
      ['Total Cholesterol', '4.8', 'mmol/L', '<5.2', 'normal'],
    ];
    for (const [param, value, unit, range, flag] of labValues) {
      await conn.execute(
        `INSERT INTO lab_result_values (resultId, parameterName, value, unit, normalRange, flag, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [resultId, param, value, unit, range, flag, DEMO_TAG],
      );
    }

    const [examTypes] = await conn.execute(`SELECT examTypeId, examName FROM radiology_exam_types LIMIT 1`);
    if (examTypes.length) {
      const [radOrder] = await conn.execute(
        `INSERT INTO radiology_exam_orders
           (orderNumber, patientId, orderedBy, examTypeId, orderDate, bodyPart, clinicalIndication, priority, status, notes)
         VALUES (?, ?, ?, ?, ?, 'Abdomen', 'Rule out secondary causes of uncontrolled BP', 'routine', 'completed', ?)`,
        [`RAD-${PATIENT_ID}-DEMO-1`, PATIENT_ID, doctorId, examTypes[0].examTypeId, dateOnly(40), `${DEMO_TAG} radiology`],
      );
      const [exam] = await conn.execute(
        `INSERT INTO radiology_exams (orderId, examDate, performedBy, status, notes)
         VALUES (?, ?, ?, 'completed', ?)`,
        [radOrder.insertId, dateOnly(39), doctorId, DEMO_TAG],
      );
      await conn.execute(
        `INSERT INTO radiology_reports (examId, reportDate, findings, impression, recommendations, reportedBy, status)
         VALUES (?, ?, ?, ?, ?, ?, 'final')`,
        [
          exam.insertId, dateOnly(39),
          'Liver, spleen and kidneys normal in size and echotexture. No focal lesions.',
          'Normal abdominal ultrasound.',
          'No further imaging required at this time.',
          doctorId,
        ],
      );
    }

    const [charges] = await conn.execute(
      `SELECT chargeId, name, cost FROM service_charges WHERE status = 'Active' ORDER BY chargeId LIMIT 2`,
    );
    const charge = charges[0] || { chargeId: 1, name: 'Consultation', cost: 500 };
    const [pms] = await conn.execute(`SELECT methodId FROM payment_methods WHERE isActive = 1 LIMIT 1`);
    const paymentMethodId = pms[0]?.methodId || 1;

    const invoices = [
      { days: 21, amount: 500, paid: 500, status: 'paid' },
      { days: 7, amount: 1200, paid: 600, status: 'partial' },
    ];
    for (let i = 0; i < invoices.length; i += 1) {
      const inv = invoices[i];
      const invNum = `INV-${PATIENT_ID}-DEMO-${i + 1}`;
      const [ir] = await conn.execute(
        `INSERT INTO invoices
           (branchId, invoiceNumber, patientId, invoiceDate, dueDate, totalAmount, paidAmount, balance, status, notes, createdBy, voided)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
        [
          branchId, invNum, PATIENT_ID, dateOnly(inv.days), dateOnly(inv.days),
          inv.amount, inv.paid, inv.amount - inv.paid, inv.status, `${DEMO_TAG} invoice`,
        ],
      );
      await conn.execute(
        `INSERT INTO invoice_items (invoiceId, chargeId, description, quantity, unitPrice, totalPrice)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [ir.insertId, charge.chargeId, charge.name, inv.amount, inv.amount],
      );
      if (inv.paid > 0) {
        await conn.execute(
          `INSERT INTO payments (branchId, invoiceId, paymentMethodId, paymentDate, amount, referenceNumber, receivedBy, notes)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [branchId, ir.insertId, paymentMethodId, dateOnly(inv.days), inv.paid, `PAY-${PATIENT_ID}-${i + 1}`, `${DEMO_TAG} payment`],
        ).catch(() => {});
      }
    }

    await conn.commit();
    console.log(JSON.stringify({
      ok: true,
      patientId: PATIENT_ID,
      patientNumber: patient.patientNumber,
      demoTag: DEMO_TAG,
      seeded: {
        vitals: vitalSeries.length,
        ncdConditions: 2,
        ncdFollowUps: ncdFollowUps.length,
        allergies: 2,
        familyHistory: 3,
        medicalRecords: visits.length,
        appointments: 4,
        prescriptions: 2,
        labOrders: 1,
        radiology: examTypes.length ? 1 : 0,
        invoices: invoices.length,
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
