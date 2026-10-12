#!/usr/bin/env node
/**
 * Lightweight edge cache for Kakamega Mobile.
 *
 * Polls the main HMIS /api/mobile/clinical-snapshot on an interval and serves
 * the last good snapshot locally. Mobile apps can point FALLBACK_API_URL here
 * when the primary HMIS host is unreachable.
 *
 * Usage:
 *   HMIS_API_URL=https://kakamega.intellibizafrica.co.ke \
 *   HMIS_SERVICE_TOKEN=<jwt> \
 *   PORT=8090 \
 *   node deploy/mobile-edge-cache/server.js
 */
const http = require('http');
const https = require('https');

const HMIS_API_URL = process.env.HMIS_API_URL || 'http://127.0.0.1:3222';
const HMIS_SERVICE_TOKEN = process.env.HMIS_SERVICE_TOKEN || '';
const POLL_MS = Number(process.env.POLL_MS || 5 * 60 * 1000);
const PORT = Number(process.env.PORT || 8090);
const SERVICE_POINT = process.env.SERVICE_POINT || 'consultation';

let lastSnapshot = null;
let lastError = null;
let lastFetchAt = null;

function fetchSnapshot() {
  const url = new URL('/api/mobile/clinical-snapshot', HMIS_API_URL);
  url.searchParams.set('servicePoint', SERVICE_POINT);
  const lib = url.protocol === 'https:' ? https : http;
  const headers = { Accept: 'application/json' };
  if (HMIS_SERVICE_TOKEN) headers.Authorization = `Bearer ${HMIS_SERVICE_TOKEN}`;

  return new Promise((resolve, reject) => {
    const req = lib.get(url, { headers, timeout: 30000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HMIS returned ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

async function poll() {
  try {
    const data = await fetchSnapshot();
    lastSnapshot = { ...data, edgeCachedAt: new Date().toISOString(), source: 'edge-cache' };
    lastError = null;
    lastFetchAt = new Date().toISOString();
    console.log(`[edge-cache] snapshot refreshed (${data.queue?.length || 0} queue rows)`);
  } catch (err) {
    lastError = err.message || String(err);
    console.warn('[edge-cache] poll failed:', lastError);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, lastFetchAt, lastError, hasSnapshot: Boolean(lastSnapshot) }));
    return;
  }
  if (req.url?.startsWith('/api/mobile/clinical-snapshot')) {
    if (!lastSnapshot) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'No snapshot yet', lastError }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(lastSnapshot));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not found' }));
});

void poll();
setInterval(poll, POLL_MS);

server.listen(PORT, () => {
  console.log(`[edge-cache] listening on :${PORT}, polling ${HMIS_API_URL} every ${POLL_MS}ms`);
});
