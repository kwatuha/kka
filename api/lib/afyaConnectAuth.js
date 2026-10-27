/**
 * AfyaConnect OAuth 2.0 client credentials (Consumer Key / Secret from portal).
 * @see https://afyaconnect.dha.go.ke/hie-api
 * @see docs/DHA_AFYACONNECT_GO_LIVE_PLAN.md
 *
 * Token URL and API bases come from your AfyaConnect app / Postman collection (UAT vs prod differ).
 */
const crypto = require('crypto');

/** @type {{ accessToken: string|null, expiresAtMs: number, scope: string|null }} */
let tokenCache = { accessToken: null, expiresAtMs: 0, scope: null };

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function getAfyaConnectConfig() {
  const tokenUrl = trimEnv('AFYACONNECT_TOKEN_URL');
  const clientId = trimEnv('AFYACONNECT_CLIENT_ID') || trimEnv('AFYACONNECT_CONSUMER_KEY');
  const clientSecret =
    trimEnv('AFYACONNECT_CLIENT_SECRET') || trimEnv('AFYACONNECT_CONSUMER_SECRET');
  const scope = trimEnv('AFYACONNECT_SCOPE') || null;
  const authMethod = (
    trimEnv('AFYACONNECT_TOKEN_AUTH_METHOD') || 'basic'
  ).toLowerCase();
  const audience = trimEnv('AFYACONNECT_TOKEN_AUDIENCE') || null;

  return {
    tokenUrl,
    clientId,
    clientSecret,
    scope,
    authMethod: authMethod === 'body' ? 'body' : 'basic',
    audience,
  };
}

function isAfyaConnectConfigured() {
  const c = getAfyaConnectConfig();
  return Boolean(c.tokenUrl && c.clientId && c.clientSecret);
}

function safeTokenUrlHost(tokenUrl) {
  try {
    return new URL(tokenUrl).host;
  } catch {
    return null;
  }
}

function clearTokenCache() {
  tokenCache = { accessToken: null, expiresAtMs: 0, scope: null };
}

/**
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<string>}
 */
