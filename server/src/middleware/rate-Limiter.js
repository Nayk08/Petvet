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

// POST /login specifically needs a much tighter budget than the rest of
// /api/auth (session checks, logout) — this is the actual credential
// brute-force surface, and 100 guesses/15min per IP was realistically
// crackable against a weak password. 8 attempts is enough for a real user
// to mistype a password a couple of times without hitting it.
export const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: {
    message: "Too many login attempts. Please wait a few minutes and try again.",
  },
});

// Global ceiling for every /api route, mounted before the session store so a
// flood is rejected before it costs a Postgres query. 300/min undercounted
// real usage badly: React Router re-runs every ancestor loader (e.g.
// requireClientAuth's /me check) on EVERY navigation, and StrictMode
// double-invokes queries/effects in dev — so just signing in, browsing a
// few pages, and booking one appointment can legitimately fire well past
// 300 requests in a minute. This still blocks a genuine flood, just with
// real headroom for one actively-used session (several staff sharing one
// clinic IP, or a client portal session).
export const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 1000,
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
