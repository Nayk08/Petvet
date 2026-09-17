import rateLimit from "express-rate-limit";
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true, // adds RateLimit-* headers
  legacyHeaders: false, // disables X-RateLimit-* headers
  message: { message: "Too many attempts, please try again later." },
  // The client cancels in-flight requests via AbortController on every
  // navigation/unmount (React Query does this constantly). When a request
  // to an /api/auth/* route gets aborted mid-flight, its socket can be
  // destroyed before express-rate-limit reads req.ip, and by default it
  // THROWS (ERR_ERL_UNDEFINED_IP_ADDRESS) instead of skipping that request
  // — with no process-level safety net that used to crash the entire
  // server. Disabling just the ip validation lets it fall back gracefully
  // instead of throwing; this is the documented fix for this exact
  // "connection destroyed prematurely" case.
  validate: { ip: false },
});
export default authLimiter;
