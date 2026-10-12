/**
 * IHR-oriented public health event catalog (stub until national IHR spec is wired).
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/authenticate');
const {
  declareIhrEvent,
  listIhrDeclarations,
  ensureIhrDeclarationTables,
} = require('../lib/ihrDeclarations');

router.use(authenticate);

router.use(async (_req, _res, next) => {
  try {
    await ensureIhrDeclarationTables();
    next();
  } catch (err) {
    next(err);
  }
});

router.get('/catalog', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT eventCode, title, description, ihrCategory, idsrDiseaseCode, sortOrder
       FROM ihr_event_catalog WHERE active = 1 ORDER BY sortOrder ASC, eventCode ASC`
    );
    res.json({ events: rows });
  } catch (err) {
    console.error('IHR catalog:', err);
    res.status(500).json({ error: err.message || 'Could not load IHR catalog' });
  }
});

router.get('/links', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const [rows] = await pool.execute(
      `SELECT l.linkId, l.idsrAlertId, l.eventCode, l.notes, l.createdAt,
              c.title AS eventTitle, a.diseaseCode, a.status AS alertStatus
       FROM ihr_idsr_links l
       JOIN ihr_event_catalog c ON c.eventCode = l.eventCode
       LEFT JOIN idsr_alerts a ON a.alertId = l.idsrAlertId
       ORDER BY l.linkId DESC
       LIMIT ${limit}`
    );
    res.json({ links: rows });
  } catch (err) {
    console.error('IHR links:', err);
    res.status(500).json({ error: err.message || 'Could not load IHR links' });
  }
});

router.post('/link-alert', async (req, res) => {
  try {
    const idsrAlertId = Number(req.body?.idsrAlertId);
    const eventCode = String(req.body?.eventCode || '').trim();
    const notes = String(req.body?.notes || '').trim().slice(0, 500);
    if (!idsrAlertId || !eventCode) {
      return res.status(400).json({ error: 'idsrAlertId and eventCode are required' });
    }
    const [cat] = await pool.execute(
      'SELECT eventCode FROM ihr_event_catalog WHERE eventCode = ? AND active = 1 LIMIT 1',
      [eventCode]
    );
    if (!cat.length) return res.status(404).json({ error: 'Unknown IHR event code' });
    const [result] = await pool.execute(
      `INSERT INTO ihr_idsr_links (idsrAlertId, eventCode, notes) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE notes = VALUES(notes), createdAt = CURRENT_TIMESTAMP`,
      [idsrAlertId, eventCode, notes || null]
    );
    res.status(201).json({
      linkId: result.insertId,
      idsrAlertId,
      eventCode,
      notes: notes || null,
    });
  } catch (err) {
    console.error('IHR link-alert:', err);
    res.status(500).json({ error: err.message || 'Could not link IHR event' });
  }
});

router.get('/declarations', async (req, res) => {
  try {
    const declarations = await listIhrDeclarations(req.query.limit);
    res.json({ declarations });
  } catch (err) {
    console.error('IHR declarations:', err);
    res.status(500).json({ error: err.message || 'Could not load IHR declarations' });
  }
});

router.post('/declare-event', async (req, res) => {
  try {
    const result = await declareIhrEvent({
      eventCode: req.body?.eventCode,
      idsrAlertId: req.body?.idsrAlertId,
      title: req.body?.title,
      summary: req.body?.summary,
      declaredBy: req.user?.id || req.user?.userId,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('IHR declare-event:', err);
    res.status(err.status || 500).json({ error: err.message || 'Could not declare IHR event' });
  }
});

module.exports = router;
