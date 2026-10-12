/**
 * IDSR / public-health alert publisher (Phase 4 DHA).
 * Scans diagnosis / lab text against notifiable disease catalog.
 */
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('./integrationOutbox');

async function loadSettings(executor) {
  const db = executor || pool;
  try {
    const [rows] = await db.execute(
      `SELECT idsrMode, idsrBaseUrl FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveMode(settings) {
  const fromEnv = (process.env.IDSR_MODE || '').toLowerCase();
  if (['sandbox', 'live', 'disabled'].includes(fromEnv)) return fromEnv;
  return String(settings?.idsrMode || 'sandbox').toLowerCase();
}

async function loadCatalog(executor) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT diseaseCode, diseaseName, matchKeywords, urgency
     FROM idsr_disease_catalog WHERE isActive = 1`
  );
  return rows;
}

function matchDiseases(text, catalog) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return [];
  const hits = [];
  for (const row of catalog) {
    const parts = String(row.matchKeywords || '')
      .split('|')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    for (const part of parts) {
      try {
        const re = new RegExp(part, 'i');
        if (re.test(hay)) {
          hits.push(row);
          break;
        }
      } catch {
        if (hay.includes(part.replace(/\\b/g, ''))) {
          hits.push(row);
          break;
        }
      }
    }
  }
  return hits;
}

async function postLive(settings, alert) {
  const base = process.env.IDSR_BASE_URL || settings?.idsrBaseUrl || '';
  if (!base) throw new Error('IDSR_BASE_URL not configured for live mode');
  const url = new URL('alerts', base.endsWith('/') ? base : `${base}/`);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(process.env.IDSR_API_KEY ? { Authorization: `Bearer ${process.env.IDSR_API_KEY}` } : {}),
    },
    body: JSON.stringify(alert),
  });
  const body = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body: body.slice(0, 400) };
}

/**
 * Evaluate clinical text and create/publish IDSR alerts.
 */
async function evaluateAndPublish(executor, {
  text,
  patientId,
  sourceType,
  sourceId,
  facilityMflCode,
  facilityName,
  summary,
}) {
  const settings = await loadSettings(executor);
  const mode = resolveMode(settings);
  if (mode === 'disabled') return { skipped: true, mode, alerts: [] };

  const catalog = await loadCatalog(executor);
  const matches = matchDiseases(text, catalog);
  if (!matches.length) return { mode, alerts: [], matched: false };

  const db = executor || pool;
  const alerts = [];

  for (const disease of matches) {
    // De-dupe same source+disease within 24h
    const [existing] = await db.execute(
      `SELECT alertId FROM idsr_alerts
       WHERE sourceType = ? AND sourceId = ? AND diseaseCode = ?
         AND createdAt >= (NOW() - INTERVAL 1 DAY)
       LIMIT 1`,
      [sourceType, String(sourceId), disease.diseaseCode]
    );
    if (existing.length) continue;

    const payload = {
      diseaseCode: disease.diseaseCode,
      diseaseName: disease.diseaseName,
      urgency: disease.urgency,
      patientId: patientId || null,
      sourceType,
      sourceId: String(sourceId),
      facilityMflCode: facilityMflCode || null,
      facilityName: facilityName || null,
      summary: summary || `${disease.diseaseName} detected`,
      matchedText: String(text || '').slice(0, 1000),
      detectedAt: new Date().toISOString(),
    };

    let status = 'detected';
    if (mode === 'live') {
      try {
        const result = await postLive(settings, payload);
        status = result.ok ? 'published' : 'failed';
      } catch {
        status = 'failed';
      }
    } else {
      status = 'published';
    }

    const [ins] = await db.execute(
      `INSERT INTO idsr_alerts
        (diseaseCode, diseaseName, urgency, patientId, sourceType, sourceId,
         facilityMflCode, facilityName, summary, matchedText, mode, status, publishedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${status === 'published' ? 'NOW()' : 'NULL'})`,
      [
        disease.diseaseCode,
        disease.diseaseName,
        disease.urgency,
        patientId || null,
        sourceType,
        String(sourceId),
        facilityMflCode || null,
        facilityName || null,
        payload.summary,
        payload.matchedText,
        mode,
        status,
      ]
    );

    const alertId = ins.insertId;
    alerts.push({ alertId, ...payload, status, mode });

    try {
      const { notifyIdsrAlert } = require('./staffNotifications');
      await notifyIdsrAlert(db, {
        alertId,
        diseaseCode: disease.diseaseCode,
        diseaseName: disease.diseaseName,
        urgency: disease.urgency,
        summary: payload.summary,
      });
    } catch (notifyErr) {
      console.warn('[idsr] staff notification skipped:', notifyErr.message || notifyErr);
    }

    try {
      const { notifyIdsrAlertSms } = require('./idsrAlertSms');
      await notifyIdsrAlertSms({
        alertId,
        diseaseCode: disease.diseaseCode,
        diseaseName: disease.diseaseName,
        urgency: disease.urgency,
        summary: payload.summary,
      });
    } catch (smsErr) {
      console.warn('[idsr] facility SMS skipped:', smsErr.message || smsErr);
    }

    try {
      const { notifyIdsrAlertEmail } = require('./idsrAlertEmail');
      await notifyIdsrAlertEmail({
        alertId,
        diseaseCode: disease.diseaseCode,
        diseaseName: disease.diseaseName,
        urgency: disease.urgency,
        summary: payload.summary,
      });
    } catch (emailErr) {
      console.warn('[idsr] facility email skipped:', emailErr.message || emailErr);
    }

    try {
      await enqueueOutboxEvent(db, {
        eventType: 'idsr.alert',
        aggregateType: 'idsr_alert',
        aggregateId: alertId,
        payload: { alertId, ...payload, status, mode },
      });
    } catch (err) {
      console.warn('[idsr] outbox skipped:', err.message || err);
    }

    try {
      const { autoLinkIdsrAlert } = require('./ihrAutoLink');
      const ihrLink = await autoLinkIdsrAlert(db, alertId, disease.diseaseCode);
      if (ihrLink) {
        alerts[alerts.length - 1].ihrEventCode = ihrLink.eventCode;
        alerts[alerts.length - 1].ihrEventTitle = ihrLink.title;
      }
    } catch (ihrErr) {
      console.warn('[idsr] IHR auto-link skipped:', ihrErr.message || ihrErr);
    }
  }

  return { mode, matched: true, alerts };
}

module.exports = {
  loadSettings,
  resolveMode,
  evaluateAndPublish,
  matchDiseases,
  loadCatalog,
};
