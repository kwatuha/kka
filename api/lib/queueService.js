const {
  resolveBranchForRequest,
  getRequestUserId,
  getMainBranch,
} = require('./branchContext');

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

function getRequestedServicePointId(req, body = {}) {
  const raw =
    body.servicePointId ??
    req?.query?.servicePointId ??
    req?.headers?.['x-service-point-id'] ??
    null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getPatientBranchId(executor, patientId) {
  if (!patientId) return null;
  const rows = await safeQuery(
    executor,
    'SELECT registeredBranchId FROM patients WHERE patientId = ? LIMIT 1',
    [patientId],
  );
  const branchId = Number(rows[0]?.registeredBranchId);
  return Number.isFinite(branchId) && branchId > 0 ? branchId : null;
}

async function getDefaultServicePointForBranch(executor, branchId, pointType) {
  if (!branchId || !pointType) return null;
  const rows = await safeQuery(
    executor,
    `SELECT servicePointId, pointCode, pointName, branchId, pointType, isDefault, linkedStoreId, linkedLabId, location
     FROM service_points
     WHERE branchId = ? AND pointType = ? AND isActive = 1
     ORDER BY isDefault DESC, servicePointId ASC
     LIMIT 1`,
    [branchId, pointType],
  );
  return rows[0] || null;
}

async function resolveServicePointForRequest(executor, req = {}, options = {}) {
  const servicePointId = getRequestedServicePointId(req, options.body || {});
  if (servicePointId) {
    const rows = await safeQuery(
      executor,
      `SELECT sp.*, b.branchName, b.branchCode
       FROM service_points sp
       LEFT JOIN branches b ON sp.branchId = b.branchId
       WHERE sp.servicePointId = ? AND sp.isActive = 1
       LIMIT 1`,
      [servicePointId],
    );
    if (rows[0]) return rows[0];
  }

  const branch = await resolveBranchForRequest(executor, req, {
    userId: options.userId ?? getRequestUserId(req),
    body: options.body || {},
    branchId: options.branchId,
  });
  const pointType = options.pointType || options.servicePoint;
  if (branch?.branchId && pointType) {
    return getDefaultServicePointForBranch(executor, branch.branchId, pointType);
  }
  return null;
}

async function resolveBranchForQueue(executor, options = {}) {
  if (options.branchId) {
    const id = Number(options.branchId);
    if (Number.isFinite(id) && id > 0) return id;
  }
  if (options.patientId) {
    const patientBranchId = await getPatientBranchId(executor, options.patientId);
    if (patientBranchId) return patientBranchId;
  }
  if (options.req) {
    const branch = await resolveBranchForRequest(executor, options.req, {
      userId: options.userId,
      body: options.body || {},
      branchId: options.branchId,
    });
    if (branch?.branchId) return branch.branchId;
  }
  const main = await getMainBranch(executor);
  return main?.branchId || null;
}

async function generateTicketNumber(executor, { branchId, servicePoint, servicePointId }) {
  const params = [servicePoint || 'general'];
  let query =
    'SELECT COUNT(*) AS count FROM queue_entries WHERE DATE(arrivalTime) = CURDATE() AND servicePoint = ?';
  if (branchId) {
    query += ' AND branchId = ?';
    params.push(branchId);
  } else if (servicePointId) {
    query += ' AND servicePointId = ?';
    params.push(servicePointId);
  }
  const [countRows] = await executor.execute(query, params);
  const ticketNum = (countRows[0]?.count || 0) + 1;
  const prefix = (servicePoint || 'general').substring(0, 1).toUpperCase();
  return `${prefix}-${String(ticketNum).padStart(3, '0')}`;
}

async function checkExistingQueueEntry(executor, { patientId, servicePoint, branchId, servicePointId }) {
  let query = `
    SELECT queueId FROM queue_entries
    WHERE patientId = ? AND servicePoint = ?
      AND status IN ('waiting', 'called', 'serving')
  `;
  const params = [patientId, servicePoint];
  if (servicePointId) {
    query += ' AND (servicePointId = ? OR servicePointId IS NULL)';
    params.push(servicePointId);
  } else if (branchId) {
    query += ' AND (branchId = ? OR branchId IS NULL)';
    params.push(branchId);
  }
  const rows = await safeQuery(executor, query, params);
  return rows.length > 0 ? rows[0].queueId : null;
}

/**
 * Create a branch-scoped queue entry with optional physical service point.
 * Returns queueId or existing queueId when duplicate check matches.
 */
async function createQueueEntry(executor, options = {}) {
  const {
    patientId,
    servicePoint,
    priority = 'normal',
    notes = null,
    userId = null,
    checkDuplicate = true,
    branchId: explicitBranchId,
    servicePointId: explicitServicePointId,
    req,
    body,
    status = 'waiting',
    doctorId = null,
    ticketNumber: explicitTicket,
  } = options;

  if (!patientId || !servicePoint) {
    throw new Error('patientId and servicePoint are required');
  }

  const branchId = await resolveBranchForQueue(executor, {
    branchId: explicitBranchId,
    patientId,
    req,
    body,
    userId,
  });

  let servicePointRow = null;
  if (explicitServicePointId) {
    const rows = await safeQuery(
      executor,
      'SELECT * FROM service_points WHERE servicePointId = ? AND isActive = 1 LIMIT 1',
      [explicitServicePointId],
    );
    servicePointRow = rows[0] || null;
  } else if (branchId) {
    servicePointRow = await getDefaultServicePointForBranch(executor, branchId, servicePoint);
  }

  const servicePointId = servicePointRow?.servicePointId || explicitServicePointId || null;

  if (checkDuplicate || servicePoint === 'cashier' || servicePoint === 'pharmacy') {
    const existingQueueId = await checkExistingQueueEntry(executor, {
      patientId,
      servicePoint,
      branchId,
      servicePointId,
    });
    if (existingQueueId) {
      return existingQueueId;
    }
  }

  const ticketNumber =
    explicitTicket ||
    (await generateTicketNumber(executor, { branchId, servicePoint, servicePointId }));

  const [result] = await executor.execute(
    `INSERT INTO queue_entries
      (branchId, servicePointId, patientId, doctorId, ticketNumber, servicePoint, priority, status, notes, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      branchId,
      servicePointId,
      patientId,
      doctorId,
      ticketNumber,
      servicePoint,
      priority,
      status,
      notes,
      userId,
    ],
  );

  return result.insertId;
}

async function getUserServicePointContext(executor, userId, branchId = null) {
  const normalizedBranchId = Number(branchId) || null;

  if (userId) {
    let assignmentQuery = `
      SELECT sp.servicePointId, sp.pointCode, sp.pointName, sp.branchId, sp.pointType,
             sp.isDefault, sp.linkedStoreId, sp.linkedLabId, sp.location,
             b.branchName, b.branchCode, usa.isDefault AS userDefault
      FROM user_service_point_assignments usa
      INNER JOIN service_points sp ON usa.servicePointId = sp.servicePointId
      LEFT JOIN branches b ON sp.branchId = b.branchId
      WHERE usa.userId = ? AND usa.isActive = 1 AND sp.isActive = 1
    `;
    const params = [userId];
    if (normalizedBranchId) {
      assignmentQuery += ' AND sp.branchId = ?';
      params.push(normalizedBranchId);
    }
    assignmentQuery += ' ORDER BY usa.isDefault DESC, sp.pointName ASC';

    const assignments = await safeQuery(executor, assignmentQuery, params);
    if (assignments.length) {
      const defaultPoint =
        assignments.find((row) => row.userDefault) ||
        assignments.find((row) => row.isDefault) ||
        assignments[0];
      return {
        servicePoints: assignments,
        defaultServicePoint: defaultPoint,
        currentServicePoint: defaultPoint,
      };
    }
  }

  let pointsQuery = `
    SELECT sp.servicePointId, sp.pointCode, sp.pointName, sp.branchId, sp.pointType,
           sp.isDefault, sp.linkedStoreId, sp.linkedLabId, sp.location,
           b.branchName, b.branchCode
    FROM service_points sp
    LEFT JOIN branches b ON sp.branchId = b.branchId
    WHERE sp.isActive = 1
  `;
  const pointParams = [];
  if (normalizedBranchId) {
    pointsQuery += ' AND sp.branchId = ?';
    pointParams.push(normalizedBranchId);
  }
  pointsQuery += ' ORDER BY sp.branchId ASC, sp.pointType ASC, sp.isDefault DESC, sp.pointName ASC';

  const servicePoints = await safeQuery(executor, pointsQuery, pointParams);
  const defaultServicePoint =
    servicePoints.find((row) => row.isDefault) || servicePoints[0] || null;

  return {
    servicePoints,
    defaultServicePoint,
    currentServicePoint: defaultServicePoint,
  };
}

function buildQueueBranchFilter(scope, column = 'q.branchId') {
  if (!scope || scope.canAccessAllBranches) {
    return { clause: '', params: [] };
  }
  const branchId = Number(scope.currentBranchId);
  if (Number.isFinite(branchId) && branchId > 0) {
    return { clause: ` AND (${column} = ? OR ${column} IS NULL)`, params: [branchId] };
  }
  const ids = (scope.branchIds || []).filter(Boolean);
  if (!ids.length) {
    return { clause: ' AND 1=0', params: [] };
  }
  const ph = ids.map(() => '?').join(',');
  return { clause: ` AND (${column} IN (${ph}) OR ${column} IS NULL)`, params: ids };
}

async function findActiveConsultationQueueToday(executor, patientId, branchId = null) {
  if (!patientId) return null;
  let query = `
    SELECT queueId FROM queue_entries
    WHERE patientId = ? AND servicePoint = 'consultation'
      AND DATE(COALESCE(arrivalTime, createdAt)) = CURDATE()
      AND status NOT IN ('completed', 'cancelled')
  `;
  const params = [patientId];
  if (branchId) {
    query += ' AND (branchId = ? OR branchId IS NULL)';
    params.push(branchId);
  }
  const rows = await safeQuery(executor, query, params);
  return rows[0]?.queueId || null;
}

async function resolveConsultationServicePointId(executor, options = {}) {
  const { consultationServicePointId, doctorId, branchId, patientId } = options;
  const explicit = Number(consultationServicePointId);
  if (Number.isFinite(explicit) && explicit > 0) {
    const rows = await safeQuery(
      executor,
      `SELECT servicePointId FROM service_points
       WHERE servicePointId = ? AND pointType = 'consultation' AND isActive = 1 LIMIT 1`,
      [explicit],
    );
    if (rows[0]) return explicit;
  }

  if (doctorId) {
    const rows = await safeQuery(
      executor,
      `SELECT sp.servicePointId
       FROM user_service_point_assignments usa
       INNER JOIN service_points sp ON sp.servicePointId = usa.servicePointId
       WHERE usa.userId = ? AND usa.isActive = 1 AND sp.isActive = 1 AND sp.pointType = 'consultation'
       ORDER BY usa.isDefault DESC, sp.isDefault DESC, sp.servicePointId ASC
       LIMIT 1`,
      [doctorId],
    );
    if (rows[0]) return rows[0].servicePointId;
  }

  const bid = branchId || (patientId ? await getPatientBranchId(executor, patientId) : null);
  if (bid) {
    const row = await getDefaultServicePointForBranch(executor, bid, 'consultation');
    return row?.servicePointId || null;
  }
  return null;
}

/**
 * Create a consultation queue entry from triage data (after payment or waiver).
 * Skips creation when patient already has an active consultation ticket today.
 */
async function createConsultationQueueFromTriage(executor, options = {}) {
  const {
    triage,
    patientId,
    userId,
    priority,
    notesSuffix = '',
    req,
    branchId: explicitBranchId,
  } = options;

  const pid = patientId || triage?.patientId;
  if (!pid) {
    throw new Error('patientId is required');
  }

  const branchId = await resolveBranchForQueue(executor, {
    branchId: explicitBranchId,
    patientId: pid,
    req,
    userId,
  });

  const existingId = await findActiveConsultationQueueToday(executor, pid, branchId);
  if (existingId) {
    return existingId;
  }

  const consultationServicePointId = await resolveConsultationServicePointId(executor, {
    consultationServicePointId: triage?.consultationServicePointId,
    doctorId: triage?.assignedToDoctorId,
    branchId,
    patientId: pid,
  });

  let queuePriority = priority || 'normal';
  if (!priority && triage?.triageCategory === 'red') queuePriority = 'emergency';
  else if (!priority && triage?.triageCategory === 'yellow') queuePriority = 'urgent';

  const triageNumber = triage?.triageNumber || '';
  let queueNotes = triageNumber
    ? `Triage: ${triageNumber}${triage?.assignedToDepartment ? ` - ${triage.assignedToDepartment}` : ''}`
    : 'Consultation';
  if (notesSuffix) {
    queueNotes += notesSuffix;
  }

  return createQueueEntry(executor, {
    patientId: pid,
    servicePoint: 'consultation',
    priority: queuePriority,
    notes: queueNotes,
    userId: userId || triage?.triagedBy || null,
    doctorId: triage?.assignedToDoctorId || null,
    servicePointId: consultationServicePointId,
    branchId,
    req,
    checkDuplicate: false,
  });
}

async function transferQueueToRoom(executor, queueId, servicePointId, userId) {
  const qid = Number(queueId);
  const spid = Number(servicePointId);
  if (!Number.isFinite(qid) || qid <= 0) {
    throw new Error('Invalid queueId');
  }
  if (!Number.isFinite(spid) || spid <= 0) {
    throw new Error('Invalid servicePointId');
  }

  const entries = await safeQuery(executor, 'SELECT * FROM queue_entries WHERE queueId = ? LIMIT 1', [qid]);
  const entry = entries[0];
  if (!entry) {
    throw new Error('Queue entry not found');
  }
  if (entry.servicePoint !== 'consultation') {
    throw new Error('Room transfer is only supported for consultation queue entries');
  }
  if (!['waiting', 'called', 'serving'].includes(entry.status)) {
    throw new Error('Cannot transfer a completed or cancelled queue entry');
  }

  const points = await safeQuery(
    executor,
    `SELECT servicePointId, pointName, pointType, branchId FROM service_points
     WHERE servicePointId = ? AND isActive = 1 LIMIT 1`,
    [spid],
  );
  const point = points[0];
  if (!point || point.pointType !== 'consultation') {
    throw new Error('Target must be an active consultation room');
  }

  if (entry.branchId && point.branchId && Number(entry.branchId) !== Number(point.branchId)) {
    throw new Error('Target room belongs to a different branch');
  }

  const transferNote = `Transferred to ${point.pointName}`;
  const newNotes = entry.notes ? `${entry.notes} | ${transferNote}` : transferNote;

  await executor.execute(
    `UPDATE queue_entries SET servicePointId = ?, notes = ?, updatedAt = NOW() WHERE queueId = ?`,
    [spid, newNotes, qid],
  );

  const updated = await safeQuery(
    executor,
    `SELECT q.*, sp.pointName AS servicePointName, sp.pointCode AS servicePointCode
     FROM queue_entries q
     LEFT JOIN service_points sp ON q.servicePointId = sp.servicePointId
     WHERE q.queueId = ?`,
    [qid],
  );
  return updated[0];
}

module.exports = {
  getRequestedServicePointId,
  getPatientBranchId,
  getDefaultServicePointForBranch,
  resolveServicePointForRequest,
  resolveBranchForQueue,
  generateTicketNumber,
  checkExistingQueueEntry,
  createQueueEntry,
  getUserServicePointContext,
  buildQueueBranchFilter,
  findActiveConsultationQueueToday,
  resolveConsultationServicePointId,
  createConsultationQueueFromTriage,
  transferQueueToRoom,
};
