const axios = require("axios");
const { getPool } = require("../config/db");

const DISPATCH_URL = process.env.EVENT_DISPATCH_URL;
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 10);
const INTERVAL_MS = Number(process.env.OUTBOX_DISPATCH_INTERVAL_MS || 5000);
const MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES || 6);

async function fetchPendingEvents(pool) {
  const [rows] = await pool.query(
    `SELECT *
     FROM outbox_events
     WHERE status IN ('PENDING','FAILED')
       AND next_attempt_at <= NOW()
     ORDER BY id ASC
     LIMIT ?`,
    [BATCH_SIZE]
  );
  return rows;
}

async function markDelivered(pool, id) {
  await pool.query(
    `UPDATE outbox_events
     SET status = 'DELIVERED', delivered_at = NOW(), last_error = NULL
     WHERE id = ?`,
    [id]
  );
}

function computeNextAttempt(attempts) {
  const base = Math.min(2 ** attempts, 30); // exponential backoff up to 30 minutes
  return `DATE_ADD(NOW(), INTERVAL ${base} MINUTE)`;
}

async function markFailed(pool, id, attempts, error) {
  const nextAttemptExpression = computeNextAttempt(attempts + 1);
  await pool.query(
    `UPDATE outbox_events
     SET status = CASE WHEN attempts + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END,
         attempts = attempts + 1,
         last_error = ?,
         next_attempt_at = ${nextAttemptExpression}
     WHERE id = ?`,
    [MAX_RETRIES, error?.message?.slice(0, 500) || "Unknown error", id]
  );
}

async function dispatchEvent(pool, eventRow) {
  if (!DISPATCH_URL) {
    console.warn(
      "[pledge-service] EVENT_DISPATCH_URL not configured; skipping dispatch"
    );
    return;
  }

  const payload = JSON.parse(eventRow.payload_json);
  await axios.post(
    DISPATCH_URL,
    {
      eventId: eventRow.event_key,
      eventType: eventRow.event_type,
      payload,
      sourceService: "pledge-service",
      occurredAt: eventRow.created_at,
    },
    { timeout: Number(process.env.OUTBOX_HTTP_TIMEOUT_MS || 4000) }
  );
  await markDelivered(pool, eventRow.id);
}

async function pumpOnce() {
  try {
    const pool = getPool();
    const events = await fetchPendingEvents(pool);
    if (!events.length) {
      return;
    }

    for (const eventRow of events) {
      try {
        await dispatchEvent(pool, eventRow);
      } catch (error) {
        console.error(
          "[pledge-service] Failed to dispatch event",
          eventRow.event_key,
          error.message
        );
        await markFailed(pool, eventRow.id, eventRow.attempts, error);
      }
    }
  } catch (err) {
    console.error("[pledge-service] Outbox pump error", err.message);
  }
}

function startOutboxDispatcher() {
  if (!DISPATCH_URL) {
    console.warn(
      "[pledge-service] EVENT_DISPATCH_URL is not set. Outbox dispatcher disabled."
    );
    return;
  }

  setInterval(pumpOnce, INTERVAL_MS).unref();
  console.log("[pledge-service] Outbox dispatcher started.");
}

module.exports = {
  startOutboxDispatcher,
};
