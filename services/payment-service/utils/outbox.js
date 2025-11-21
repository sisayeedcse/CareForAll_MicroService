const { v4: uuid } = require("uuid");

function withEventKey(payload = {}) {
  if (payload.eventKey) {
    return payload;
  }
  return { ...payload, eventKey: uuid() };
}

async function enqueueOutboxEvent(driver, eventType, payload) {
  const normalized = withEventKey(payload);
  const target =
    typeof driver.query === "function" ? driver : driver.connection;

  if (!target || typeof target.query !== "function") {
    throw new Error("enqueueOutboxEvent requires a MySQL connection/pool");
  }

  const serialized = JSON.stringify({ ...normalized, eventType });
  await target.query(
    `INSERT INTO outbox_events (event_key, event_type, payload_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), status = 'PENDING'`,
    [normalized.eventKey, eventType, serialized]
  );

  return normalized.eventKey;
}

module.exports = {
  enqueueOutboxEvent,
};
