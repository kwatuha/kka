const path = require('path');
const fs = require('fs');

let catalogCache = null;

function loadCatalog() {
  if (catalogCache) return catalogCache;
  const file = path.join(__dirname, '../data/hpt-sandbox-catalog.json');
  catalogCache = JSON.parse(fs.readFileSync(file, 'utf8'));
  return catalogCache;
}

function searchHptCatalog(query, limit = 20) {
  const q = String(query || '').trim().toLowerCase();
  const catalog = loadCatalog();
  if (!q) return catalog.slice(0, limit);
  return catalog
    .filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.hptCode.toLowerCase().includes(q) ||
        (row.form && row.form.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

function resolveHptByName(medicationName) {
  const n = String(medicationName || '').toLowerCase();
  if (!n) return null;
  return (
    loadCatalog().find(
      (row) =>
        n.includes(row.name.toLowerCase().slice(0, 12)) ||
        row.name.toLowerCase().includes(n.slice(0, 8))
    ) || null
  );
}

module.exports = { loadCatalog, searchHptCatalog, resolveHptByName };
