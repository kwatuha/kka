/**
 * Daraja sandbox: virtual MSISDN 254708374149 cannot enter a PIN — Safaricom returns 1037 (timeout).
 * When MPESA_SANDBOX_SIMULATE_CALLBACK=1 and MPESA_ENV=sandbox, inject a success callback for UAT only.
 */
const { getDarajaEnv } = require('./mpesaDaraja');

function isSandboxSimulateEnabled() {
  if (getDarajaEnv() !== 'sandbox') return false;
  return String(process.env.MPESA_SANDBOX_SIMULATE_CALLBACK || '') === '1';
}

function buildSandboxSuccessCallback({
  checkoutRequestId,
  merchantRequestId,
  amount,
  phone254,
}) {
  const kes = Math.round(Number(amount) || 1);
  const receipt = `SBX${Date.now().toString().slice(-8)}`;
  const txDate = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);

  return {
    Body: {
      stkCallback: {
        MerchantRequestID: merchantRequestId || `SANDBOX-MR-${Date.now()}`,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully. (sandbox simulate)',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: kes },
            { Name: 'MpesaReceiptNumber', Value: receipt },
            { Name: 'TransactionDate', Value: txDate },
            { Name: 'PhoneNumber', Value: Number(phone254) || phone254 },
          ],
        },
      },
    },
  };
}

/**
 * Fire success callback after STK accept (before Safaricom 1037 timeout).
 */
function scheduleSandboxSuccessCallback({
  checkoutRequestId,
  merchantRequestId,
  amount,
  phone254,
  markSessionFromCallback,
  applySuccessfulSession,
}) {
  if (!isSandboxSimulateEnabled()) return;

  const delayMs = Number(process.env.MPESA_SANDBOX_SIMULATE_DELAY_MS || 4000);
  setTimeout(async () => {
    try {
      const payload = buildSandboxSuccessCallback({
        checkoutRequestId,
        merchantRequestId,
        amount,
        phone254,
      });
      const update = await markSessionFromCallback(checkoutRequestId, payload);
      console.log(
        `[mpesa] sandbox simulate ${checkoutRequestId}: status=${update.status} affected=${update.affected}`
      );
      if (update.status === 'success') {
        await applySuccessfulSession(checkoutRequestId);
        console.log(`[mpesa] sandbox simulate applied payments for ${checkoutRequestId}`);
      }
    } catch (err) {
      console.error('[mpesa] sandbox simulate error:', err.message || err);
    }
  }, delayMs).unref?.();
}

module.exports = {
  isSandboxSimulateEnabled,
  buildSandboxSuccessCallback,
  scheduleSandboxSuccessCallback,
};
