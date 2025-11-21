const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const campaignRoutes = require("./routes/campaignRoutes");
const eventRoutes = require("./routes/eventRoutes");
const { initDb } = require("./config/db");
const logger = require("./utils/logger");
const { metricsMiddleware, metricsHandler } = require("./utils/metrics");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
app.get("/metrics", metricsHandler);
app.use("/campaigns/events", eventRoutes);
app.use("/campaigns", campaignRoutes);

const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Campaign service running");
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize database");
    process.exit(1);
  }
};

startServer();