async function getAccessToken(opts = {}) {
  const cfg = getAfyaConnectConfig();
  if (!cfg.tokenUrl || !cfg.clientId || !cfg.clientSecret) {
    const err = new Error('AfyaConnect OAuth not configured (token URL, client ID, secret)');
    err.code = 'afyaconnect_not_configured';
    throw err;
  }

  if (
    !opts.forceRefresh &&
    tokenCache.accessToken &&
    Date.now() < tokenCache.expiresAtMs - 60_000
  ) {
    return tokenCache.accessToken;
  }

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const bodyParams = new URLSearchParams();
  bodyParams.set('grant_type', 'client_credentials');
  if (cfg.scope) bodyParams.set('scope', cfg.scope);
  if (cfg.audience) bodyParams.set('audience', cfg.audience);

  if (cfg.authMethod === 'body') {
    bodyParams.set('client_id', cfg.clientId);
    bodyParams.set('client_secret', cfg.clientSecret);
  } else {
    const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`, 'utf8').toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers,
    body: bodyParams.toString(),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    const err = new Error(
      data?.error_description ||
        data?.error ||
        data?.message ||
        `AfyaConnect token request failed (HTTP ${res.status})`
    );
    err.code = 'afyaconnect_oauth_failed';
    err.status = res.status;
    err.details = data;
    throw err;
  }

  const accessToken = data?.access_token;
  const expiresIn = Number(data?.expires_in || 3600);
  if (!accessToken) {
    const err = new Error('AfyaConnect token response missing access_token');
    err.code = 'afyaconnect_oauth_failed';
    err.details = data;
    throw err;
  }

  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + Math.max(60, expiresIn) * 1000,
    scope: data?.scope || cfg.scope,
  };

  return accessToken;
}

/**
 * Authenticated fetch to national HIE APIs (Bearer from AfyaConnect OAuth).
 * Retries once on HTTP 401 with a fresh token.
 */
async function afyaConnectFetch(url, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json', ...(options.headers || {}) };

  async function doFetch(bearer) {
    headers.Authorization = `Bearer ${bearer}`;
    return fetch(url, { method, headers, body: options.body });
  }

  let token = await getAccessToken();
  let res = await doFetch(token);

  if (res.status === 401) {
    clearTokenCache();
    token = await getAccessToken({ forceRefresh: true });
    res = await doFetch(token);
  }

  return res;
}

/**
 * Non-secret status for admin UI / readiness.
 */
function getAfyaConnectPublicStatus() {
  const cfg = getAfyaConnectConfig();
  return {
    configured: isAfyaConnectConfigured(),
    tokenUrlHost: cfg.tokenUrl ? safeTokenUrlHost(cfg.tokenUrl) : null,
    clientIdHint: cfg.clientId
      ? `${cfg.clientId.slice(0, 4)}…${cfg.clientId.slice(-4)}`
      : null,
    authMethod: cfg.authMethod,
    scope: cfg.scope,
    agentConfigured: Boolean(
      trimEnv('CLIENT_REGISTRY_AGENT') || trimEnv('AFYACONNECT_AGENT')
    ),
    crBaseUrlConfigured: Boolean(trimEnv('CLIENT_REGISTRY_BASE_URL')),
    crApiStyle: trimEnv('CLIENT_REGISTRY_API_STYLE') || 'fetch-client-v3',
    uatCrTestDoc: 'docs/DHA_UAT_CR_TEST_IDS.md',
    frBaseUrlConfigured: Boolean(
      trimEnv('FACILITY_REGISTRY_BASE_URL') || trimEnv('CLIENT_REGISTRY_BASE_URL')
    ),
    frApiStyle: trimEnv('FACILITY_REGISTRY_API_STYLE') || 'search-v1',
    uatFrTestDoc: 'docs/DHA_UAT_FR_TEST_IDS.md',
    fhirPublishStyle: trimEnv('FHIR_PUBLISH_STYLE') || 'shr-bundles-v1',
    fhirBaseUrlConfigured: Boolean(
      trimEnv('FHIR_BASE_URL') || trimEnv('CLIENT_REGISTRY_BASE_URL')
    ),
    uatFhirTestDoc: 'docs/DHA_FHIR_LIVE_TRANSMIT.md',
  };
}

/**
 * Attempt token acquisition; never returns the raw token.
 */
async function testAfyaConnectAuth() {
  const status = getAfyaConnectPublicStatus();
  if (!status.configured) {
    return {
      ok: false,
      ...status,
      error: 'Missing AFYACONNECT_TOKEN_URL, AFYACONNECT_CLIENT_ID, or AFYACONNECT_CLIENT_SECRET',
    };
  }

  const started = Date.now();
  try {
    await getAccessToken({ forceRefresh: true });
    const cfg = getAfyaConnectConfig();
    return {
      ok: true,
      ...status,
      latencyMs: Date.now() - started,
      expiresInSeconds: Math.max(
        0,
        Math.round((tokenCache.expiresAtMs - Date.now()) / 1000)
      ),
      tokenFingerprint: tokenCache.accessToken
        ? crypto.createHash('sha256').update(tokenCache.accessToken).digest('hex').slice(0, 12)
        : null,
    };
  } catch (err) {
    return {
      ok: false,
      ...status,
      latencyMs: Date.now() - started,
      error: err.message,
      code: err.code || 'afyaconnect_oauth_failed',
      httpStatus: err.status || null,
    };
  }
}

module.exports = {
  getAfyaConnectConfig,
  isAfyaConnectConfigured,
  getAccessToken,
  clearTokenCache,
  afyaConnectFetch,
  getAfyaConnectPublicStatus,
  testAfyaConnectAuth,
  safeTokenUrlHost,
};
