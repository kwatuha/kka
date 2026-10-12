/**
 * Load `.env` from common locations so production and local dev behave the same.
 *
 * - Docker Compose `env_file: .env` injects variables before Node starts — this module then
 *   only fills gaps (override: false), so container env always wins.
 * - Non-Docker: tries several paths so whether you keep secrets in repo root `.env` or `api/.env`
 *   (or a custom path) still works.
 *
 * Set `API_ENV_FILE=/full/path/to/.env` (or relative) to force one file (e.g. production layout).
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const configDir = __dirname;
  const candidates = [
    process.env.API_ENV_FILE,
    path.join(configDir, '..', '.env'),
    path.join(configDir, '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
  ].filter(Boolean);

  const seen = new Set();
  for (let p of candidates) {
    p = path.resolve(p);
    if (seen.has(p)) continue;
    seen.add(p);
    if (!fs.existsSync(p)) continue;
    const result = require('dotenv').config({ path: p, override: false });
    if (result.error) {
      console.warn(`[env] Could not read ${p}: ${result.error.message}`);
      continue;
    }
    if (result.parsed && process.env.NODE_ENV !== 'production') {
      console.log(`[env] Loaded ${p}`);
    }
  }
}

loadEnv();

function validateSecurityAfterEnvLoad() {
  try {
    const { validateSecurityEnvironment } = require('../lib/jwtSecret');
    validateSecurityEnvironment();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

validateSecurityAfterEnvLoad();

module.exports = { loadEnv, validateSecurityAfterEnvLoad };
