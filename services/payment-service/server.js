const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { initDb } = require("./config/db");
const paymentRoutes = require("./routes/paymentRoutes");
const { handleStripeWebhook } = require("./controllers/paymentController");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());

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
    app.listen(PORT, () => {
      console.log(`Payment service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
