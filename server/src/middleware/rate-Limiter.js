import rateLimit from "express-rate-limit";

// The client cancels in-flight requests via AbortController on every
// navigation/unmount (React Query does this constantly). When a request
// gets aborted mid-flight, its socket can be destroyed before
// express-rate-limit reads req.ip, and by default it THROWS
// (ERR_ERL_UNDEFINED_IP_ADDRESS) instead of skipping that request — with no
// process-level safety net that used to crash the entire server. Disabling
// just the ip validation lets it fall back gracefully instead of throwing;
// this is the documented fix for this exact "connection destroyed
// prematurely" case. Shared by every limiter below.
const baseOptions = {
  standardHeaders: true, // adds RateLimit-* headers
  legacyHeaders: false, // disables X-RateLimit-* headers
  validate: { ip: false },
};

const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many attempts, please try again later." },
});

// Global ceiling for every /api route, mounted before the session store so a
// flood is rejected before it costs a Postgres query. Set high enough for
// several staff sharing one clinic IP (a page load fires ~10 requests).
export const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 300,
  message: { message: "Too many requests, please slow down." },
});

// /api/csrf-token is public and writes a session row to Postgres on every
// call, so it needs its own tighter cap. The frontend fetches a token per
// mutating request, hence the headroom.
export const csrfLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: "Too many requests, please try again later." },
});

export default authLimiter;
