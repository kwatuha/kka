/**
 * M-Pesa STK Push routes (Cloudsasa) — mounted at /api/billing/mpesa
 */
const express = require('express');
const router = express.Router();
const {
  ensureTables,
  isMpesaConfigured,
  resolveMpesaProvider,
  getMpesaProviderInfo,
  getCallbackUrl,
  normalizeKenyaPhone,
  initiateStkPush,
  createPendingSession,
  getSessionByCheckoutId,
  parseAllocations,
  markSessionFromCallback,
  applySuccessfulSession,
} = require('../lib/mpesaStk');
const pool = require('../config/db');
const {
  ensureSettingsTable,
  loadSettings,
  updateSettings,
  buildAccountReference,
  isAdminUser,
} = require('../lib/billingMpesaSettings');
const { resolveStkPaybillNumber, getDarajaEnv } = require('../lib/mpesaDaraja');
const {
  isSandboxSimulateEnabled,
  scheduleSandboxSuccessCallback,
} = require('../lib/mpesaSandboxSimulate');

router.use(async (_req, _res, next) => {
  try {
    await ensureTables();
    await ensureSettingsTable();
    next();
  } catch (err) {
    next(err);
  }
});

async function buildPaymentContext(patientId, allocs) {
  const primary = allocs[0] || {};
  let invoiceNumber = primary.invoiceNumber || null;
  let patientNumber = null;
  if (primary.invoiceId && !invoiceNumber) {
    const [invRows] = await pool.execute(
      `SELECT invoiceNumber FROM invoices WHERE invoiceId = ? LIMIT 1`,
      [Number(primary.invoiceId)]
    );
    invoiceNumber = invRows[0]?.invoiceNumber || null;
  }
  const pid = patientId ? Number(patientId) : null;
  if (pid) {
    const [pRows] = await pool.execute(
      `SELECT patientNumber FROM patients WHERE patientId = ? LIMIT 1`,
      [pid]
    );
    patientNumber = pRows[0]?.patientNumber || null;
  }
  return {
    invoiceNumber,
    invoiceId: primary.invoiceId ? Number(primary.invoiceId) : null,
    patientNumber,
    patientId: pid,
  };
}

/**
 * GET /api/billing/mpesa/config
 * STK readiness + hospital paybill/account (no API secrets).
 */
