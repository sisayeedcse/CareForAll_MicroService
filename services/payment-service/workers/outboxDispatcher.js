const axios = require("axios");
const { getPool } = require("../config/db");

const DISPATCH_URL = process.env.EVENT_DISPATCH_URL;
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 10);
const INTERVAL_MS = Number(process.env.OUTBOX_DISPATCH_INTERVAL_MS || 5000);
const MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES || 6);

async function fetchPending(pool) {
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

function backoffMinutes(attempts) {
  return Math.min(2 ** attempts, 30);
}

async function markFailed(pool, row, error) {
  const nextMinutes = backoffMinutes(row.attempts + 1);
  await pool.query(
    `UPDATE outbox_events
     SET attempts = attempts + 1,
         status = CASE WHEN attempts + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END,
         last_error = ?,
         next_attempt_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE id = ?`,
    [
      MAX_RETRIES,
      error?.message?.slice(0, 500) || "Dispatch error",
      nextMinutes,
      row.id,
    ]
  );
}

async function dispatch(row) {
  if (!DISPATCH_URL) {
    console.warn(
      "[payment-service] EVENT_DISPATCH_URL not configured; dispatcher idle."
    );
    return;
  }

  const pool = getPool();
  const payload = JSON.parse(row.payload_json);
  await axios.post(
    DISPATCH_URL,
    {
      eventId: row.event_key,
      eventType: row.event_type,
      payload,
      sourceService: "payment-service",
      occurredAt: row.created_at,
    },
    { timeout: Number(process.env.OUTBOX_HTTP_TIMEOUT_MS || 4000) }
  );
  await markDelivered(pool, row.id);
}

async function pump() {
  try {
    const pool = getPool();
    const pending = await fetchPending(pool);
    for (const row of pending) {
      try {
        await dispatch(row);
      } catch (error) {
        console.error(
          "[payment-service] Failed to dispatch event",
          row.event_key,
          error.message
        );
        await markFailed(pool, row, error);
      }
    }
  } catch (err) {
    console.error("[payment-service] Outbox pump error", err.message);
  }
}

function startOutboxDispatcher() {
  if (!DISPATCH_URL) {
    console.warn(
      "[payment-service] EVENT_DISPATCH_URL is not set. Outbox dispatcher disabled."
    );
    return;
  }

  setInterval(pump, INTERVAL_MS).unref();
  console.log("[payment-service] Outbox dispatcher started.");
}

module.exports = {
  startOutboxDispatcher,
};
