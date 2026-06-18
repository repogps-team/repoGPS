const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const eventsReceivedTotal = new client.Counter({
  name: "audit_events_received_total",
  help: "Total audit events received"
});

const eventsFailedTotal = new client.Counter({
  name: "audit_events_failed_total",
  help: "Total audit events that failed to store"
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(eventsReceivedTotal);
register.registerMetric(eventsFailedTotal);

function metricsMiddleware(req, res, next) {
  if (req.path === "/metrics") {
    return next();
  }
  const end = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    const route = req.route?.path || req.path || "unknown";
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}

async function metricsHandler(req, res) {
  res.set("Content-Type", register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
}

module.exports = {
  register,
  eventsReceivedTotal,
  eventsFailedTotal,
  metricsHandler,
  metricsMiddleware
};