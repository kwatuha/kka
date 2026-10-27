/**
 * Serves /srv (hmis/ static export). Redirects browser hits on *.txt RSC payloads
 * to the HTML route; client navigations with header RSC: 1 still receive .txt files.
 * Gzip + Cache-Control for JS/CSS and hashed _next/static assets.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const handler = require('serve-handler');

const PUBLIC_ROOT = path.resolve(process.env.HMIS_STATIC_ROOT || '/srv');
const PORT = Number(process.env.HMIS_STATIC_PORT || 3000);
const HOST = process.env.HOSTNAME || '0.0.0.0';

const COMPRESS_EXT = new Set(['.js', '.css', '.html', '.json', '.svg', '.txt', '.xml']);
const MIME = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

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

function safeJoinPublic(relativePath) {
  const fp = path.normalize(path.join(PUBLIC_ROOT, relativePath));
  if (fp === PUBLIC_ROOT || fp.startsWith(PUBLIC_ROOT + path.sep)) return fp;
  return null;
}

function resolveStaticFile(pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\//, '');
  if (!rel) rel = 'index.html';

  const tries = [rel];
  if (rel.endsWith('/')) {
    tries.push(`${rel}index.html`);
  } else if (!path.extname(rel)) {
    tries.push(`${rel}.html`);
    tries.push(path.join(rel, 'index.html'));
  }

  for (const candidate of tries) {
    const fp = safeJoinPublic(candidate);
    if (!fp) continue;
    try {
      const st = fs.statSync(fp);
      if (st.isFile()) return { fp, st };
    } catch {
      /* next */
    }
  }
  return null;
}

function cacheControlFor(pathname) {
  // Only fingerprinted Next assets are immutable — avoids stale non-hashed JS after deploy.
  if (pathname.includes('/_next/static/')) {
    return 'public, max-age=31536000, immutable';
  }
  const ext = path.extname(pathname).toLowerCase();
  if (ext === '.html' || ext === '' || pathname.endsWith('/')) {
    return 'no-cache, must-revalidate';
  }
  if (ext === '.js' || ext === '.css') {
    return 'public, max-age=3600, must-revalidate';
  }
  if (ext === '.woff2' || ext === '.woff') {
    return 'public, max-age=86400';
  }
  return 'public, max-age=0, must-revalidate';
}

function serveStaticFile(req, res, pathname, file) {
  const ext = path.extname(file.fp).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const cacheControl = cacheControlFor(pathname);
  const acceptGzip = String(req.headers['accept-encoding'] || '').includes('gzip');
  const canGzip = acceptGzip && COMPRESS_EXT.has(ext);

  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Type', contentType);

  if (req.method === 'HEAD') {
    if (canGzip) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
    } else {
      res.setHeader('Content-Length', file.st.size);
    }
    res.statusCode = 200;
    res.end();
    return;
  }

  if (!canGzip) {
    res.setHeader('Content-Length', file.st.size);
    fs.createReadStream(file.fp).pipe(res);
    return;
  }

  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Vary', 'Accept-Encoding');
  fs.createReadStream(file.fp).pipe(zlib.createGzip({ level: 6 })).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (shouldRedirectTxt(req, pathname)) {
    const dest = pathname.slice(0, -4) || '/hmis/';
    res.writeHead(302, { Location: dest + url.search });
    res.end();
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const file = resolveStaticFile(pathname);
    if (file) {
      serveStaticFile(req, res, pathname, file);
      return;
    }
  }

  return handler(req, res, serveOptions);
});

server.listen(PORT, HOST, () => {
  console.log(`HMIS static server listening on ${HOST}:${PORT} (root ${PUBLIC_ROOT}, gzip enabled)`);
});
