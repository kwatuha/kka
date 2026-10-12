/**
 * Auto-map IDSR alerts to IHR event catalog when idsrDiseaseCode matches.
 */
async function autoLinkIdsrAlert(db, alertId, diseaseCode) {
  const code = String(diseaseCode || '').trim();
  if (!alertId || !code) return null;

  const [events] = await db.execute(
    `SELECT eventCode, title FROM ihr_event_catalog
     WHERE active = 1 AND idsrDiseaseCode = ?
     ORDER BY sortOrder ASC LIMIT 1`,
    [code]
  );
  if (!events.length) return null;

  const eventCode = events[0].eventCode;
  await db.execute(
    `INSERT INTO ihr_idsr_links (idsrAlertId, eventCode, notes)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE notes = VALUES(notes), createdAt = CURRENT_TIMESTAMP`,
    [alertId, eventCode, 'Auto-linked from IDSR disease code']
  );
  return { eventCode, title: events[0].title };
}

module.exports = { autoLinkIdsrAlert };
