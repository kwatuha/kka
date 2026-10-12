/**
 * Serves /srv (hmis/ static export). Redirects browser hits on *.txt RSC payloads
 * to the HTML route; client navigations with header RSC: 1 still receive .txt files.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const handler = require('serve-handler');

const PUBLIC_ROOT = process.env.HMIS_STATIC_ROOT || '/srv';
// Do not use PORT — shared deploy .env sets PORT=3001 for the API container.
const PORT = Number(process.env.HMIS_STATIC_PORT || 3000);
const HOST = process.env.HOSTNAME || '0.0.0.0';

let serveOptions = { public: PUBLIC_ROOT };
try {
  const raw = fs.readFileSync(path.join(PUBLIC_ROOT, 'serve.json'), 'utf8');
  serveOptions = { public: PUBLIC_ROOT, ...JSON.parse(raw) };
} catch {
  /* optional serve.json */
}

function shouldRedirectTxt(req, pathname) {
  if (req.headers['rsc'] === '1') return false;
  if (!pathname.endsWith('.txt')) return false;
  return pathname.startsWith('/hmis/') || pathname.includes('/hmis/');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (shouldRedirectTxt(req, url.pathname)) {
    const dest = url.pathname.slice(0, -4) || '/hmis/';
    res.writeHead(302, { Location: dest + url.search });
    res.end();
    return;
  }
  return handler(req, res, serveOptions);
});

server.listen(PORT, HOST, () => {
  console.log(`HMIS static server listening on ${HOST}:${PORT} (root ${PUBLIC_ROOT})`);
});
