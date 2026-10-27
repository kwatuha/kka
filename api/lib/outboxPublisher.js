const amqp = require('amqplib');
const pool = require('../config/db');
const { notifyIntegrationFailure } = require('./integrationFailureAlert');

const EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'hmis.events';
const POLL_MS = Number(process.env.OUTBOX_POLL_MS || 5000);
const BATCH = Number(process.env.OUTBOX_BATCH_SIZE || 25);

let timer = null;
let publishing = false;

async function publishBatch() {
  if (publishing) return;
  publishing = true;
  const url = process.env.RABBITMQ_URL || '';
  try {
    const [rows] = await pool.execute(
      `SELECT outboxId, eventType, aggregateType, aggregateId, payloadJson, attempts
       FROM integration_outbox
       WHERE status = 'pending'
       ORDER BY outboxId ASC
       LIMIT ${BATCH}`
    );
    if (!rows.length) return;

    if (!url) {
      // No broker yet: leave pending (visible for ops), log once per batch
      console.log(`[outbox] ${rows.length} pending event(s); RABBITMQ_URL not set — waiting for broker`);
      return;
    }

    let conn;
    let ch;
    try {
      conn = await amqp.connect(url);
      ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

      for (const row of rows) {
        const routingKey = String(row.eventType || 'event').replace(/:/g, '.');
        const payload =
          typeof row.payloadJson === 'string' ? row.payloadJson : JSON.stringify(row.payloadJson || {});
        const ok = ch.publish(EXCHANGE, routingKey, Buffer.from(payload), {
          persistent: true,
          contentType: 'application/json',
          messageId: String(row.outboxId),
          type: row.eventType,
          headers: {
            aggregateType: row.aggregateType,
            aggregateId: String(row.aggregateId),
          },
        });
        if (ok) {
          await pool.execute(
            `UPDATE integration_outbox
             SET status = 'published', publishedAt = NOW(), attempts = attempts + 1, lastError = NULL
             WHERE outboxId = ?`,
            [row.outboxId]
          );
        } else {
          const errMsg = 'Channel buffer full';
          const [before] = await pool.execute(
            `SELECT status FROM integration_outbox WHERE outboxId = ? LIMIT 1`,
            [row.outboxId]
          );
          await pool.execute(
            `UPDATE integration_outbox
             SET attempts = attempts + 1, lastError = ?,
                 status = IF(attempts + 1 >= 10, 'failed', status)
             WHERE outboxId = ?`,
            [errMsg, row.outboxId]
          );
          const [after] = await pool.execute(
            `SELECT status, eventType, attempts FROM integration_outbox WHERE outboxId = ? LIMIT 1`,
            [row.outboxId]
          );
          const prevStatus = before[0]?.status;
          const next = after[0];
          if (next?.status === 'failed' && prevStatus !== 'failed') {
            void notifyIntegrationFailure({
              channel: 'outbox',
              referenceId: row.outboxId,
              summary: `Outbox event failed (${row.eventType || 'event'})`,
              detail: `${errMsg}; attempts ${next.attempts || '?'}`,
            }).catch((e) => console.warn('[outbox] failure alert:', e.message || e));
          }
        }
      }
    } finally {
      try {
        if (ch) await ch.close();
      } catch (_) {}
      try {
        if (conn) await conn.close();
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[outbox] publish cycle failed:', err.message || err);
  } finally {
    publishing = false;
  }
}

function startOutboxPublisher() {
  if (timer) return;
  console.log(
    `[outbox] publisher started (poll ${POLL_MS}ms, exchange=${EXCHANGE}, broker=${process.env.RABBITMQ_URL ? 'configured' : 'not set'})`
  );
  void publishBatch();
  timer = setInterval(() => void publishBatch(), POLL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

function stopOutboxPublisher() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startOutboxPublisher,
  stopOutboxPublisher,
  publishBatch,
};
