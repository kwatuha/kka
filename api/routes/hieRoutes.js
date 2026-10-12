const express = require('express');
const router = express.Router();
const {
  receiveInbound,
  listInboundReceipts,
  buildSampleInboundBundle,
} = require('../lib/hieInbound');

router.post('/hie/inbound', async (req, res) => {
  try {
    const result = await receiveInbound(null, req, req.body);
    res.status(202).json(result);
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ message: err.message || 'Inbound failed' });
  }
});

router.post('/hie/inbound/sample', async (req, res) => {
  try {
    const payload = buildSampleInboundBundle();
    const result = await receiveInbound(null, req, payload);
    res.status(202).json({ sample: true, bundleId: payload.id, ...result });
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ message: err.message || 'Sample inbound failed' });
  }
});

router.get('/hie/inbound/sample', (_req, res) => {
  res.json(buildSampleInboundBundle());
});

router.get('/hie/inbound', async (req, res) => {
  try {
    const receipts = await listInboundReceipts(null, req.query.limit);
    res.json({ receipts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
