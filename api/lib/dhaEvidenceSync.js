/**
 * Sync dha_attestation_responses with delivered product (met vs partial).
 */
const {
  IMPLEMENTED_EVIDENCE_CODES,
  PARTIAL_EVIDENCE_CODES,
} = require('./dhaEvidenceCodes');

const MET_NOTE =
  'Product delivered on UAT — attested via evidence pack sync (sandbox / internal).';
const PARTIAL_NOTE =
  'Partial — sandbox or internal only; live national endpoint or host evidence pending (see gap analysis).';

async function ensureResponseRows(pool) {
  const [result] = await pool.execute(
    `INSERT INTO dha_attestation_responses (itemId, status)
     SELECT i.itemId, 'not_started'
     FROM dha_evidence_items i
     WHERE i.isActive = 1
       AND NOT EXISTS (
         SELECT 1 FROM dha_attestation_responses r WHERE r.itemId = i.itemId
       )`
  );
  return result.affectedRows || 0;
}

async function syncEvidenceChecklistAttestation(pool, userId = null) {
  const inserted = await ensureResponseRows(pool);

  const partialSet = new Set(PARTIAL_EVIDENCE_CODES);
  const implSet = new Set(IMPLEMENTED_EVIDENCE_CODES);

  const metCodes = [...implSet].filter((c) => !partialSet.has(c));
  const partialCodes = [...implSet].filter((c) => partialSet.has(c));

  let metCount = 0;
  let partialCount = 0;

  if (partialCodes.length) {
    const [pr] = await pool.execute(
      `UPDATE dha_attestation_responses r
       INNER JOIN dha_evidence_items i ON i.itemId = r.itemId
       SET r.status = 'partial',
           r.attestedBy = COALESCE(?, r.attestedBy),
           r.attestedAt = NOW(),
           r.notes = ?
       WHERE i.isActive = 1 AND i.code IN (${partialCodes.map(() => '?').join(',')})`,
      [userId, PARTIAL_NOTE, ...partialCodes]
    );
    partialCount = pr.affectedRows || 0;
  }

  if (metCodes.length) {
    const [mr] = await pool.execute(
      `UPDATE dha_attestation_responses r
       INNER JOIN dha_evidence_items i ON i.itemId = r.itemId
       SET r.status = 'met',
           r.attestedBy = COALESCE(?, r.attestedBy),
           r.attestedAt = NOW(),
           r.notes = ?
       WHERE i.isActive = 1 AND i.code IN (${metCodes.map(() => '?').join(',')})`,
      [userId, MET_NOTE, ...metCodes]
    );
    metCount = mr.affectedRows || 0;
  }

  const [summary] = await pool.execute(
    `SELECT COALESCE(r.status, 'not_started') AS status, COUNT(*) AS c
     FROM dha_evidence_items i
     LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
     WHERE i.isActive = 1
     GROUP BY COALESCE(r.status, 'not_started')`
  );

  return {
    insertedResponses: inserted,
    markedMet: metCount,
    markedPartial: partialCount,
    byStatus: Object.fromEntries(summary.map((row) => [row.status, Number(row.c)])),
  };
}

module.exports = { syncEvidenceChecklistAttestation, ensureResponseRows };
