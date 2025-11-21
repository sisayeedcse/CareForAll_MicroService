const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { initDb } = require("./config/db");
const paymentRoutes = require("./routes/paymentRoutes");
const { handleStripeWebhook } = require("./controllers/paymentController");
const { startOutboxDispatcher } = require("./workers/outboxDispatcher");
const logger = require("./utils/logger");
const { metricsMiddleware, metricsHandler } = require("./utils/metrics");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(metricsMiddleware);
app.get("/metrics", metricsHandler);

// Stripe requires the raw body for webhook signature verification. Register before json parser.
app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());
app.use("/payments", paymentRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "payment-service" });
});

initDb()
  .then(() => {
    startOutboxDispatcher();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Payment service running");
    });
  })
  .catch((error) => {
    logger.error({ err: error }, "Failed to initialize database");
    process.exit(1);
  });