router.get('/config', async (req, res) => {
  try {
    const settings = await loadSettings();
    const ctx = req.query?.invoiceNumber
      ? {
          invoiceNumber: String(req.query.invoiceNumber),
          patientNumber: req.query.patientNumber ? String(req.query.patientNumber) : undefined,
          patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        }
      : {};
    const accountReferenceExample = buildAccountReference(settings, ctx);
    const providerInfo = getMpesaProviderInfo();
    const stkPaybill =
      providerInfo.provider === 'daraja'
        ? resolveStkPaybillNumber(settings.paybillNumber)
        : settings.paybillNumber;
    res.json({
      configured: isMpesaConfigured(),
      provider: providerInfo.provider,
      mpesaEnv: providerInfo.provider === 'daraja' ? getDarajaEnv() : undefined,
      callbackConfigured: Boolean(getCallbackUrl() && /^https:\/\//i.test(getCallbackUrl())),
      stkEnabled: settings.stkEnabled,
      showPaybillInstructions: settings.showPaybillInstructions,
      paybillNumber: settings.paybillNumber,
      stkPaybillNumber: stkPaybill,
      sandboxStkNote:
        providerInfo.provider === 'daraja' && getDarajaEnv() === 'sandbox'
          ? isSandboxSimulateEnabled()
            ? 'Sandbox mode: use M-Pesa phone 0708374149. No PIN on your phone — payment will auto-complete in a few seconds for testing (UAT).'
            : 'Sandbox: use 0708374149 in the M-Pesa phone field. There is no PIN on your phone (virtual line); Safaricom usually returns timeout 1037 unless MPESA_SANDBOX_SIMULATE_CALLBACK=1 on the server or you use production Go Live with your real number.'
          : undefined,
      accountPrefix: settings.accountPrefix,
      accountReferenceMode: settings.accountReferenceMode,
      accountReferenceExample,
    });
  } catch (err) {
    console.error('[mpesa] config error:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

/**
 * GET /api/billing/mpesa/settings — full row for admins
 */
router.get('/settings', async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }
    const settings = await loadSettings();
    res.json({
      ...settings,
      stkConfigured: isMpesaConfigured(),
      callbackConfigured: Boolean(getCallbackUrl() && /^https:\/\//i.test(getCallbackUrl())),
    });
  } catch (err) {
    console.error('[mpesa] settings get:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

/**
 * PUT /api/billing/mpesa/settings — update paybill / account prefix (admin)
 */
router.put('/settings', async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }
    const updated = await updateSettings(req.body || {}, req.user?.id || req.user?.userId || null);
    res.json({
      ...updated,
      stkConfigured: isMpesaConfigured(),
      callbackConfigured: Boolean(getCallbackUrl() && /^https:\/\//i.test(getCallbackUrl())),
    });
  } catch (err) {
    const status =
      err.code === 'invalid_paybill' || err.code === 'invalid_prefix' || err.code === 'invalid_mode'
        ? 400
        : err.code === 'empty_update'
          ? 400
          : 500;
    res.status(status).json({ error: err.code || 'update_failed', message: err.message });
  }
});

/**
 * GET /api/billing/mpesa/register — M-Pesa STK payment register (reconciliation)
 */
router.get('/register', async (req, res) => {
  try {
    const { status, patientId, from, to, page = '1', limit = '50' } = req.query || {};
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const lim = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * lim;

    let query = `SELECT m.stkPaymentId, m.checkoutRequestId, m.status, m.amount, m.phone, m.paybillNumber,
                        m.accountReference, m.patientId, m.mpesaReceiptNumber, m.resultDesc, m.appliedAt,
                        m.createdAt, m.updatedAt,
                        p.patientNumber, p.firstName AS patientFirstName, p.lastName AS patientLastName
                 FROM mpesa_stk_payments m
                 LEFT JOIN patients p ON p.patientId = m.patientId
                 WHERE 1=1`;
    const params = [];
    if (status) {
      query += ` AND m.status = ?`;
      params.push(String(status));
    }
    if (patientId) {
      query += ` AND m.patientId = ?`;
      params.push(Number(patientId));
    }
    if (from) {
      query += ` AND DATE(m.createdAt) >= ?`;
      params.push(String(from).slice(0, 10));
    }
    if (to) {
      query += ` AND DATE(m.createdAt) <= ?`;
      params.push(String(to).slice(0, 10));
    }
    query += ` ORDER BY m.createdAt DESC LIMIT ${lim} OFFSET ${offset}`;

    const [rows] = await pool.execute(query, params);
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM mpesa_stk_payments WHERE 1=1` +
        (status ? ` AND status = ?` : '') +
        (patientId ? ` AND patientId = ?` : '') +
        (from ? ` AND DATE(createdAt) >= ?` : '') +
        (to ? ` AND DATE(createdAt) <= ?` : ''),
      [
        ...(status ? [String(status)] : []),
        ...(patientId ? [Number(patientId)] : []),
        ...(from ? [String(from).slice(0, 10)] : []),
        ...(to ? [String(to).slice(0, 10)] : []),
      ]
    );

    res.json({
      page: pageNum,
      limit: lim,
      total: Number(countRows[0]?.total || 0),
      items: rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    });
  } catch (err) {
    console.error('[mpesa] register error:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

/**
 * POST /api/billing/mpesa/stk-push
 * Body: { amount, phone, patientId?, allocations: [{ invoiceId, amount }], batchReceiptNumber? }
 */
router.post('/stk-push', async (req, res) => {
  try {
    const mpesaSettings = await loadSettings();
    if (!mpesaSettings.stkEnabled) {
      return res.status(503).json({
        error: 'stk_disabled',
        message: 'M-Pesa STK is disabled in billing settings. Use Paybill instructions or enable STK.',
        paybillNumber: mpesaSettings.paybillNumber,
        accountPrefix: mpesaSettings.accountPrefix,
      });
    }

    if (!isMpesaConfigured()) {
      return res.status(503).json({
        error: 'mpesa_not_configured',
        message:
          'M-Pesa STK is not configured. Set CLOUD_SASA_CLIENT_ID and CLOUD_SASA_CLIENT_SECRET on the API server.',
        paybillNumber: mpesaSettings.paybillNumber,
        accountPrefix: mpesaSettings.accountPrefix,
      });
    }

    const { phone, patientId, allocations, batchReceiptNumber } = req.body || {};
    let amount = Number(req.body?.amount);

    const allocs = Array.isArray(allocations) ? allocations : [];
    if (allocs.length) {
      const sum = allocs.reduce((s, a) => s + Number(a.amount || 0), 0);
      if (!amount || amount <= 0) amount = sum;
      if (Math.abs(sum - amount) > 0.05) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Amount must match the sum of invoice allocations.',
        });
      }
    }

    if (!(amount > 0)) {
      return res.status(400).json({ error: 'invalid_request', message: 'amount is required' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'invalid_request', message: 'phone is required' });
    }
    if (!allocs.length) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'allocations is required (list of { invoiceId, amount })',
      });
    }

    // Validate invoices still have enough balance
    for (const a of allocs) {
      const invoiceId = Number(a.invoiceId);
      const payAmt = Number(a.amount);
      if (!invoiceId || !(payAmt > 0)) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Each allocation needs invoiceId and amount > 0',
        });
      }
      const [rows] = await pool.execute(
        `SELECT invoiceId, totalAmount, paidAmount, status FROM invoices WHERE invoiceId = ?`,
        [invoiceId]
      );
      if (!rows.length) {
        return res.status(404).json({ error: 'not_found', message: `Invoice ${invoiceId} not found` });
      }
      const inv = rows[0];
      if (String(inv.status).toLowerCase() === 'cancelled') {
        return res.status(400).json({
          error: 'invalid_request',
          message: `Invoice ${invoiceId} is cancelled`,
        });
      }
      const balance = Number(inv.totalAmount) - Number(inv.paidAmount || 0);
      if (payAmt > balance + 0.01) {
        return res.status(400).json({
          error: 'invalid_request',
          message: `Payment for invoice ${invoiceId} exceeds balance (${balance})`,
        });
      }
    }

    const payCtx = await buildPaymentContext(patientId, allocs);
    const accountReference = buildAccountReference(mpesaSettings, payCtx);

    const stkPaybill = resolveStkPaybillNumber(mpesaSettings.paybillNumber);

    const stk = await initiateStkPush({
      amount,
      phone,
      paybillNumber: stkPaybill,
      accountReference,
    });

    await createPendingSession({
      checkoutRequestId: stk.checkoutRequestId,
      amount: stk.amount,
      phone: stk.phone,
      paybillNumber: stkPaybill,
      accountReference,
      patientId: patientId ? Number(patientId) : null,
      allocations: allocs.map((a) => ({
        invoiceId: Number(a.invoiceId),
        amount: Number(a.amount),
        invoiceNumber: a.invoiceNumber || null,
      })),
      batchReceiptNumber: batchReceiptNumber || null,
      initiatedByUserId: req.user?.id || req.user?.userId || null,
      rawInitiate: stk.raw,
    });

    scheduleSandboxSuccessCallback({
      checkoutRequestId: stk.checkoutRequestId,
      merchantRequestId: stk.merchantRequestId || stk.raw?.MerchantRequestID,
      amount: stk.amount,
      phone254: stk.phone,
      markSessionFromCallback,
      applySuccessfulSession,
    });

    return res.status(200).json({
      success: true,
      checkoutRequest_id: stk.checkoutRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      message: stk.message,
      status: 'pending',
      amount: stk.amount,
      phone: stk.phone,
      paybillNumber: mpesaSettings.paybillNumber,
      accountReference,
    });
  } catch (err) {
    console.error('[mpesa] stk-push error:', err.message || err);
    const status =
      err.code === 'mpesa_not_configured'
        ? 503
        : err.code === 'invalid_phone' || err.code === 'invalid_amount' || err.code === 'invalid_callback'
          ? 400
          : err.status || 502;
    return res.status(status).json({
      error: err.code || 'stk_push_failed',
      message: err.message || 'Failed to initiate payment',
      details: err.details || undefined,
    });
  }
});

/**
 * GET /api/billing/mpesa/stk-status/:checkoutRequestId
 */
router.get('/stk-status/:checkoutRequestId', async (req, res) => {
  try {
    const id = String(req.params.checkoutRequestId || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'invalid_request', message: 'checkoutRequestId required' });
    }
    const session = await getSessionByCheckoutId(id);
    if (!session) {
      return res.status(404).json({ error: 'not_found', message: 'STK session not found' });
    }
    return res.json({
      checkoutRequestId: session.checkoutRequestId,
      status: session.status,
      amount: Number(session.amount),
      phone: session.phone,
      mpesaReceiptNumber: session.mpesaReceiptNumber,
      resultCode: session.resultCode,
      resultDesc: session.resultDesc,
      appliedAt: session.appliedAt,
      allocations: parseAllocations(session),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    console.error('[mpesa] stk-status error:', err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

/**
 * POST /api/billing/mpesa/callback
 * Public — Cloudsasa forwards the Safaricom STK callback body here.
 */
router.post('/callback', async (req, res) => {
  // Acknowledge immediately
  res.status(200).json({ received: true });

  try {
    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) {
      console.warn('[mpesa] callback missing Body.stkCallback');
      return;
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    if (!checkoutRequestId) {
      console.warn('[mpesa] callback missing CheckoutRequestID');
      return;
    }

    const update = await markSessionFromCallback(String(checkoutRequestId), req.body);
    console.log(
      `[mpesa] callback ${checkoutRequestId}: status=${update.status} code=${update.resultCode} desc=${update.resultDesc || ''}`
    );

    if (update.status === 'success') {
      try {
        const applied = await applySuccessfulSession(String(checkoutRequestId));
        console.log(`[mpesa] apply ${checkoutRequestId}:`, applied.reason || 'ok', applied.results || '');
      } catch (applyErr) {
        console.error('[mpesa] apply payment failed:', applyErr.message || applyErr);
      }
    }
  } catch (err) {
    console.error('[mpesa] callback handler error:', err);
  }
});

/**
 * POST /api/billing/mpesa/finalize/:checkoutRequestId
 * Idempotent re-apply if callback succeeded but invoice update failed.
 */
router.post('/finalize/:checkoutRequestId', async (req, res) => {
  try {
    const id = String(req.params.checkoutRequestId || '').trim();
    const session = await getSessionByCheckoutId(id);
    if (!session) {
      return res.status(404).json({ error: 'not_found', message: 'STK session not found' });
    }
    if (session.status !== 'success' && session.status !== 'applied') {
      return res.status(400).json({
        error: 'not_ready',
        message: `Payment is ${session.status}`,
        status: session.status,
        resultDesc: session.resultDesc,
      });
    }
    const applied = await applySuccessfulSession(id);
    return res.json({ ok: true, ...applied });
  } catch (err) {
    console.error('[mpesa] finalize error:', err);
    return res.status(500).json({
      error: 'apply_failed',
      message: err.message || 'Failed to apply M-Pesa payment',
    });
  }
});

/** Dev helper: normalize phone display */
router.post('/normalize-phone', (req, res) => {
  const normalized = normalizeKenyaPhone(req.body?.phone);
  if (!normalized) {
    return res.status(400).json({ ok: false, message: 'Invalid phone' });
  }
  return res.json({ ok: true, phone: normalized });
});

module.exports = router;
