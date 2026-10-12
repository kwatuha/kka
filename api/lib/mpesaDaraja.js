/**
 * Safaricom Daraja — Lipa na M-Pesa Online (STK Push) for Paybill.
 * https://developer.safaricom.co.ke/
 */
const crypto = require('crypto');

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

let tokenCache = { accessToken: null, expiresAtMs: 0 };

function getDarajaEnv() {
  const env = String(process.env.MPESA_ENV || process.env.MPESA_DARAJA_ENV || 'sandbox')
    .trim()
    .toLowerCase();
  return env === 'production' || env === 'live' ? 'production' : 'sandbox';
}

/**
 * Daraja sandbox only accepts the sandbox paybill (e.g. 174379), not hospital Go-Live paybill.
 * Admin UI may still show 1269093 for staff instructions.
 */
function resolveStkPaybillNumber(adminPaybillNumber) {
  const admin = String(adminPaybillNumber || '').replace(/\D/g, '');
  if (getDarajaEnv() === 'sandbox') {
    const sandbox = String(process.env.MPESA_DARAJA_SHORTCODE || '174379').replace(/\D/g, '');
    return sandbox || '174379';
  }
  return admin || String(process.env.MPESA_DARAJA_SHORTCODE || '').replace(/\D/g, '');
}

function getBaseUrl() {
  const override = (process.env.MPESA_DARAJA_BASE_URL || '').trim().replace(/\/$/, '');
  if (override) return override;
  return getDarajaEnv() === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

function getDarajaCredentials() {
  const consumerKey = String(
    process.env.MPESA_DARAJA_CONSUMER_KEY ||
      process.env.DARAJA_CONSUMER_KEY ||
      ''
  ).trim();
  const consumerSecret = String(
    process.env.MPESA_DARAJA_CONSUMER_SECRET ||
      process.env.DARAJA_CONSUMER_SECRET ||
      ''
  ).trim();
  const passkey = String(
    process.env.MPESA_DARAJA_PASSKEY || process.env.MPESA_PASSKEY || process.env.DARAJA_PASSKEY || ''
  ).trim();
  const shortcode = String(
    process.env.MPESA_DARAJA_SHORTCODE ||
      process.env.MPESA_SHORTCODE ||
      process.env.MPESA_PAYBILL ||
      ''
  )
    .replace(/\D/g, '')
    .trim();

  return { consumerKey, consumerSecret, passkey, shortcode };
}

function isDarajaConfigured() {
  const { consumerKey, consumerSecret, passkey } = getDarajaCredentials();
  return Boolean(consumerKey && consumerSecret && passkey);
}

/** yyyyMMddHHmmss in Africa/Nairobi */
function darajaTimestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

function buildStkPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`, 'utf8').toString('base64');
}

async function getAccessToken() {
  const { consumerKey, consumerSecret } = getDarajaCredentials();
  if (!consumerKey || !consumerSecret) {
    const err = new Error('Daraja consumer key/secret missing');
    err.code = 'mpesa_not_configured';
    throw err;
  }

  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.accessToken;
  }

  const basic = Buffer.from(`${consumerKey}:${consumerSecret}`, 'utf8').toString('base64');
  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      data?.errorMessage || data?.error || `Daraja OAuth failed (HTTP ${res.status})`
    );
    err.code = 'daraja_oauth_failed';
    err.status = res.status;
    err.details = data;
    throw err;
  }

  const accessToken = data?.access_token;
  const expiresIn = Number(data?.expires_in || 3599);
  if (!accessToken) {
    const err = new Error('Daraja OAuth response missing access_token');
    err.code = 'daraja_oauth_failed';
    err.details = data;
    throw err;
  }

  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + Math.max(60, expiresIn) * 1000,
  };
  return accessToken;
}

/**
 * @param {{ amount: number, phone254: string, callbackUrl: string, accountReference?: string, paybillNumber?: string }} params
 */
async function initiateDarajaStkPush({ amount, phone254, callbackUrl, accountReference, paybillNumber }) {
  const creds = getDarajaCredentials();
  const shortcode = String(paybillNumber || creds.shortcode).replace(/\D/g, '');
  if (!shortcode) {
    const err = new Error('Paybill shortcode missing. Set MPESA_DARAJA_SHORTCODE or hospital Paybill in admin.');
    err.code = 'invalid_shortcode';
    throw err;
  }

  const kes = Math.round(Number(amount));
  if (!(kes > 0)) {
    const err = new Error('Amount must be greater than 0.');
    err.code = 'invalid_amount';
    throw err;
  }

  const timestamp = darajaTimestamp();
  const password = buildStkPassword(shortcode, creds.passkey, timestamp);
  const token = await getAccessToken();

  const accountRef = String(accountReference || 'PAY')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .slice(0, 12);
  const transactionDesc = String(process.env.MPESA_DARAJA_TRANSACTION_DESC || 'HMIS Payment').slice(
    0,
    13
  );

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: kes,
    PartyA: phone254,
    PartyB: shortcode,
    PhoneNumber: phone254,
    CallBackURL: callbackUrl,
    AccountReference: accountRef || 'INV',
    TransactionDesc: transactionDesc,
  };

  const url = `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      data?.errorMessage || data?.error || `Daraja STK failed (HTTP ${res.status})`
    );
    err.code = 'stk_push_failed';
    err.status = res.status;
    err.details = data;
    console.error('[mpesaDaraja] STK HTTP error:', { status: res.status, data, shortcode, env: getDarajaEnv() });
    throw err;
  }

  const responseCode = String(data?.ResponseCode ?? '');
  if (responseCode && responseCode !== '0') {
    const err = new Error(data?.ResponseDescription || data?.errorMessage || 'Daraja rejected STK request');
    err.code = 'stk_push_failed';
    err.details = data;
    throw err;
  }

  const checkoutRequestId = data?.CheckoutRequestID;
  if (!checkoutRequestId) {
    const err = new Error('Daraja STK response missing CheckoutRequestID');
    err.code = 'stk_push_failed';
    err.details = data;
    throw err;
  }

  return {
    success: true,
    checkoutRequestId: String(checkoutRequestId),
    merchantRequestId: data?.MerchantRequestID ? String(data.MerchantRequestID) : null,
    message: data?.CustomerMessage || data?.ResponseDescription || 'STK push sent',
    status: 'pending',
    phone: phone254,
    amount: kes,
    raw: data,
    provider: 'daraja',
  };
}

function getDarajaStatusSummary() {
  const { consumerKey, consumerSecret, passkey, shortcode } = getDarajaCredentials();
  return {
    env: getDarajaEnv(),
    baseUrl: getBaseUrl(),
    consumerKeyConfigured: Boolean(consumerKey),
    consumerSecretConfigured: Boolean(consumerSecret),
    passkeyConfigured: Boolean(passkey),
    shortcodeConfigured: Boolean(shortcode),
    shortcode: shortcode || null,
  };
}

module.exports = {
  getDarajaEnv,
  getBaseUrl,
  resolveStkPaybillNumber,
  getDarajaCredentials,
  isDarajaConfigured,
  darajaTimestamp,
  getAccessToken,
  initiateDarajaStkPush,
  getDarajaStatusSummary,
};
