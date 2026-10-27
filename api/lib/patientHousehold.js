/**
 * HMIS household members sharing a national CR household head (parent CR).
 */
const { resolveShaMemberCrForPatient } = require('./shaPatientMemberCr');
const { buildPatientFacilityFilter, patientBelongsToScope } = require('./branchContext');

function computeHouseholdHeadCr(anchorRow, memberCr) {
  const fromCr = memberCr?.linkedParentCrId || anchorRow?.linkedParentCrId || null;
  if (fromCr) return String(fromCr).trim();
  const nupi = anchorRow?.nupi ? String(anchorRow.nupi).trim() : null;
  if (nupi && /^CR[\dA-Za-z-]+$/i.test(nupi)) return nupi;
  return memberCr?.memberCrNumber ? String(memberCr.memberCrNumber).trim() : null;
}

function memberRole(row, headCr) {
  const nupi = row.nupi ? String(row.nupi).trim() : '';
  if (headCr && nupi && nupi.toUpperCase() === headCr.toUpperCase()) return 'head';
  if (row.linkedParentCrId || /birth certificate/i.test(String(row.idType || ''))) {
    return 'dependant';
  }
  return 'member';
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {object} scope
 * @param {number} patientId
 */
async function listHouseholdMembersForPatient(pool, scope, patientId) {
  const [anchorRows] = await pool.execute(
    `SELECT patientId, patientNumber, firstName, lastName, dateOfBirth, gender,
            idType, idNumber, nupi, linkedParentCrId, registeredBranchId
     FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
    [patientId]
  );
  const anchor = anchorRows[0];
  if (!anchor) return { found: false };

  if (!patientBelongsToScope(scope, anchor.registeredBranchId)) {
    return { found: true, forbidden: true };
  }

  const memberCr = await resolveShaMemberCrForPatient(pool, anchor);
  const headCr = computeHouseholdHeadCr(anchor, memberCr);

  if (!headCr) {
    return {
      found: true,
      anchorPatientId: patientId,
      householdHeadCr: null,
      householdNumber: memberCr.householdNumber || null,
      members: [],
      message:
        'No household head CR on this chart yet. Register NUPI from Client Registry or run Check eligibility on SHA.',
    };
  }

  if (memberCr.linkedParentCrId && !anchor.linkedParentCrId) {
    await pool
      .execute(
        `UPDATE patients SET linkedParentCrId = ? WHERE patientId = ? AND voided = 0`,
        [memberCr.linkedParentCrId, patientId]
      )
      .catch(() => {});
    anchor.linkedParentCrId = memberCr.linkedParentCrId;
  }

  const branchFilter = buildPatientFacilityFilter(scope, 'p.registeredBranchId');
  const [linkedRows] = await pool.execute(
    `SELECT p.patientId, p.patientNumber, p.firstName, p.lastName, p.dateOfBirth, p.gender,
            p.idType, p.idNumber, p.nupi, p.linkedParentCrId
     FROM patients p
     WHERE p.voided = 0
       AND (p.nupi = ? OR p.linkedParentCrId = ?)
       ${branchFilter.clause}
     ORDER BY p.dateOfBirth ASC, p.patientId ASC`,
    [headCr, headCr, ...branchFilter.params]
  );

  const seen = new Set(linkedRows.map((r) => r.patientId));
  const members = linkedRows.map((row) => ({
    patientId: row.patientId,
    patientNumber: row.patientNumber,
    name: [row.firstName, row.lastName].filter(Boolean).join(' '),
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    idType: row.idType,
    idNumber: row.idNumber,
    nupi: row.nupi,
    linkedParentCrId: row.linkedParentCrId,
    role: memberRole(row, headCr),
    isCurrentPatient: row.patientId === patientId,
  }));

  const excludeIds = [...seen];
  const excludeClause =
    excludeIds.length > 0
      ? ` AND p.patientId NOT IN (${excludeIds.map(() => '?').join(',')})`
      : '';
  const [candidates] = await pool.execute(
    `SELECT p.patientId, p.patientNumber, p.firstName, p.lastName, p.dateOfBirth, p.gender,
            p.idType, p.idNumber, p.nupi, p.linkedParentCrId
     FROM patients p
     WHERE p.voided = 0
       AND p.linkedParentCrId IS NULL
       AND p.nupi IS NOT NULL
       AND LOWER(COALESCE(p.idType, '')) LIKE '%birth%cert%'
       ${excludeClause}
       ${branchFilter.clause}
     LIMIT 25`,
    [...excludeIds, ...branchFilter.params]
  );

  const { resolveClient } = require('./clientRegistry');
  const { householdNumberToParentCrId } = require('./afyaConnectCrMapper');

  // Lazy-link dependants registered before linkedParentCrId column existed
  for (const row of candidates) {
    if (!/birth certificate/i.test(String(row.idType || ''))) continue;
    let parent = null;
    try {
      const cr = await resolveClient(pool, {
        idNumber: row.idNumber,
        idType: row.idType,
        identificationType: row.idType,
      });
      if (cr.found) {
        parent =
          cr.patient?.linkedParentCrId ||
          cr.dependant?.linkedParentCrId ||
          householdNumberToParentCrId(
            cr.patient?.householdNumber || cr.dependant?.householdNumber
          );
      }
    } catch {
      /* CR offline — skip */
    }
    parent = parent ? String(parent).trim() : null;
    if (!parent || parent.toUpperCase() !== headCr.toUpperCase()) continue;
    await pool
      .execute(`UPDATE patients SET linkedParentCrId = ? WHERE patientId = ? AND voided = 0`, [
        parent,
        row.patientId,
      ])
      .catch(() => {});
    seen.add(row.patientId);
    members.push({
      patientId: row.patientId,
      patientNumber: row.patientNumber,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      idType: row.idType,
      idNumber: row.idNumber,
      nupi: row.nupi,
      linkedParentCrId: parent,
      role: 'dependant',
      isCurrentPatient: row.patientId === patientId,
    });
  }

  members.sort((a, b) => {
    if (a.role === 'head' && b.role !== 'head') return -1;
    if (b.role === 'head' && a.role !== 'head') return 1;
    return String(a.dateOfBirth || '').localeCompare(String(b.dateOfBirth || ''));
  });

  return {
    found: true,
    anchorPatientId: patientId,
    householdHeadCr: headCr,
    householdNumber: memberCr.householdNumber || null,
    members,
    billingNote:
      'Bill SHA/national visits on the dependant’s own chart using that member’s NUPI — not on the household head’s chart.',
    consentNote:
      'Claims OTP: load contacts on the dependant chart — national CR should list guardian phones for minors. SHR consent routes OTP to the household head when linkedParentCrId is set. Parent phone shown here is informational only.',
  };
}

module.exports = { listHouseholdMembersForPatient, computeHouseholdHeadCr };
