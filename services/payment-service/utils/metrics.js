const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "careforall_payment_" });

const httpRequestDuration = new client.Histogram({
  name: "careforall_payment_http_request_duration_seconds",
  help: "HTTP request duration for payment service",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const paymentAttempts = new client.Counter({
  name: "careforall_payment_charge_total",
  help: "Total payment charge attempts",
  labelNames: ["status"],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const route = req.route?.path || req.path || "unknown";
  const end = httpRequestDuration.startTimer({ method: req.method, route });
  res.on("finish", () => {
    end({ status_code: res.statusCode });
  });
  next();
}

async function metricsHandler(req, res) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  paymentAttempts,
};
