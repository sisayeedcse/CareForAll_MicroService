require("dotenv").config();
const express = require("express");
const { initDB } = require("./config/db");
const pledgeRoutes = require("./routes/pledgeRoutes");
const { startOutboxDispatcher } = require("./workers/outboxDispatcher");
const logger = require("./utils/logger");
const { metricsMiddleware, metricsHandler } = require("./utils/metrics");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(metricsMiddleware);
app.get("/metrics", metricsHandler);

// Initialize DB before starting server
initDB()
  .then(() => {
    app.use("/api/v1", pledgeRoutes);
    startOutboxDispatcher();

    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Pledge service running");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start pledge service due to DB error");
  });
