/**
 * KRA eTIMS admin settings — mounted at /api/billing/etims
 */
const express = require('express');
const {
  loadSettings,
  updateSettings,
  toAdminResponse,
  isAdminUser,
} = require('../lib/billingEtimsSettings');

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }
    const internal = await loadSettings();
    res.json(toAdminResponse(internal));
  } catch (err) {
    console.error('[etims] settings get:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }
    const updated = await updateSettings(req.body || {}, req.user?.id || req.user?.userId || null);
    res.json(toAdminResponse(updated));
  } catch (err) {
    const clientCodes = ['invalid_mode', 'invalid_environment', 'empty_update'];
    const status = clientCodes.includes(err.code) ? 400 : 500;
    console.error('[etims] settings put:', err);
    res.status(status).json({ error: err.code || 'update_failed', message: err.message });
  }
});

module.exports = router;
