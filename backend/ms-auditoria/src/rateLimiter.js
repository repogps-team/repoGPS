/**
 * Simple in-memory rate limiter.
 * Sliding window counter: 1000 events per minute per IP.
 */
const MAX_EVENTS_PER_MINUTE = 1000;
const WINDOW_MS = 60_000;

const clients = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  let record = clients.get(ip);
  if (!record) {
    record = { count: 0, windowStart: now };
    clients.set(ip, record);
  }

  if (now - record.windowStart > WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }

  record.count++;

  res.setHeader("X-RateLimit-Limit", MAX_EVENTS_PER_MINUTE);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_EVENTS_PER_MINUTE - record.count));

  if (record.count > MAX_EVENTS_PER_MINUTE) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  next();
}

module.exports = { rateLimiter };
