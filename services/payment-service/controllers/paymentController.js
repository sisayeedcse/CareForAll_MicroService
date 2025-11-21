const Stripe = require("stripe");
const dotenv = require("dotenv");

const { getPool } = require("../config/db");
const { enqueueOutboxEvent } = require("../utils/outbox");
const logger = require("../utils/logger");
const { paymentAttempts } = require("../utils/metrics");

dotenv.config();

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildIdempotencyKey(userId, pledgeId, campaignId, amount) {
  const pledgeComponent = pledgeId ? `pledge-${pledgeId}` : "pledge-none";
  const campaignComponent = campaignId
    ? `campaign-${campaignId}`
    : "campaign-none";
  const amountComponent = `amount-${amount}`;
  return `payment-${userId}-${pledgeComponent}-${campaignComponent}-${amountComponent}`;
}

exports.chargePayment = async (req, res) => {
  const { amount, pledgeId = null, campaignId = null } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ message: "Missing authenticated user context" });
  }

  const numericAmount = Number(amount);
  if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res
      .status(400)
      .json({ message: "Amount must be a positive number" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res
      .status(500)
      .json({ message: "Stripe secret key is not configured" });
  }

  const pool = getPool();

  // If a payment already succeeded for this combination, reuse it to stay idempotent
  const [existing] = await pool.query(
    `SELECT id, status, transaction_id FROM payments
     WHERE user_id = ?
       AND (pledge_id <=> ?)
       AND (campaign_id <=> ?)
     ORDER BY id DESC
     LIMIT 1`,
    [userId, pledgeId, campaignId]
  );

  if (existing.length && existing[0].status === "SUCCESS") {
    return res.status(200).json({
      status: existing[0].status,
      transactionId: existing[0].transaction_id,
      paymentId: existing[0].id,
      message: "Payment already processed for this request",
    });
  }

  const [insertResult] = await pool.query(
    "INSERT INTO payments (pledge_id, campaign_id, user_id, amount, status) VALUES (?, ?, ?, ?, ?)",
    [pledgeId, campaignId, userId, numericAmount, "PENDING"]
  );

  const paymentId = insertResult.insertId;
  const idempotencyKey = buildIdempotencyKey(
    userId,
    pledgeId,
    campaignId,
    numericAmount
  );

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(numericAmount * 100),
        currency: "usd",
        payment_method: "pm_card_visa",
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          paymentId: paymentId.toString(),
          userId: userId.toString(),
          pledgeId: pledgeId ? pledgeId.toString() : "",
          campaignId: campaignId ? campaignId.toString() : "",
        },
      },
      { idempotencyKey }
    );

    await pool.query(
      "UPDATE payments SET status = ?, transaction_id = ? WHERE id = ?",
      ["SUCCESS", paymentIntent.id, paymentId]
    );

    await enqueueOutboxEvent(pool, "PAYMENT_CAPTURED", {
      payment_id: paymentId,
      transaction_id: paymentIntent.id,
      pledge_id: pledgeId,
      campaign_id: campaignId,
      user_id: userId,
      amount: numericAmount,
      status: "SUCCESS",
      processed_at: new Date().toISOString(),
    });
    paymentAttempts.inc({ status: "success" });

    return res.status(201).json({
      status: "SUCCESS",
      transactionId: paymentIntent.id,
      paymentId,
    });
  } catch (error) {
    logger.error({ err: error, paymentId }, "Stripe charge failed");

    await pool.query(
      "UPDATE payments SET status = ?, transaction_id = ? WHERE id = ?",
      ["FAILED", error?.payment_intent?.id || null, paymentId]
    );

    await enqueueOutboxEvent(pool, "PAYMENT_FAILED", {
      payment_id: paymentId,
      transaction_id: error?.payment_intent?.id || null,
      pledge_id: pledgeId,
      campaign_id: campaignId,
      user_id: userId,
      amount: numericAmount,
      status: "FAILED",
      error: error.message,
      processed_at: new Date().toISOString(),
    });

    paymentAttempts.inc({ status: "failed" });
    return res.status(502).json({
      status: "FAILED",
      paymentId,
      message: "Unable to process payment",
      error: error.message,
    });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured.");
    return res.status(500).json({ message: "Webhook secret not configured" });
  }

  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const paymentIntent = event.data.object;
  const paymentId = paymentIntent.metadata?.paymentId;
  const pool = getPool();

  if (!paymentId) {
    logger.warn("Received webhook without paymentId metadata.");
    return res.json({ received: true });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      await pool.query(
        "UPDATE payments SET status = ?, transaction_id = ? WHERE id = ?",
        ["SUCCESS", paymentIntent.id, paymentId]
      );

      await enqueueOutboxEvent(pool, "PAYMENT_CAPTURED", {
        payment_id: Number(paymentId),
        transaction_id: paymentIntent.id,
        pledge_id: toNumberOrNull(paymentIntent.metadata?.pledgeId),
        campaign_id: toNumberOrNull(paymentIntent.metadata?.campaignId),
        user_id: toNumberOrNull(paymentIntent.metadata?.userId),
        amount: Number(paymentIntent.amount ?? 0) / 100,
        status: "SUCCESS",
        processed_at: new Date().toISOString(),
      });
    } else if (event.type === "payment_intent.payment_failed") {
      await pool.query(
        "UPDATE payments SET status = ?, transaction_id = ? WHERE id = ?",
        ["FAILED", paymentIntent.id, paymentId]
      );

      await enqueueOutboxEvent(pool, "PAYMENT_FAILED", {
        payment_id: Number(paymentId),
        transaction_id: paymentIntent.id,
        pledge_id: toNumberOrNull(paymentIntent.metadata?.pledgeId),
        campaign_id: toNumberOrNull(paymentIntent.metadata?.campaignId),
        user_id: toNumberOrNull(paymentIntent.metadata?.userId),
        amount: Number(paymentIntent.amount ?? 0) / 100,
        status: "FAILED",
        error: event.data?.object?.last_payment_error?.message,
        processed_at: new Date().toISOString(),
      });
    }
  } catch (dbError) {
    logger.error({ err: dbError }, "Failed to update payment from webhook");
    return res.status(500).json({ message: "Failed to update payment status" });
  }

  return res.json({ received: true });
};
