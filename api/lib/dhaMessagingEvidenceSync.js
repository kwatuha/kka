/**
 * After SMTP is configured, refresh notes on REP-IDSR-EMAIL / OPS-SMTP-DELIV.
 */
const { getMessagingComplianceStatus } = require('./messagingCompliance');

async function syncMessagingEvidenceNotes(pool, userId = null) {
  let msg;
  try {
    msg = getMessagingComplianceStatus();
  } catch {
    return { updated: 0 };
  }
  if (!msg.idsrAlertEmail?.deliverable) {
    return { updated: 0, skipped: 'smtp_or_recipients_missing' };
  }
  const note =
    'SMTP + IDSR_ALERT_EMAIL configured on server; use Evidence pack SMTP test or immediate IDSR alert for assessor proof.';
  const codes = ['REP-IDSR-EMAIL', 'OPS-SMTP-DELIV'];
  const [result] = await pool.execute(
    `UPDATE dha_attestation_responses r
     INNER JOIN dha_evidence_items i ON i.itemId = r.itemId
     SET r.status = 'partial',
         r.notes = ?,
         r.attestedBy = COALESCE(?, r.attestedBy),
         r.attestedAt = NOW()
     WHERE i.isActive = 1 AND i.code IN (${codes.map(() => '?').join(',')})`,
    [note, userId, ...codes]
  );
  return { updated: result.affectedRows || 0, deliverable: true };
}

module.exports = { syncMessagingEvidenceNotes };
