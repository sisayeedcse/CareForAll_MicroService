const express = require('express');
const { getPool } = require('../config/db');
const { canTransition } = require('../utils/stateMachine');
const idempotencyMiddleware = require('../middleware/idempotency');

const router = express.Router();

// Apply Middleware
router.use(idempotencyMiddleware);

// POST: Create a new Pledge
router.post('/pledges', async (req, res) => {
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
    const payload = JSON.stringify({
        pledge_id: newPledgeId,
        campaign_id,
        amount,
        timestamp: new Date()
    });

    await connection.query(
      `INSERT INTO outbox_events (event_type, payload_json) VALUES (?, ?)`,
      ['PLEDGE_CREATED', payload]
    );

    // 4. COMMIT (Save everything permanently)
    await connection.commit();

    res.status(201).json({ 
        success: true, 
        id: newPledgeId, 
        status: 'PENDING',
        message: "Pledge created safely with Outbox pattern"
    });

  } catch (error) {
    // 5. ROLLBACK (If anything fails, undo EVERYTHING)
    await connection.rollback();
    console.error("Transaction Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release(); // Always release connection back to pool
  }
});

// POST: Webhook from Payment Gateway
router.post('/webhooks/payment', async (req, res) => {
    const { pledge_id, status } = req.body;
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        // 1. Check current status
        const [rows] = await connection.query('SELECT status FROM pledges WHERE id = ?', [pledge_id]);
        
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ error: "Pledge not found" });
        }

        const currentStatus = rows[0].status;

        // 2. Validate State Transition
        if (!canTransition(currentStatus, status)) {
            connection.release();
            console.log(`Ignored invalid transition ${currentStatus} -> ${status}`);
            return res.status(200).json({ message: "Ignored: Invalid state transition" });
        }

        // 3. Start Transaction
        await connection.beginTransaction();

        // Update Pledge
        await connection.query(
            'UPDATE pledges SET status = ? WHERE id = ?', 
            [status, pledge_id]
        );

        // Insert Outbox Event
        await connection.query(
            'INSERT INTO outbox_events (event_type, payload_json) VALUES (?, ?)',
            ['PLEDGE_UPDATED', JSON.stringify({ pledge_id, old_status: currentStatus, new_status: status })]
        );

        // 4. Commit
        await connection.commit();

        res.status(200).json({ success: true });

    } catch (error) {
        await connection.rollback();
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
    } finally {
        connection.release();
    }
});

module.exports = router;