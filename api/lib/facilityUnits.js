const { resolveBranchForRequest, getRequestUserId } = require('./branchContext');

async function safeQuery(executor, sql, params = []) {
  try {
    const [rows] = await executor.execute(sql, params);
    return rows;
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') {
      return [];
    }
    throw error;
  }
}

function getRequestedStoreId(req, body = {}) {
  const raw =
    body.storeId ??
    req?.query?.storeId ??
    req?.headers?.['x-pharmacy-store-id'] ??
    null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getRequestedLabId(req, body = {}) {
  const raw =
    body.labId ??
    req?.query?.labId ??
    req?.headers?.['x-laboratory-id'] ??
    null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getDispensingStoreForBranch(executor, branchId) {
  if (!branchId) return null;
  const rows = await safeQuery(
    executor,
    `SELECT storeId, storeName, storeCode, branchId, isDispensingStore, location
     FROM drug_stores
     WHERE branchId = ? AND isActive = 1
     ORDER BY isDispensingStore DESC, storeId ASC
     LIMIT 1`,
    [branchId],
  );
  return rows[0] || null;
}

async function getDefaultLabForBranch(executor, branchId) {
  if (!branchId) return null;
  const rows = await safeQuery(
    executor,
    `SELECT labId, labCode, labName, branchId, isDefault, location
     FROM laboratories
     WHERE branchId = ? AND isActive = 1
     ORDER BY isDefault DESC, labId ASC
     LIMIT 1`,
    [branchId],
  );
  return rows[0] || null;
}

async function resolvePharmacyStoreForRequest(executor, req = {}, options = {}) {
  const storeId = getRequestedStoreId(req, options.body || {});
  if (storeId) {
    const rows = await safeQuery(
      executor,
      'SELECT storeId, storeName, storeCode, branchId, isDispensingStore, location FROM drug_stores WHERE storeId = ? AND isActive = 1 LIMIT 1',
      [storeId],
    );
    if (rows[0]) return rows[0];
  }

  const branch = await resolveBranchForRequest(executor, req, {
    userId: options.userId ?? getRequestUserId(req),
    body: options.body || {},
    branchId: options.branchId,
  });
  if (branch?.branchId) {
    return getDispensingStoreForBranch(executor, branch.branchId);
  }
  return null;
}

async function resolveLaboratoryForRequest(executor, req = {}, options = {}) {
  const labId = getRequestedLabId(req, options.body || {});
  if (labId) {
    const rows = await safeQuery(
      executor,
      'SELECT labId, labCode, labName, branchId, isDefault, location FROM laboratories WHERE labId = ? AND isActive = 1 LIMIT 1',
      [labId],
    );
    if (rows[0]) return rows[0];
  }

  const branch = await resolveBranchForRequest(executor, req, {
    userId: options.userId ?? getRequestUserId(req),
    body: options.body || {},
    branchId: options.branchId,
  });
  if (branch?.branchId) {
    return getDefaultLabForBranch(executor, branch.branchId);
  }
  return null;
}

async function resolveStoreIdFromLocation(executor, location) {
  const label = String(location || '').trim();
  if (!label) return null;
  const rows = await safeQuery(
    executor,
    `SELECT storeId, storeName, branchId FROM drug_stores
     WHERE isActive = 1
       AND (storeName = ? OR storeCode = ? OR location = ?)
     LIMIT 1`,
    [label, label, label],
  );
  return rows[0] || null;
}

module.exports = {
  getRequestedStoreId,
  getRequestedLabId,
  getDispensingStoreForBranch,
  getDefaultLabForBranch,
  resolvePharmacyStoreForRequest,
  resolveLaboratoryForRequest,
  resolveStoreIdFromLocation,
};
