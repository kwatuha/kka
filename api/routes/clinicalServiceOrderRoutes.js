/**
 * Allied health / specialist service orders (DHA CPOE 12.4 partial).
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auditFromRequest } = require('../lib/auditLog');
const { enqueueOutboxEvent } = require('../lib/integrationOutbox');

const ORDER_TYPES = ['physiotherapy', 'nutrition', 'social_work', 'counselling'];
const STATUSES = ['ordered', 'in_progress', 'completed', 'cancelled'];

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

router.get('/', async (req, res) => {
  try {
    const patientId = req.query.patientId ? Number(req.query.patientId) : null;
    const orderType = req.query.orderType ? String(req.query.orderType) : null;
    let sql = `
      SELECT o.*, u.firstName AS orderedByFirstName, u.lastName AS orderedByLastName
      FROM clinical_service_orders o
      LEFT JOIN users u ON u.userId = o.orderedBy
      WHERE 1=1`;
    const params = [];
    if (patientId) {
      sql += ' AND o.patientId = ?';
      params.push(patientId);
    }
    if (orderType && ORDER_TYPES.includes(orderType)) {
      sql += ' AND o.orderType = ?';
      params.push(orderType);
    }
    sql += ' ORDER BY o.orderDate DESC, o.orderId DESC LIMIT 200';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('clinical service orders list:', err);
    res.status(500).json({ message: 'Failed to load orders', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      medicalRecordId,
      orderType,
      orderDate,
      priority,
      clinicalIndication,
      notes,
      status,
    } = req.body || {};
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!ORDER_TYPES.includes(String(orderType))) {
      return res.status(400).json({ message: `orderType must be one of ${ORDER_TYPES.join(', ')}` });
    }
    const st = STATUSES.includes(status) ? status : 'ordered';
    const userId = getUserId(req);
    const [result] = await pool.execute(
      `INSERT INTO clinical_service_orders (
        patientId, medicalRecordId, orderType, status, orderDate, priority,
        clinicalIndication, notes, orderedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(patientId),
        medicalRecordId != null ? Number(medicalRecordId) : null,
        orderType,
        st,
        orderDate || new Date().toISOString().slice(0, 10),
        priority || 'routine',
        clinicalIndication || null,
        notes || null,
        userId,
      ]
    );
    await auditFromRequest(req, {
      action: 'CREATE',
      resourceType: 'clinical_service_order',
      resourceId: String(result.insertId),
      patientId: Number(patientId),
      summary: `${orderType} order placed`,
    });
    try {
      await enqueueOutboxEvent(pool, {
        eventType: 'cpoe.allied.order',
        aggregateType: 'clinical_service_order',
        aggregateId: result.insertId,
        payload: {
          orderId: result.insertId,
          patientId: Number(patientId),
          orderType,
          status: st,
          priority: priority || 'routine',
        },
      });
    } catch (outboxErr) {
      console.warn('[clinical-service-orders] outbox skipped:', outboxErr.message || outboxErr);
    }
    const [rows] = await pool.execute('SELECT * FROM clinical_service_orders WHERE orderId = ?', [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('clinical service order create:', err);
    res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status, notes, clinicalIndication } = req.body || {};
    const [existing] = await pool.execute(
      'SELECT * FROM clinical_service_orders WHERE orderId = ? LIMIT 1',
      [orderId]
    );
    if (!existing[0]) return res.status(404).json({ message: 'Order not found' });
    const st = STATUSES.includes(status) ? status : existing[0].status;
    const completedAt = st === 'completed' ? new Date() : existing[0].completedAt;
    await pool.execute(
      `UPDATE clinical_service_orders SET
        status = ?, notes = COALESCE(?, notes), clinicalIndication = COALESCE(?, clinicalIndication),
        completedAt = ?
       WHERE orderId = ?`,
      [st, notes ?? null, clinicalIndication ?? null, completedAt, orderId]
    );
    await auditFromRequest(req, {
      action: 'UPDATE',
      resourceType: 'clinical_service_order',
      resourceId: String(orderId),
      patientId: existing[0].patientId,
      summary: `Status → ${st}`,
    });
    if (st === 'completed' && existing[0].status !== 'completed') {
      try {
        await enqueueOutboxEvent(pool, {
          eventType: 'cpoe.allied.completed',
          aggregateType: 'clinical_service_order',
          aggregateId: orderId,
          payload: {
            orderId,
            patientId: existing[0].patientId,
            orderType: existing[0].orderType,
            status: st,
          },
        });
      } catch (outboxErr) {
        console.warn('[clinical-service-orders] outbox skipped:', outboxErr.message || outboxErr);
      }
    }
    const [rows] = await pool.execute('SELECT * FROM clinical_service_orders WHERE orderId = ?', [
      orderId,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error('clinical service order update:', err);
    res.status(500).json({ message: 'Failed to update order', error: err.message });
  }
});

module.exports = router;
