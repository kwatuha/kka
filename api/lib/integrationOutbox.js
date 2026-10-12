const pool = require('../config/db');

/**
 * Enqueue an integration event (same DB connection preferred for transactional outbox).
 */
async function enqueueOutboxEvent(executor, { eventType, aggregateType, aggregateId, payload }) {
  const db = executor || pool;
  await db.execute(
    `INSERT INTO integration_outbox (eventType, aggregateType, aggregateId, payloadJson, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [
      eventType,
      aggregateType,
      String(aggregateId),
      JSON.stringify(payload || {}),
    ]
  );
}

module.exports = { enqueueOutboxEvent };
