const express = require("express");
const { getPool } = require("../config/db");
const { canTransition } = require("../utils/stateMachine");
const { enqueueOutboxEvent } = require("../utils/outbox");
const idempotencyMiddleware = require("../middleware/idempotency");
const logger = require("../utils/logger");
const { pledgeCreations } = require("../utils/metrics");

const router = express.Router();

// Apply Middleware
router.use(idempotencyMiddleware);

// POST: Create a new Pledge
router.post("/pledges", async (req, res) => {
  const { user_id, campaign_id, amount } = req.body;
  const pool = getPool();

  // We need a specific connection for transactions, not just the pool
  const connection = await pool.getConnection();

  try {
    // 1. START TRANSACTION
    await connection.beginTransaction();

    // 2. Insert Pledge
    const [result] = await connection.query(
      `INSERT INTO pledges (user_id, campaign_id, amount, status) VALUES (?, ?, ?, 'PENDING')`,
      [user_id, campaign_id, amount]
    );

    const newPledgeId = result.insertId;

    // 3. Insert Outbox Event (Audit log/Event for other services)
    await enqueueOutboxEvent(connection, "PLEDGE_CREATED", {
      pledge_id: newPledgeId,
      campaign_id,
      user_id,
      amount,
      status: "PENDING",
      created_at: new Date().toISOString(),
    });

    // 4. COMMIT (Save everything permanently)
    await connection.commit();

    pledgeCreations.inc();
    res.status(201).json({
      success: true,
      id: newPledgeId,
      status: "PENDING",
      message: "Pledge created safely with Outbox pattern",
    });
  } catch (error) {
    // 5. ROLLBACK (If anything fails, undo EVERYTHING)
    try {
      await connection.rollback();
    } catch (rollbackError) {
      logger.error(
        { err: rollbackError },
        "Rollback failed after pledge create error"
      );
    }
    logger.error({ err: error }, "Pledge creation transaction failed");
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release(); // Always release connection back to pool
  }
});

// POST: Webhook from Payment Gateway
router.post("/webhooks/payment", async (req, res) => {
  const { pledge_id, status } = req.body;
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // 1. Check current status
    const [rows] = await connection.query(
      "SELECT status, amount, campaign_id, user_id FROM pledges WHERE id = ?",
      [pledge_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const currentStatus = rows[0].status;

    // 2. Validate State Transition
    if (!canTransition(currentStatus, status)) {
      logger.warn(
        { pledgeId: pledge_id, from: currentStatus, to: status },
        "Ignored invalid pledge transition"
      );
      return res
        .status(200)
        .json({ message: "Ignored: Invalid state transition" });
    }

    // 3. Start Transaction
    await connection.beginTransaction();

    // Update Pledge
    await connection.query("UPDATE pledges SET status = ? WHERE id = ?", [
      status,
      pledge_id,
    ]);

    // Insert Outbox Event
    await enqueueOutboxEvent(connection, "PLEDGE_STATUS_CHANGED", {
      pledge_id,
      campaign_id: rows[0].campaign_id,
      user_id: rows[0].user_id,
      amount: rows[0].amount,
      previous_status: currentStatus,
      new_status: status,
      updated_at: new Date().toISOString(),
    });

    // 4. Commit
    await connection.commit();

    res.status(200).json({ success: true });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      logger.error(
        { err: rollbackError },
        "Rollback failed after webhook error"
      );
    }
    logger.error(
      { err: error, pledgeId: pledge_id },
      "Webhook processing error"
    );
    res.status(500).json({ error: "Webhook processing failed" });
  } finally {
    connection.release();
  }
});

module.exports = router;
