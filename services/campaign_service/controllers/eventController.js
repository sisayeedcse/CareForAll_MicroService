const { getPool } = require("../config/db");
const logger = require("../utils/logger");
const {
  ensureRollupRow,
  moveAcrossBuckets,
  recordDonationHistory,
  applyDelta,
  syncCampaignCurrentAmount,
  toDecimal,
} = require("../services/rollupService");

const SUPPORTED_EVENTS = new Set([
  "PLEDGE_CREATED",
  "PLEDGE_STATUS_CHANGED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
]);

function getTimestamp(preferred, fallback) {
  if (preferred) {
    return preferred;
  }
  if (fallback) {
    return fallback;
  }
  return new Date().toISOString();
}

async function handlePledgeCreated(connection, payload, occurredAt) {
  const {
    campaign_id,
    pledge_id,
    user_id,
    amount,
    status = "PENDING",
  } = payload;
  if (!campaign_id) {
    return;
  }

  await ensureRollupRow(connection, campaign_id);
  await applyDelta(connection, campaign_id, {
    pending_amount: toDecimal(amount),
    total_pledges: 1,
  });
  await recordDonationHistory(connection, {
    campaign_id,
    pledge_id,
    user_id,
    amount,
    status,
    source: "pledge-service",
    occurred_at: occurredAt,
    metadata: { eventType: "PLEDGE_CREATED" },
  });
}

async function handlePledgeStatusChanged(connection, payload, occurredAt) {
  const {
    campaign_id,
    pledge_id,
    user_id,
    amount,
    previous_status,
    new_status,
  } = payload;
  if (!campaign_id || !previous_status || !new_status) {
    return;
  }

  await ensureRollupRow(connection, campaign_id);
  await moveAcrossBuckets(
    connection,
    campaign_id,
    previous_status,
    new_status,
    amount
  );
  if (new_status === "CAPTURED") {
    await syncCampaignCurrentAmount(connection, campaign_id);
  }
  await recordDonationHistory(connection, {
    campaign_id,
    pledge_id,
    user_id,
    amount,
    status: new_status,
    source: "pledge-service",
    occurred_at: occurredAt,
    metadata: { eventType: "PLEDGE_STATUS_CHANGED", previous_status },
  });
}

async function handlePaymentCaptured(connection, payload, occurredAt) {
  const { campaign_id, pledge_id, payment_id, user_id, amount } = payload;
  if (!campaign_id) {
    return;
  }

  await ensureRollupRow(connection, campaign_id);
  await applyDelta(connection, campaign_id, { total_payments: 1 });
  await recordDonationHistory(connection, {
    campaign_id,
    pledge_id,
    payment_id,
    user_id,
    amount,
    status: "CAPTURED",
    source: "payment-service",
    occurred_at: occurredAt,
    metadata: { eventType: "PAYMENT_CAPTURED" },
  });
}

async function handlePaymentFailed(connection, payload, occurredAt) {
  const { campaign_id, pledge_id, payment_id, user_id, amount, error } =
    payload;
  if (!campaign_id) {
    return;
  }

  await ensureRollupRow(connection, campaign_id);
  await recordDonationHistory(connection, {
    campaign_id,
    pledge_id,
    payment_id,
    user_id,
    amount,
    status: "FAILED",
    source: "payment-service",
    occurred_at: occurredAt,
    metadata: { eventType: "PAYMENT_FAILED", error },
  });
  await applyDelta(connection, campaign_id, {
    failed_amount: toDecimal(amount || 0),
  });
}

const handlerMap = {
  PLEDGE_CREATED: handlePledgeCreated,
  PLEDGE_STATUS_CHANGED: handlePledgeStatusChanged,
  PAYMENT_CAPTURED: handlePaymentCaptured,
  PAYMENT_FAILED: handlePaymentFailed,
};

async function ingestEvent(req, res) {
  const {
    eventId,
    eventType,
    payload = {},
    sourceService = "unknown",
    occurredAt,
  } = req.body || {};

  if (!eventId || !eventType) {
    return res
      .status(400)
      .json({ message: "eventId and eventType are required" });
  }

  if (!SUPPORTED_EVENTS.has(eventType)) {
    return res
      .status(202)
      .json({ status: "ignored", reason: "unsupported event type" });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      "SELECT event_id FROM campaign_event_log WHERE event_id = ?",
      [eventId]
    );
    if (existing.length) {
      await connection.commit();
      return res.status(200).json({ status: "duplicate" });
    }

    await connection.query(
      `INSERT INTO campaign_event_log (event_id, event_type, source_service, payload_json)
       VALUES (?, ?, ?, ?)`,
      [eventId, eventType, sourceService, JSON.stringify(payload)]
    );

    const handler = handlerMap[eventType];
    if (handler) {
      await handler(
        connection,
        payload,
        getTimestamp(occurredAt, payload.updated_at || payload.created_at)
      );
    }

    await connection.commit();
    return res.status(202).json({ status: "processed" });
  } catch (error) {
    await connection.rollback();
    logger.error({ err: error, eventId }, "Failed to ingest campaign event");
    return res.status(500).json({ message: "Failed to ingest event" });
  } finally {
    connection.release();
  }
}

module.exports = {
  ingestEvent,
};
